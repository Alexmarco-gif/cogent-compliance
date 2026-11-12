import { Logtail } from "@logtail/node";
import { randomUUID } from "crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  tenantId?: string;
  userId?: string;
  source?: string;
  [key: string]: unknown;
}

// Regex matching sensitive fields to redact automatically across all logs
const SENSITIVE_KEY_REGEX =
  /(secret|password|token|bearer|bvn|nin|cvv|api_?key|private_?key|card_?pan|account_?number)/i;

/**
 * Deeply redacts sensitive keys from objects and arrays to prevent
 * accidental PII or credential leakage in Better Stack logs.
 */
export function redactSensitiveData(data: unknown, depth = 0): unknown {
  if (depth > 6) return "[MAX_DEPTH_REACHED]";
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    // Redact Bearer tokens
    if (/^Bearer\s+[A-Za-z0-9\-._~+/]+=*$/i.test(data)) {
      return "Bearer [REDACTED]";
    }
    return data;
  }

  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        sanitized[key] = redactSensitiveData(val, depth + 1);
      } else {
        sanitized[key] = "[REDACTED]";
      }
    } else {
      sanitized[key] = redactSensitiveData(val, depth + 1);
    }
  }

  return sanitized;
}

/**
 * Resolves the Better Stack source-specific ingesting endpoint.
 * Accepts either a bare host (BETTERSTACK_INGESTING_HOST) or a full URL (BETTER_STACK_ENDPOINT).
 */
export function resolveBetterStackEndpoint(
  source: Record<string, string | undefined> = process.env,
): string | null {
  const host = source.BETTERSTACK_INGESTING_HOST?.trim();
  if (host) return host.startsWith("http") ? host : `https://${host}`;
  const legacy = source.BETTER_STACK_ENDPOINT?.trim();
  return legacy ? legacy : null;
}

class BetterStackLogger {
  private logtail: Logtail | null = null;
  private defaultContext: LogContext = {};

  constructor(defaultContext: LogContext = {}) {
    this.defaultContext = defaultContext;
    const token =
      process.env.BETTERSTACK_SOURCE_TOKEN || process.env.BETTER_STACK_LOGTAIL_SOURCE_TOKEN;
    const endpoint = resolveBetterStackEndpoint();

    // Better Stack only accepts logs on the source-specific ingesting host
    // (e.g. https://s1234567.us-west-2a.betterstackdata.com). Without it the
    // shared endpoint answers 401, so we refuse to start a silent no-op shipper.
    if (token && token.trim().length > 0 && endpoint) {
      try {
        const client = new Logtail(token, { endpoint });
        // Fail-safe wrapper around internal background sync so HTTP errors never crash the app,
        // but are surfaced on stderr (once per minute) instead of being swallowed.
        const internalClient = client as unknown as { _sync: (logs: unknown[]) => Promise<unknown[]> };
        if (typeof internalClient._sync === "function") {
          const originalSync = internalClient._sync.bind(internalClient);
          let lastWarnAt = 0;
          internalClient._sync = async (logs: unknown[]) => {
            try {
              return await originalSync(logs);
            } catch (err) {
              if (Date.now() - lastWarnAt > 60_000) {
                lastWarnAt = Date.now();
                console.warn("[Logger] Better Stack log shipping failed:", (err as Error).message);
              }
              return logs;
            }
          };
        }
        this.logtail = client;
      } catch (err) {
        console.warn("[Logger] Failed to initialize Logtail client:", err);
      }
    }
  }

  /**
   * Spawns a child logger with bound contextual metadata (e.g., requestId, tenantId)
   */
  public withContext(context: LogContext): BetterStackLogger {
    const child = new BetterStackLogger({
      ...this.defaultContext,
      ...context,
    });
    child.logtail = this.logtail;
    return child;
  }

  private write(level: LogLevel, message: string, extra?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const requestId =
      (extra?.requestId as string) ||
      this.defaultContext.requestId ||
      (typeof extra?.request_id === "string" ? extra.request_id : undefined) ||
      randomUUID();

    const mergedContext = {
      ...this.defaultContext,
      ...extra,
      requestId,
    };

    const redactedContext = redactSensitiveData(mergedContext) as Record<string, unknown>;

    const logEntry = {
      timestamp,
      level,
      message,
      context: redactedContext,
      service: "cogent-marketing-shield",
      environment: process.env.NODE_ENV || "development",
    };

    // 1. Output structured JSON to stdout/stderr (Standard for Vercel Log Drain)
    const jsonOutput = JSON.stringify(logEntry);
    if (level === "error") {
      console.error(jsonOutput);
    } else if (level === "warn") {
      console.warn(jsonOutput);
    } else {
      console.log(jsonOutput);
    }

    // 2. Direct dispatch to Better Stack Logs API if token is provided
    if (this.logtail) {
      try {
        if (level === "error") {
          this.logtail.error(message, redactedContext).catch(() => {});
        } else if (level === "warn") {
          this.logtail.warn(message, redactedContext).catch(() => {});
        } else if (level === "debug") {
          this.logtail.debug(message, redactedContext).catch(() => {});
        } else {
          this.logtail.info(message, redactedContext).catch(() => {});
        }
      } catch (err) {
        // Fail-safe: logging failure must never crash request execution
        console.error("[Logger] Error shipping log to Better Stack:", err);
      }
    }
  }

  public debug(message: string, extra?: Record<string, unknown>): void {
    this.write("debug", message, extra);
  }

  public info(message: string, extra?: Record<string, unknown>): void {
    this.write("info", message, extra);
  }

  public warn(message: string, extra?: Record<string, unknown>): void {
    this.write("warn", message, extra);
  }

  public error(message: string, extra?: Record<string, unknown>): void {
    this.write("error", message, extra);
  }

  /**
   * Flushes any buffered logs in serverless / edge environments
   */
  public async flush(): Promise<void> {
    if (this.logtail) {
      try {
        await this.logtail.flush();
      } catch (err) {
        console.error("[Logger] Error flushing Better Stack logs:", err);
      }
    }
  }
}

export const logger = new BetterStackLogger();

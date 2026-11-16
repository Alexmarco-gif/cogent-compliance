/**
 * Cogent Marketing Shield - Upload MIME Type Normalizer
 */

export type SupportedUploadMimeType =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function resolveUploadMimeType(file: {
  name: string;
  type?: string;
}): SupportedUploadMimeType {
  const normalizedType = (file.type || "").toLowerCase().trim();
  if (
    normalizedType === "image/jpg" ||
    normalizedType === "image/pjpeg" ||
    normalizedType === "image/jpeg"
  ) {
    return "image/jpeg";
  }
  if (normalizedType === "image/png" || normalizedType === "image/x-png") {
    return "image/png";
  }
  if (normalizedType === "image/webp") {
    return "image/webp";
  }
  if (normalizedType === "application/pdf") {
    return "application/pdf";
  }
  if (
    normalizedType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  const lowerName = (file.name || "").toLowerCase();
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lowerName.endsWith(".png")) {
    return "image/png";
  }
  if (lowerName.endsWith(".webp")) {
    return "image/webp";
  }
  if (lowerName.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "application/pdf";
}

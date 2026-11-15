import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { ShieldCheck } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-4">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary text-white shadow-sm">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-bold tracking-tight text-slate-900">
          Cogent Marketing Shield
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Sign in to continue to institutional onboarding and your Compliance Copilot
        </p>
      </div>

      <div className="w-full max-w-md flex flex-col items-center">
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/"
        />
        <p className="mt-4 text-xs text-slate-500">
          New institution?{" "}
          <Link href="/sign-up" className="font-semibold text-brand-primary hover:underline">
            Create an account →
          </Link>
        </p>
      </div>
    </div>
  );
}

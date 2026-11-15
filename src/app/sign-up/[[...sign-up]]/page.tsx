import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { ShieldCheck } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-4">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary text-white shadow-sm">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-bold tracking-tight text-slate-900">
          Create Your Cogent Workspace
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Step 1: Register your compliance account, then complete 60-second institutional onboarding
        </p>
      </div>

      <div className="w-full max-w-md flex flex-col items-center">
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/onboarding"
        />
        <p className="mt-4 text-xs text-slate-500">
          Already have an institutional workspace?{" "}
          <Link href="/sign-in" className="font-semibold text-brand-primary hover:underline">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { AuthSplitLayout, clerkAuthAppearance } from "@/components/auth/AuthSplitLayout";

export const metadata: Metadata = {
  title: "Sign in",
  robots: {
    index: false,
    follow: true,
  },
};

export default function SignInPage() {
  return (
    <AuthSplitLayout mode="sign-in">
      <SignIn
        appearance={clerkAuthAppearance}
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/chat"
      />
    </AuthSplitLayout>
  );
}

import { SignUp } from "@clerk/nextjs";
import { AuthSplitLayout, clerkAuthAppearance } from "@/components/auth/AuthSplitLayout";

export default function SignUpPage() {
  return (
    <AuthSplitLayout mode="sign-up">
      <SignUp
        appearance={clerkAuthAppearance}
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/onboarding"
      />
    </AuthSplitLayout>
  );
}

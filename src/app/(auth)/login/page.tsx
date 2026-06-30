import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white px-4 py-8">
          <p className="text-sm text-zinc-600">Loading...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

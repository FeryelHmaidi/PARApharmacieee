import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center lg:grid lg:grid-cols-2">
      <div className="flex w-full flex-col items-center justify-center gap-4 p-4 md:p-10">
        <div className="flex w-full items-center justify-center">
          <div className="w-full max-w-sm flex justify-center">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block h-full">
        <img
          src="/placeholder.webp"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}

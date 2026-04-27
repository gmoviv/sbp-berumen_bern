"use client";

import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

function LoginPageContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const error = submitError ?? (errorParam ? t("auth.login.error_invalid_credentials") : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      const isTwoFactorRequired =
        (result.error === "CredentialsSignin" && result.code === "2fa_required") ||
        // Backward-compatible fallback for older generic throws.
        result.error === "Configuration";

      if (isTwoFactorRequired) {
        router.push(`/login/2fa?email=${encodeURIComponent(email)}`);
      } else {
        setSubmitError(t("auth.login.error_try_again"));
      }
    } else {
      const session = await getSession();
      const needs2FASetup = !session?.user?.two_factor_enabled;
      router.push(needs2FASetup ? "/profile" : "/");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="px-8 py-6 mt-4 text-left bg-gray-800 shadow-lg rounded-lg">
        <h3 className="text-2xl font-bold text-center text-white">{t("auth.login.title")}</h3>
        {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mt-4">
            <div>
              <label className="block text-white" htmlFor="email">{t("auth.login.email_label")}</label>
              <input
                type="email"
                placeholder={t("auth.login.placeholder_email")}
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 bg-gray-700 text-white border-gray-600"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mt-4">
              <label className="block text-white" htmlFor="password">{t("auth.login.password_label")}</label>
              <input
                type="password"
                placeholder={t("auth.login.placeholder_password")}
                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 bg-gray-700 text-white border-gray-600"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-baseline justify-between">
              <button
                type="submit"
                className="px-6 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-900 focus:outline-none"
              >
                {t("auth.login.button_submit")}
              </button>
              <p className="text-sm text-gray-300">{t("auth.login.need_account_admin")}</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useI18n();
  return (
    <Suspense fallback={<div>{t("auth.login.loading")}</div>}>
      <LoginPageContent />
    </Suspense>
  );
}

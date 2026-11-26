"use client";

import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  LoginFormData,
  loginSchema,
  VerifyEmailFormData,
  verifyEmailSchema,
} from "@/lib/validation";

import {
  loginUser,
  resendVerification,
  verifyEmail,
  verifyLoginOtp,
  resendLoginOtp,
} from "@/service/auth.service";

import { OAuthLoginButtons } from "@/components/form/oauth-login-buttons";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

const inputClass =
  "h-9 w-full rounded-lg border border-white/10 bg-white/[0.045] pl-10 pr-3 text-[13px] text-white shadow-none placeholder:text-white/30 transition-all focus-visible:border-blue-400/60 focus-visible:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-blue-500/20";

const iconClass =
  "absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/35";

export default function LoginForm() {
  const router = useRouter();

  const [step, setStep] = useState<"login" | "verify" | "admin-otp">("login");

  const [email, setEmail] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [adminOtp, setAdminOtp] = useState("");

  const [showOtp, setShowOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const verifyForm = useForm<VerifyEmailFormData>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: "",
      otp: "",
    },
  });

  // =========================
  // LOGIN
  // =========================

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loginUser(data);

      if (!result.ok) {
        const message = result.data?.message || "Login failed";
        const normalized = message.toLowerCase();

        if (normalized.includes("verify") && normalized.includes("email")) {
          setEmail(data.email);
          toast.error("Your email is not verified.");
          return;
        }

        setError(message);
        toast.error(message);
        return;
      }

      if (result.data?.requiresOtp && result.data?.challengeToken) {
        setChallengeToken(result.data.challengeToken);
        setAdminOtp("");
        setStep("admin-otp");

        toast.success("A login code has been sent to your email.");

        return;
      }

      toast.success("Login successful");

      const role = result.data?.user?.role;

      const requestedPath = new URLSearchParams(window.location.search).get(
        "next",
      );

      const safeNextPath =
        requestedPath &&
        requestedPath.startsWith("/") &&
        !requestedPath.startsWith("//") &&
        !requestedPath.startsWith("/admin")
          ? requestedPath
          : null;

      setTimeout(() => {
        if (role === "ADMIN" || role === "SUPER_ADMIN") {
          router.replace("/admin");
        } else {
          router.replace(safeNextPath ?? "/");
        }

        router.refresh();
      }, 1200);
    } catch {
      setError("Something went wrong.");
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // ADMIN OTP
  // =========================

  const handleAdminOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!challengeToken || !/^\d{6}$/.test(adminOtp)) {
      toast.error("Enter the 6-digit login code.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await verifyLoginOtp(challengeToken, adminOtp);

      if (!result.ok) {
        toast.error(result.data?.message || "Could not verify login code.");
        return;
      }

      toast.success("Admin login successful");

      router.replace("/admin");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendAdminOtp = async () => {
    if (!challengeToken) return;

    setIsLoading(true);

    try {
      const result = await resendLoginOtp(challengeToken);

      if (!result?.success) {
        toast.error(result?.message || "Could not resend login code.");
        return;
      }

      setAdminOtp("");
      toast.success("A new login code has been sent.");
    } catch {
      toast.error("Could not resend login code.");
    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // EMAIL VERIFICATION
  // =========================

  const handleOpenVerify = () => {
    const loginEmail = loginForm.getValues("email");

    if (!loginEmail) {
      toast.error("Please enter your email address first.");
      return;
    }

    setEmail(loginEmail);

    verifyForm.reset({
      email: loginEmail,
      otp: "",
    });

    setShowOtp(false);
    setError(null);
    setStep("verify");
  };

  const handleSendVerificationCode = async () => {
    if (!email) {
      toast.error("Email address is required.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await resendVerification(email);

      if (!result?.success) {
        toast.error(result?.message || "Failed to send verification code.");
        return;
      }

      toast.success("Verification code sent.");

      setShowOtp(true);
      verifyForm.setValue("otp", "");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (data: VerifyEmailFormData) => {
    setIsLoading(true);

    try {
      const result = await verifyEmail({
        email: data.email,
        otp: data.otp,
      });

      if (!result?.success) {
        toast.error(result?.message || "Verification failed.");
        return;
      }

      toast.success("Email verified! Please login.");

      setStep("login");
      setShowOtp(false);
      setError(null);

      loginForm.setValue("email", data.email);
      loginForm.setValue("password", "");

      verifyForm.reset({
        email: data.email,
        otp: "",
      });
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;

    setIsLoading(true);

    try {
      const result = await resendVerification(email);

      if (result?.success) {
        toast.success("New verification code sent!");
        verifyForm.setValue("otp", "");
      } else {
        toast.error(result?.message || "Failed to resend verification code.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setStep("login");
    setShowOtp(false);
    setError(null);

    verifyForm.reset({
      email,
      otp: "",
    });

    loginForm.setValue("email", email);
  };

  // =========================
  // UI
  // =========================

  return (
    <div className="relative w-full">
      {/* Heading */}
      <div className="mb-3">
        <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-300 shadow-lg shadow-blue-500/10">
          {step === "login" ? (
            <LockKeyhole className="h-4 w-4" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
        </div>

        <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.25em] text-blue-300">
          {step === "login" ? "ACCOUNT ACCESS" : "SECURE VERIFICATION"}
        </p>

        <h2 className="text-xl font-semibold tracking-tight text-white">
          {step === "login"
            ? "Welcome back."
            : step === "admin-otp"
              ? "Verify your login."
              : "Verify your email."}
        </h2>

        <p className="mt-0.5 text-[11px] leading-4 text-white/45">
          {step === "login"
            ? "Sign in to continue your shopping experience."
            : step === "admin-otp"
              ? "Enter the 6-digit code sent to your admin email."
              : showOtp
                ? `Enter the verification code sent to ${email}.`
                : "Your email address needs verification."}
        </p>
      </div>

      {/* LOGIN FORM */}
      {step === "login" && (
        <Form {...loginForm}>
          <form
            onSubmit={loginForm.handleSubmit(handleLogin)}
            className="space-y-2"
          >
            {error && (
              <div className="rounded-lg border border-red-400/20 bg-red-500/10 p-2.5 text-xs text-red-300">
                {error}
              </div>
            )}

            {/* Email */}
            <FormField
              control={loginForm.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-0.5">
                  <label className="text-[11px] font-medium text-white/70">
                    Email Address
                  </label>

                  <FormControl>
                    <div className="relative">
                      <Mail className={iconClass} />

                      <Input
                        {...field}
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        className={inputClass}
                      />
                    </div>
                  </FormControl>

                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <label className="text-[11px] font-medium text-white/70">
                    Password
                  </label>

                  <FormControl>
                    <div className="relative">
                      <LockKeyhole className={iconClass} />

                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className={`${inputClass} pr-12`}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </FormControl>

                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />

            {/* Forgot Password */}
            <div className="flex justify-end -mt-1">
              <Link
                href="/forgot-password"
                className="text-[11px] font-medium text-blue-300 transition hover:text-blue-200"
              >
                Forgot password?
              </Link>
            </div>

            {/* Verify Email */}
            {email && (
              <button
                type="button"
                onClick={handleOpenVerify}
                disabled={isLoading}
                className="w-full rounded-lg border border-blue-400/20 bg-blue-500/10 p-2.5 text-xs font-medium text-blue-300 transition hover:bg-blue-500/20 disabled:opacity-50"
              >
                Your email is not verified? Verify Email First
              </button>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="group h-9 w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/30 active:scale-[0.98]"
            >
              {isLoading ? (
                "Signing in..."
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>
        </Form>
      )}

      {/* ADMIN OTP */}
      {step === "admin-otp" && (
        <form onSubmit={handleAdminOtp} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70">
              6-Digit Login Code
            </label>

            <Input
              value={adminOtp}
              onChange={(event) =>
                setAdminOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className={`${inputClass} text-center text-xl tracking-[0.5em]`}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || adminOtp.length !== 6}
            className="h-10 w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold text-white"
          >
            {isLoading ? "Verifying..." : "Verify & Login"}
          </Button>

          <button
            type="button"
            onClick={handleResendAdminOtp}
            disabled={isLoading}
            className="w-full text-xs text-blue-300 hover:text-blue-200 disabled:opacity-50"
          >
            Resend login code
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("login");
              setChallengeToken("");
              setAdminOtp("");
            }}
            disabled={isLoading}
            className="w-full text-xs text-white/45 hover:text-white"
          >
            Back to Login
          </button>
        </form>
      )}

      {/* EMAIL VERIFICATION */}
      {step === "verify" && (
        <Form {...verifyForm}>
          <form
            onSubmit={verifyForm.handleSubmit(handleVerify)}
            className="space-y-3"
          >
            <FormField
              control={verifyForm.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <label className="text-xs font-medium text-white/70">
                    Email Address
                  </label>

                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      readOnly
                      className={inputClass}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            {!showOtp ? (
              <Button
                type="button"
                onClick={handleSendVerificationCode}
                disabled={isLoading}
                className="h-10 w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold text-white"
              >
                {isLoading ? "Sending Code..." : "Send Verification Code"}
              </Button>
            ) : (
              <>
                <FormField
                  control={verifyForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <label className="text-xs font-medium text-white/70">
                        Verification Code
                      </label>

                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          autoComplete="one-time-code"
                          placeholder="000000"
                          className={`${inputClass} text-center text-xl tracking-[0.5em]`}
                        />
                      </FormControl>

                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-10 w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold text-white"
                >
                  {isLoading ? "Verifying..." : "Verify Email"}
                </Button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isLoading}
                  className="w-full text-xs text-blue-300 hover:text-blue-200 disabled:opacity-50"
                >
                  Didn't receive the code? Resend
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleBackToLogin}
              disabled={isLoading}
              className="w-full text-xs text-white/45 transition hover:text-white"
            >
              Back to Login
            </button>
          </form>
        </Form>
      )}

      {/* OAuth */}
      {step === "login" && (
        <div className="mt-2">
          <OAuthLoginButtons />
        </div>
      )}

      {/* Register Link */}
      {step === "login" && (
        <div className="mt-3 border-t border-white/10 pt-2.5 text-center">
          <p className="text-[11px] text-white/45">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-blue-300 transition hover:text-blue-200"
            >
              Create Account
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  Eye,
  EyeOff,
  UserRound,
  Mail,
  LockKeyhole,
  ShieldCheck,
  ArrowRight,
  KeyRound,
} from "lucide-react";

import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  registerSchema,
  verifyEmailSchema,
  RegisterFormData,
  VerifyEmailFormData,
} from "@/lib/validation";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

import Turnstile from "@/lib/turnstile";
import { OAuthLoginButtons } from "@/components/form/oauth-login-buttons";

import {
  registerUser,
  resendVerification,
  verifyEmail,
} from "@/service/auth.service";

const inputClass =
  "h-10 w-full rounded-lg border border-white/10 bg-white/[0.045] pl-11 pr-4 text-sm text-white shadow-none placeholder:text-white/30 transition-all focus-visible:border-blue-400/60 focus-visible:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-blue-500/20";

const iconClass =
  "absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/35";

export default function RegisterForm() {
  const router = useRouter();

  const [step, setStep] = useState<"register" | "verify">("register");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [turnstileToken, setTurnstileToken] = useState("");

  // Register form
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Email verification form
  const verifyForm = useForm<VerifyEmailFormData>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: "",
      otp: "",
    },
  });

  // Register
  const handleRegister = async (data: RegisterFormData) => {
    if (!turnstileToken) {
      toast.error("Please complete the security verification.");
      return;
    }

    setIsLoading(true);

    try {
      const { confirmPassword, ...rest } = data;

      const result = await registerUser({
        ...rest,
        turnstileToken,
      });

      if (!result.ok) {
        toast.error(result.data?.message || "Registration failed.");

        setTurnstileToken("");
        window.turnstile?.reset();

        return;
      }

      toast.success("Verification code sent to your email!");

      setEmail(data.email);

      verifyForm.setValue("email", data.email);
      verifyForm.setValue("otp", "");

      setStep("verify");
      setTurnstileToken("");
    } catch {
      setTurnstileToken("");
      window.turnstile?.reset();

      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  // Verify email
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
      router.push("/login");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (!email) return;

    setIsLoading(true);

    try {
      const result = await resendVerification(email);

      if (result?.success) {
        toast.success("New verification code sent!");
        verifyForm.setValue("otp", "");
      } else {
        toast.error(result?.message || "Failed to resend code.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full">
      {/* Heading */}
      <div className="mb-4">
        <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-300 shadow-lg shadow-blue-500/10">
          {step === "register" ? (
            <UserRound className="h-5 w-5" />
          ) : (
            <ShieldCheck className="h-5 w-5" />
          )}
        </div>

        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-blue-300">
          {step === "register" ? "CREATE YOUR ACCOUNT" : "SECURE VERIFICATION"}
        </p>

        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {step === "register" ? "Create account." : "Verify your email."}
        </h2>

        <p className="mt-1.5 text-xs leading-5 text-white/45 sm:text-sm">
          {step === "register"
            ? "Join us and discover a better shopping experience."
            : `Enter the 6-digit verification code sent to ${email}.`}
        </p>
      </div>

      {/* REGISTER FORM */}
      {step === "register" && (
        <Form {...registerForm}>
          <form
            onSubmit={registerForm.handleSubmit(handleRegister)}
            className="space-y-2.5"
          >
            {/* Name + Email */}
            <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
              {/* Full Name */}
              <FormField
                control={registerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <label className="text-xs font-medium text-white/70">
                      Full Name
                    </label>

                    <FormControl>
                      <div className="relative">
                        <UserRound className={iconClass} />

                        <Input
                          {...field}
                          placeholder="Enter your full name"
                          autoComplete="name"
                          className={inputClass}
                        />
                      </div>
                    </FormControl>

                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={registerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <label className="text-xs font-medium text-white/70">
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
            </div>

            {/* Password + Confirm Password */}
            <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
              {/* Password */}
              <FormField
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <label className="text-xs font-medium text-white/70">
                      Password
                    </label>

                    <FormControl>
                      <div className="relative">
                        <LockKeyhole className={iconClass} />

                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          autoComplete="new-password"
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
                            <EyeOff size={17} />
                          ) : (
                            <Eye size={17} />
                          )}
                        </button>
                      </div>
                    </FormControl>

                    <p className="ml-1 text-[9px] leading-3 text-white/35">
                      Minimum 8 characters.
                    </p>

                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              {/* Confirm Password */}
              <FormField
                control={registerForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <label className="text-xs font-medium text-white/70">
                      Confirm Password
                    </label>

                    <FormControl>
                      <div className="relative">
                        <LockKeyhole className={iconClass} />

                        <Input
                          {...field}
                          type={showConfirm ? "text" : "password"}
                          placeholder="Confirm your password"
                          autoComplete="new-password"
                          className={`${inputClass} pr-12`}
                        />

                        <button
                          type="button"
                          onClick={() => setShowConfirm((prev) => !prev)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white"
                          aria-label={
                            showConfirm
                              ? "Hide confirm password"
                              : "Show confirm password"
                          }
                        >
                          {showConfirm ? (
                            <EyeOff size={17} />
                          ) : (
                            <Eye size={17} />
                          )}
                        </button>
                      </div>
                    </FormControl>

                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            {/* Cloudflare Turnstile */}
            <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] p-2">
              <p className="mb-1.5 flex items-center gap-2 text-[10px] font-medium text-white/50">
                <ShieldCheck className="h-4 w-4 text-blue-300" />
                Security Verification
              </p>

              <Turnstile
                onVerify={setTurnstileToken}
                onExpire={() => setTurnstileToken("")}
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading || !turnstileToken}
              className="group h-10 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/30 active:scale-[0.98]"
            >
              {isLoading ? (
                "Creating Account..."
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>
        </Form>
      )}

      {/* Social Login */}
      {step === "register" && <OAuthLoginButtons />}

      {/* EMAIL VERIFICATION */}
      {step === "verify" && (
        <Form {...verifyForm}>
          <form
            onSubmit={verifyForm.handleSubmit(handleVerify)}
            className="space-y-3"
          >
            <div className="rounded-xl border border-blue-400/15 bg-blue-500/[0.07] p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                  <Mail className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-white/45">
                    Verification email sent to
                  </p>

                  <p className="truncate text-sm font-medium text-white">
                    {email}
                  </p>
                </div>
              </div>
            </div>

            <FormField
              control={verifyForm.control}
              name="otp"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <label className="text-xs font-medium text-white/70">
                    6-Digit Verification Code
                  </label>

                  <FormControl>
                    <div className="relative">
                      <KeyRound className={iconClass} />

                      <Input
                        {...field}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="one-time-code"
                        placeholder="000000"
                        className={`${inputClass} text-center text-xl tracking-[0.5em]`}
                      />
                    </div>
                  </FormControl>

                  <FormMessage className="text-xs text-red-400" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="h-10 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold text-white"
            >
              {isLoading ? "Verifying..." : "Verify Email"}
            </Button>

            <button
              type="button"
              onClick={handleResend}
              disabled={isLoading}
              className="w-full text-xs text-blue-300 transition hover:text-blue-200 disabled:opacity-50"
            >
              Didn't receive the code? Resend
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("register");
                verifyForm.reset();
                registerForm.reset();
                setEmail("");
              }}
              disabled={isLoading}
              className="w-full text-xs text-white/40 transition hover:text-white"
            >
              Wrong email? Go back
            </button>
          </form>
        </Form>
      )}

      {/* Login Link */}
      {step === "register" && (
        <div className="mt-3 border-t border-white/10 pt-3 text-center">
          <p className="text-xs text-white/45">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-300 transition hover:text-blue-200"
            >
              Sign In
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

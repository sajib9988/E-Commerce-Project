
import AuthShell from "@/components/auth/auth-shell";
import RegisterForm from "@/components/form/registerForm";

export default function RegisterPage() {
  return (
    <AuthShell variant="register">
      <RegisterForm />
    </AuthShell>
  );
}


import AuthShell from "@/components/auth/auth-shell";
import LoginForm from "@/components/form/loginForm";

export default function LoginPage() {
  return (
    <AuthShell variant="login">
      <LoginForm />
    </AuthShell>
  );
  
}

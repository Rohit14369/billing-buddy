import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, UserPlus, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading) return;

    if (!email || !password) {
      setError("Email and password required");
      return;
    }
    if (isRegister && !name) {
      setError("All fields are required");
      return;
    }

    setAuthLoading(true);
    setError("");

    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-3">
          <div className="mx-auto w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/30 shadow-xl">
            <img
              src="/logo.jpeg"
              alt="Sadik Traders"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Sadik Traders</h1>
          <p className="text-sm text-muted-foreground">
            Wholesale & Retail — Dry Fruits & Spices
          </p>
          <p className="text-xs italic text-muted-foreground">Since 1989</p>
        </div>

        <div className="p-6 space-y-5 bg-card rounded-xl shadow-lg border border-border">
          <h2 className="text-xl font-semibold text-center" style={{ fontFamily: 'var(--font-display)' }}>
            {isRegister ? "Create Account" : "Welcome Back"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="input-focus"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input-focus"
              />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 input-focus"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
                {error}
              </p>
            )}

            <Button type="submit" disabled={authLoading} className="w-full gap-2">
              {authLoading
                ? "Please wait..."
                : isRegister
                ? (<><UserPlus size={18} /> Register</>)
                : (<><LogIn size={18} /> Login</>)
              }
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="text-sm text-primary hover:underline"
            >
              {isRegister ? "Already have an account? Login" : "Don't have an account? Register"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

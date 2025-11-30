"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message || "Login failed");
        setLoading(false);
        return;
      }

      // Check if user has admin access
      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("id, role, created_at")
        .eq("user_id", data.user?.id)
        .single();

      if (adminError || !adminData) {
        setErrorMsg("You don't have admin access. Please sign up with a @ments.app email.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Check if this is a first-time login (created within last 5 minutes means new admin)
      const createdAt = new Date(adminData.created_at);
      const now = new Date();
      const isNewAdmin = (now.getTime() - createdAt.getTime()) < 5 * 60 * 1000;

      // Or alternatively, check localStorage for first login
      const hasSeenWelcome = localStorage.getItem(`admin_welcome_${data.user?.id}`);

      if (!hasSeenWelcome) {
        setShowCongrats(true);
        localStorage.setItem(`admin_welcome_${data.user?.id}`, "true");
        
        // Auto-redirect after showing congrats
        setTimeout(() => {
          router.push("/admin/dashboard");
        }, 3000);
      } else {
        router.push("/admin/dashboard");
      }

      setLoading(false);
    } catch (err: any) {
      console.error("Login exception:", err);
      setErrorMsg(err?.message || "Something went wrong");
      setLoading(false);
    }
  };

  // Congratulations modal/screen
  if (showCongrats) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center space-y-6 p-8 bg-white rounded-2xl shadow-xl max-w-md mx-4 animate-fade-in">
          <div className="text-6xl animate-bounce">🎉</div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-800">
              Congratulations!
            </h1>
            <p className="text-lg text-emerald-600 font-semibold">
              You are now an Admin
            </p>
          </div>
          
          <p className="text-gray-600">
            Your email has been verified and you have full admin access to the dashboard.
          </p>
          
          <div className="pt-4">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Redirecting to dashboard...
            </div>
          </div>
          
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Go to Dashboard Now
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm space-y-4 border p-6 rounded-lg"
      >
        <h1 className="text-xl font-semibold text-center">Admin Login</h1>

        {errorMsg && (
          <p className="text-sm text-red-500 text-center">{errorMsg}</p>
        )}

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            className="w-full border rounded px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md text-sm font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <a href="/admin/signup" className="underline hover:text-black">
            Sign Up
          </a>
        </p>
      </form>
    </main>
  );
}
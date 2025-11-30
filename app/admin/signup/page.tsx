"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";

export default function AdminSignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    // Check if email is from @ments.app domain
    if (!email.endsWith("@ments.app")) {
      setErrorMsg("Only @ments.app email addresses are allowed for admin signup.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin/auth/callback`,
        data: {
          role: "admin", // Store intended role in user metadata
        },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    setEmailSent(true);
    setLoading(false);
  };

  if (emailSent) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-sm space-y-4 border p-6 rounded-lg text-center">
          <div className="text-4xl">📧</div>
          <h1 className="text-xl font-semibold">Check Your Email</h1>
          <p className="text-gray-600">
            We've sent a verification link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Click the link in the email to verify your account and gain admin access.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSignup}
        className="w-full max-w-sm space-y-4 border p-6 rounded-lg"
      >
        <h1 className="text-xl font-semibold text-center">Admin Sign Up</h1>

        {errorMsg && (
          <p className="text-sm text-red-500 text-center">{errorMsg}</p>
        )}

        <div>
          <label>Email</label>
          <input
            className="w-full border p-2 mt-1 rounded"
            type="email"
            placeholder="you@ments.app"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Only @ments.app emails are allowed
          </p>
        </div>

        <div>
          <label>Password</label>
          <input
            className="w-full border p-2 mt-1 rounded"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? "Creating..." : "Sign Up"}
        </button>

        <p className="text-center text-sm">
          Already have an account?{" "}
          <a href="/admin/login" className="underline">
            Login
          </a>
        </p>
      </form>
    </main>
  );
}
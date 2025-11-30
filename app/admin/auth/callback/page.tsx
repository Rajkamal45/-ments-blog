"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const handleCallback = async () => {
      // Get the token hash from URL (Supabase adds this)
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      // If we have token_hash, verify it
      if (token_hash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as "signup" | "email",
        });

        if (verifyError) {
          console.error("Verification error:", verifyError);
          setStatus("error");
          setMessage(verifyError.message || "Verification failed. Please try again.");
          return;
        }
      }

      // Now get the session
      const { data: { session }, error } = await supabase.auth.getSession();

      console.log("Session after verification:", { session, error });

      if (error || !session) {
        setStatus("error");
        setMessage("Verification failed. Please try again or request a new link.");
        return;
      }

      const user = session.user;
      
      // Verify email domain
      if (!user.email?.endsWith("@ments.app")) {
        setStatus("error");
        setMessage("Only @ments.app emails are allowed for admin access.");
        await supabase.auth.signOut();
        return;
      }

      // Check if admin profile already exists
      const { data: existingAdmin } = await supabase
        .from("admins")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!existingAdmin) {
        // Create admin record
        const { error: insertError } = await supabase.from("admins").insert({
          user_id: user.id,
          email: user.email,
          role: "admin",
          created_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error("Failed to create admin record:", insertError);
          setStatus("error");
          setMessage("Failed to set up admin access. Please contact support.");
          return;
        }
      }

      // Sign out so user can login fresh
      await supabase.auth.signOut();

      setStatus("success");
      setMessage("Email verified successfully! Redirecting to login...");
      
      setTimeout(() => {
        router.push("/admin/login");
      }, 2000);
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4 p-6 max-w-sm">
        {status === "verifying" && (
          <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full mx-auto" />
        )}
        {status === "success" && (
          <div className="text-5xl">✅</div>
        )}
        {status === "error" && (
          <div className="text-5xl">❌</div>
        )}
        
        <h1 className="text-xl font-semibold">
          {status === "verifying" && "Verifying..."}
          {status === "success" && "Verified!"}
          {status === "error" && "Verification Failed"}
        </h1>
        
        <p className="text-gray-600">{message}</p>
        
        {status === "success" && (
          <p className="text-sm text-gray-500">
            You can now login with your credentials.
          </p>
        )}
        
        {status === "error" && (
          <a 
            href="/admin/signup" 
            className="inline-block mt-4 px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Back to Sign Up
          </a>
        )}
        
        {status === "success" && (
          <a 
            href="/admin/login" 
            className="inline-block mt-4 px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Go to Login
          </a>
        )}
      </div>
    </main>
  );
}
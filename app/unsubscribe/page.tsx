"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/supabaseClient";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");

  const [email, setEmail] = useState(emailParam || "");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "not_found">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setStatus("error");
      setErrorMessage("Please enter your email address");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      // Check if email exists
      const { data: subscriber, error: findError } = await supabase
        .from("newsletter_subscribers")
        .select("id, is_active")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (findError || !subscriber) {
        setStatus("not_found");
        return;
      }

      if (!subscriber.is_active) {
        setStatus("success"); // Already unsubscribed
        return;
      }

      // Deactivate subscription
      const { error: updateError } = await supabase
        .from("newsletter_subscribers")
        .update({ is_active: false })
        .eq("id", subscriber.id);

      if (updateError) throw updateError;

      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      width: "100vw",
      backgroundColor: "#f9fafb",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24
    }}>
      <div style={{
        maxWidth: 440,
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 40,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        textAlign: "center"
      }}>
        {status === "success" ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 20 }}>👋</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#000", marginBottom: 12 }}>
              You've been unsubscribed
            </h1>
            <p style={{ color: "#6b7280", lineHeight: 1.7, marginBottom: 28 }}>
              We're sorry to see you go. You will no longer receive our newsletters.
            </p>
            <div style={{ padding: 16, backgroundColor: "#f0fdf4", borderRadius: 10, marginBottom: 28 }}>
              <p style={{ color: "#166534", fontSize: 14, margin: 0 }}>
                ✅ Successfully unsubscribed: <strong>{email}</strong>
              </p>
            </div>
            <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24 }}>
              Changed your mind? You can always subscribe again from our website.
            </p>
            <Link href="/" style={{
              display: "inline-block",
              padding: "14px 28px",
              backgroundColor: "#000",
              color: "#fff",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 15
            }}>
              ← Back to Blog
            </Link>
          </>
        ) : status === "not_found" ? (
          <>
            <div style={{ fontSize: 56, marginBottom: 20 }}>🔍</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#000", marginBottom: 12 }}>
              Email not found
            </h1>
            <p style={{ color: "#6b7280", lineHeight: 1.7, marginBottom: 28 }}>
              We couldn't find <strong>{email}</strong> in our subscriber list. It may have already been removed.
            </p>
            <Link href="/" style={{
              display: "inline-block",
              padding: "14px 28px",
              backgroundColor: "#000",
              color: "#fff",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 15
            }}>
              ← Back to Blog
            </Link>
          </>
        ) : (
          <>
            <div style={{ fontSize: 56, marginBottom: 20 }}>📧</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#000", marginBottom: 12 }}>
              Unsubscribe
            </h1>
            <p style={{ color: "#6b7280", lineHeight: 1.7, marginBottom: 28 }}>
              Enter your email address to unsubscribe from our newsletter.
            </p>

            {status === "error" && (
              <div style={{ 
                padding: 14, 
                backgroundColor: "#fef2f2", 
                borderRadius: 10, 
                marginBottom: 20,
                color: "#dc2626",
                fontSize: 14
              }}>
                ⚠️ {errorMessage}
              </div>
            )}

            <form onSubmit={handleUnsubscribe}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "16px 18px",
                  fontSize: 16,
                  border: "2px solid #e5e7eb",
                  borderRadius: 10,
                  outline: "none",
                  marginBottom: 16,
                  color: "#000",
                  backgroundColor: "#fff",
                  boxSizing: "border-box"
                }}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                style={{
                  width: "100%",
                  padding: "16px",
                  fontSize: 16,
                  fontWeight: 600,
                  backgroundColor: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  cursor: status === "loading" ? "not-allowed" : "pointer",
                  opacity: status === "loading" ? 0.7 : 1,
                  marginBottom: 20
                }}
              >
                {status === "loading" ? "Processing..." : "Unsubscribe"}
              </button>
            </form>

            <Link href="/" style={{ color: "#6b7280", fontSize: 14, textDecoration: "none" }}>
              ← Back to Blog
            </Link>
          </>
        )}
      </div>

      {/* Footer */}
      <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 32 }}>
        © {new Date().getFullYear()} ments. All rights reserved.
      </p>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" }}>
        <div style={{ width: 40, height: 40, border: "4px solid #e5e7eb", borderTopColor: "#000", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}
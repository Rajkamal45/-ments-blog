"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/supabaseClient";

export default function AdminLanding() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Check if user is admin
        const { data: admin } = await supabase
          .from("admins")
          .select("id")
          .eq("user_id", session.user.id)
          .single();

        if (admin) {
          router.push("/admin/dashboard");
          return;
        }
      }
    } catch (err) {
      console.error("Session check error:", err);
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        backgroundColor: "#000"
      }}>
        <div style={{ 
          width: 40, 
          height: 40, 
          border: "3px solid #333", 
          borderTopColor: "#fff", 
          borderRadius: "50%", 
          animation: "spin 1s linear infinite" 
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      width: "100vw",
      backgroundColor: "#000",
      color: "#fff",
      margin: 0,
      padding: 0,
      overflow: "hidden"
    }}>
      {/* Background Pattern */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(255,255,255,0.03) 0%, transparent 50%),
          radial-gradient(circle at 80% 50%, rgba(255,255,255,0.03) 0%, transparent 50%),
          radial-gradient(circle at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 50%)
        `,
        pointerEvents: "none"
      }} />

      {/* Grid Pattern */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
        pointerEvents: "none"
      }} />

      {/* Header */}
      <header style={{ 
        position: "relative",
        zIndex: 10,
        padding: "24px 48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <Link href="/" style={{ 
          fontSize: 24, 
          fontWeight: "bold", 
          color: "#fff", 
          textDecoration: "none",
          letterSpacing: "-0.5px"
        }}>
          ments.
        </Link>
        <Link href="/" style={{ 
          fontSize: 14, 
          color: "#6b7280", 
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 6
        }}>
          ← Back to Blog
        </Link>
      </header>

      {/* Main Content */}
      <main style={{
        position: "relative",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 200px)",
        padding: "40px 24px"
      }}>
        {/* Badge */}
        <div style={{
          padding: "8px 16px",
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 500,
          marginBottom: 32,
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          🔐 Admin Portal
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 56,
          fontWeight: 800,
          textAlign: "center",
          marginBottom: 16,
          lineHeight: 1.1,
          letterSpacing: "-2px",
          background: "linear-gradient(to bottom, #fff 0%, #888 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}>
          Welcome Back
        </h1>

        <p style={{
          fontSize: 18,
          color: "#6b7280",
          textAlign: "center",
          maxWidth: 400,
          marginBottom: 48,
          lineHeight: 1.6
        }}>
          Manage your blog posts, subscribers, and content from one place.
        </p>

        {/* Buttons */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          width: "100%",
          maxWidth: 360
        }}>
          {/* Login Button */}
          <Link href="/admin/login" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "18px 32px",
            backgroundColor: "#fff",
            color: "#000",
            fontSize: 16,
            fontWeight: 600,
            borderRadius: 12,
            textDecoration: "none",
            transition: "all 0.2s",
            boxShadow: "0 0 0 0 rgba(255,255,255,0.3)"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 10px 40px rgba(255,255,255,0.2)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 0 0 0 rgba(255,255,255,0.3)";
          }}
          >
            <span style={{ fontSize: 20 }}>→</span>
            Sign In to Dashboard
          </Link>

          {/* Signup Button */}
          <Link href="/admin/signup" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "18px 32px",
            backgroundColor: "transparent",
            color: "#fff",
            fontSize: 16,
            fontWeight: 600,
            borderRadius: 12,
            textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.2)",
            transition: "all 0.2s"
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
          }}
          >
            <span style={{ fontSize: 20 }}>✨</span>
            Create Admin Account
          </Link>
        </div>

        {/* Divider */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          margin: "48px 0",
          width: "100%",
          maxWidth: 360
        }}>
          <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize: 13, color: "#4b5563" }}>FEATURES</span>
          <div style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.1)" }} />
        </div>

        {/* Features */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 24,
          maxWidth: 700,
          width: "100%"
        }}>
          {[
            { icon: "📝", title: "Create Posts", desc: "Write with markdown" },
            { icon: "📊", title: "Analytics", desc: "Views & likes tracking" },
            { icon: "📧", title: "Newsletter", desc: "Email subscribers" }
          ].map((feature, i) => (
            <div key={i} style={{
              padding: 24,
              backgroundColor: "rgba(255,255,255,0.03)",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.06)",
              textAlign: "center"
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{feature.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: "#fff" }}>{feature.title}</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>{feature.desc}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        position: "relative",
        zIndex: 10,
        textAlign: "center",
        padding: "24px",
        color: "#4b5563",
        fontSize: 13
      }}>
        <p>© {new Date().getFullYear()} ments. All rights reserved.</p>
        <p style={{ marginTop: 8, fontSize: 12 }}>
          Only @ments.app email addresses can create admin accounts.
        </p>
      </footer>
    </div>
  );
}
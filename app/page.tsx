"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";
import Link from "next/link";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string;
  category: string;
  created_at: string;
  published_at: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "success" | "error" | "exists">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("blogs")
      .select("id, title, slug, excerpt, featured_image, category, created_at, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (!error && data) {
      setPosts(data);
    }
    setLoading(false);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setSubscribeStatus("error");
      setErrorMessage("Please enter a valid email address");
      return;
    }

    setSubscribing(true);
    setSubscribeStatus("idle");
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ 
          email: email.toLowerCase().trim(),
          source: "website"
        });

      if (error) {
        if (error.code === "23505") {
          // Unique violation - email already exists
          setSubscribeStatus("exists");
        } else {
          throw error;
        }
      } else {
        setSubscribeStatus("success");
        setEmail("");
      }
    } catch (err: any) {
      setSubscribeStatus("error");
      setErrorMessage(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", width: "100vw", backgroundColor: "#fff", margin: 0, padding: 0 }}>

      {/* Hero Section */}
      <section style={{ textAlign: "center", padding: "80px 32px 60px", maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontSize: 48, fontWeight: 800, color: "#000", marginBottom: 16, lineHeight: 1.2 }}>
          Our Blog
        </h1>
        <p style={{ fontSize: 18, color: "#4b5563", lineHeight: 1.7, maxWidth: 600, margin: "0 auto" }}>
          Insights, stories, and updates from the Ments team. Explore our latest thinking on startups, product, and community.
        </p>
      </section>

      {/* Posts Grid */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 60px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ width: 40, height: 40, border: "4px solid #e5e7eb", borderTopColor: "#000", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <p style={{ color: "#6b7280" }}>No posts published yet.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 32 }}>
            {posts.map((post) => (
              <article key={post.id} style={{ borderRadius: 12, overflow: "hidden" }}>
                <Link href={`/blog/${post.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  {/* Image */}
                  <div style={{ aspectRatio: "16/10", backgroundColor: "#f3f4f6", overflow: "hidden", borderRadius: 12 }}>
                    {post.featured_image ? (
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }}
                        onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                        onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                        <span style={{ fontSize: 48 }}>📄</span>
                      </div>
                    )}
                  </div>

                  {/* Post Info */}
                  <div style={{ padding: "20px 4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
                      {post.category && (
                        <>
                          <span style={{ color: "#000", fontWeight: 600 }}>{post.category}</span>
                          <span>·</span>
                        </>
                      )}
                      <time>{formatDate(post.published_at || post.created_at)}</time>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#000", marginBottom: 8, lineHeight: 1.4 }}>
                      {post.title}
                    </h2>
                    <p style={{ fontSize: 15, color: "#4b5563", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {post.excerpt || "No excerpt available"}
                    </p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Newsletter Section */}
      <section style={{ backgroundColor: "#000", padding: "80px 32px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
          <h2 style={{ fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
            Subscribe to our newsletter
          </h2>
          <p style={{ fontSize: 16, color: "#9ca3af", marginBottom: 32, lineHeight: 1.7 }}>
            Get the latest posts delivered straight to your inbox. No spam, unsubscribe anytime.
          </p>

          {subscribeStatus === "success" ? (
            <div style={{ backgroundColor: "#065f46", padding: "20px 32px", borderRadius: 12 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🎉</div>
              <p style={{ color: "#fff", fontWeight: 600, fontSize: 18 }}>You're subscribed!</p>
              <p style={{ color: "#a7f3d0", fontSize: 14, marginTop: 4 }}>Thanks for subscribing. We'll keep you updated!</p>
            </div>
          ) : subscribeStatus === "exists" ? (
            <div style={{ backgroundColor: "#1e40af", padding: "20px 32px", borderRadius: 12 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📧</div>
              <p style={{ color: "#fff", fontWeight: 600, fontSize: 18 }}>Already subscribed!</p>
              <p style={{ color: "#bfdbfe", fontSize: 14, marginTop: 4 }}>This email is already on our list.</p>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} style={{ display: "flex", gap: 12, maxWidth: 480, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  flex: 1,
                  minWidth: 240,
                  padding: "16px 20px",
                  fontSize: 16,
                  border: "none",
                  borderRadius: 10,
                  outline: "none",
                  color: "#000",
                  backgroundColor: "#fff"
                }}
              />
              <button
                type="submit"
                disabled={subscribing}
                style={{
                  padding: "16px 32px",
                  fontSize: 16,
                  fontWeight: 600,
                  backgroundColor: "#fff",
                  color: "#000",
                  border: "none",
                  borderRadius: 10,
                  cursor: subscribing ? "not-allowed" : "pointer",
                  opacity: subscribing ? 0.7 : 1,
                  transition: "all 0.2s"
                }}
              >
                {subscribing ? "Subscribing..." : "Subscribe"}
              </button>
            </form>
          )}

          {subscribeStatus === "error" && (
            <p style={{ color: "#fca5a5", marginTop: 16, fontSize: 14 }}>
              ⚠️ {errorMessage}
            </p>
          )}

          <p style={{ color: "#6b7280", fontSize: 13, marginTop: 24 }}>
            🔒 We respect your privacy. No spam ever.
          </p>
        </div>
      </section>
    </div>
  );
}
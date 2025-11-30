"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";
import Link from "next/link";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image: string;
  category: string;
  tags: string[];
  status: string;
  created_at: string;
  published_at: string;
  views: number;
  likes: number;
}

function renderMarkdown(content: string): string {
  if (!content) return "";

  let html = content;

  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/gim, 
    '<pre style="background:#1f2937;color:#f3f4f6;padding:20px;border-radius:12px;overflow-x:auto;margin:24px 0;font-size:14px;line-height:1.6"><code>$2</code></pre>');

  // Headers
  html = html.replace(/^### (.*)$/gim, '<h3 style="font-size:22px;font-weight:600;color:#000;margin:32px 0 16px;line-height:1.3">$1</h3>');
  html = html.replace(/^## (.*)$/gim, '<h2 style="font-size:28px;font-weight:700;color:#000;margin:40px 0 20px;line-height:1.3">$1</h2>');
  html = html.replace(/^# (.*)$/gim, '<h1 style="font-size:34px;font-weight:700;color:#000;margin:40px 0 20px;line-height:1.3">$1</h1>');

  // Bold and Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/gim, "<em>$1</em>");

  // Images - Full width with rounded corners
  html = html.replace(/!\[(.*?)\]\((.*?)\)/gim, 
    '<figure style="margin:32px 0"><img src="$2" alt="$1" style="width:100%;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1)" /><figcaption style="text-align:center;font-size:14px;color:#555;margin-top:12px">$1</figcaption></figure>');

  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/gim, 
    '<a href="$2" style="color:#2563eb;text-decoration:underline;text-underline-offset:2px" target="_blank" rel="noopener">$1</a>');

  // Inline code
  html = html.replace(/`([^`]+)`/gim, 
    '<code style="background:#f3f4f6;color:#e11d48;padding:3px 8px;border-radius:6px;font-size:14px;font-family:monospace">$1</code>');

  // Blockquotes
  html = html.replace(/^> (.*)$/gim, 
    '<blockquote style="border-left:4px solid #000;padding:16px 24px;margin:24px 0;background:#f9fafb;border-radius:0 12px 12px 0;font-style:italic;color:#000;font-size:18px">$1</blockquote>');

  // Horizontal rule
  html = html.replace(/^---$/gim, '<hr style="border:none;border-top:2px solid #e5e7eb;margin:40px 0" />');

  // Lists
  html = html.replace(/^- (.*)$/gim, '<li style="margin-left:24px;margin-bottom:12px;line-height:1.7;color:#000">$1</li>');

  // Paragraphs
  const blocks = html.split(/\n\n+/);
  html = blocks.map((block) => {
    if (block.startsWith("<h") || block.startsWith("<pre") || block.startsWith("<blockquote") || 
        block.startsWith("<figure") || block.startsWith("<li") || block.startsWith("<hr")) {
      return block;
    }
    if (block.trim()) {
      return `<p style="color:#000;line-height:1.9;margin-bottom:24px;font-size:18px">${block.replace(/\n/g, "<br />")}</p>`;
    }
    return "";
  }).join("");

  return html;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function calculateReadTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  const fetchPost = async () => {
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setPost(data);
    setLikeCount(data.likes || 0);
    setViewCount(data.views || 0);
    setLoading(false);

    // Increment view count
    incrementViews(data.id, data.views || 0);

    // Check if user already liked (using localStorage)
    const likedPosts = JSON.parse(localStorage.getItem("likedPosts") || "[]");
    if (likedPosts.includes(data.id)) {
      setLiked(true);
    }
  };

  const incrementViews = async (postId: string, currentViews: number) => {
    // Check if already viewed in this session
    const viewedPosts = JSON.parse(sessionStorage.getItem("viewedPosts") || "[]");
    if (viewedPosts.includes(postId)) return;

    // Mark as viewed
    sessionStorage.setItem("viewedPosts", JSON.stringify([...viewedPosts, postId]));

    // Update view count
    const newViews = currentViews + 1;
    setViewCount(newViews);

    await supabase
      .from("blogs")
      .update({ views: newViews })
      .eq("id", postId);
  };

  const handleLike = async () => {
    if (!post) return;

    const likedPosts = JSON.parse(localStorage.getItem("likedPosts") || "[]");

    if (liked) {
      // Unlike
      const newLikes = Math.max(0, likeCount - 1);
      setLikeCount(newLikes);
      setLiked(false);
      localStorage.setItem("likedPosts", JSON.stringify(likedPosts.filter((id: string) => id !== post.id)));

      await supabase
        .from("blogs")
        .update({ likes: newLikes })
        .eq("id", post.id);
    } else {
      // Like
      const newLikes = likeCount + 1;
      setLikeCount(newLikes);
      setLiked(true);
      localStorage.setItem("likedPosts", JSON.stringify([...likedPosts, post.id]));

      await supabase
        .from("blogs")
        .update({ likes: newLikes })
        .eq("id", post.id);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", width: "100vw", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "white" }}>
        <div style={{ width: 40, height: 40, border: "4px solid #e5e7eb", borderTopColor: "#111", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div style={{ minHeight: "100vh", width: "100vw", backgroundColor: "white" }}>
        <header style={{ borderBottom: "1px solid #f3f4f6", padding: "20px 32px" }}>
          <Link href="/" style={{ fontSize: 20, fontWeight: "bold", color: "black", textDecoration: "none" }}>ments.</Link>
        </header>
        <main style={{ maxWidth: 600, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 72, marginBottom: 24 }}>📄</div>
          <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 16 }}>Post Not Found</h1>
          <p style={{ color: "#6b7280", marginBottom: 32 }}>The post you're looking for doesn't exist.</p>
          <Link href="/" style={{ display: "inline-block", padding: "14px 28px", backgroundColor: "black", color: "white", borderRadius: 10, textDecoration: "none", fontWeight: 500 }}>
            ← Back to Home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", width: "100vw", backgroundColor: "white", margin: 0, padding: 0 }}>
      {/* Header */}
      <header style={{ 
        borderBottom: "1px solid #f3f4f6", 
        position: "sticky", 
        top: 0, 
        backgroundColor: "rgba(255,255,255,0.95)", 
        backdropFilter: "blur(10px)",
        zIndex: 50
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ fontSize: 20, fontWeight: "bold", color: "black", textDecoration: "none" }}>ments.</Link>
          <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link href="/" style={{ fontSize: 14, color: "#6b7280", textDecoration: "none" }}>All Posts</Link>
            <Link href="/about" style={{ fontSize: 14, color: "#6b7280", textDecoration: "none" }}>About</Link>
          </nav>
        </div>
      </header>

      {/* Hero Image */}
      {post.featured_image && (
        <div style={{ width: "100%", maxHeight: 560, overflow: "hidden", backgroundColor: "#f3f4f6" }}>
          <img
            src={post.featured_image}
            alt={post.title}
            style={{ width: "100%", height: "100%", maxHeight: 560, objectFit: "cover", display: "block" }}
          />
        </div>
      )}

      {/* Content */}
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>
        {/* Meta */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 20 }}>
          {post.category && (
            <span style={{ padding: "6px 14px", backgroundColor: "#111", color: "white", borderRadius: 20, fontSize: 13, fontWeight: 500 }}>
              {post.category}
            </span>
          )}
          <span style={{ color: "#6b7280", fontSize: 14 }}>{formatDate(post.published_at || post.created_at)}</span>
          <span style={{ color: "#d1d5db" }}>•</span>
          <span style={{ color: "#6b7280", fontSize: 14 }}>{calculateReadTime(post.content)}</span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 42, fontWeight: 800, color: "#111", lineHeight: 1.2, marginBottom: 24 }}>
          {post.title}
        </h1>

        {/* Excerpt */}
        {post.excerpt && (
          <p style={{ fontSize: 20, color: "#4b5563", lineHeight: 1.7, marginBottom: 32, borderLeft: "4px solid #111", paddingLeft: 20 }}>
            {post.excerpt}
          </p>
        )}

        {/* Stats Bar */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 24, 
          padding: "16px 0", 
          borderTop: "1px solid #e5e7eb", 
          borderBottom: "1px solid #e5e7eb",
          marginBottom: 40,
          flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#000", fontSize: 14 }}>
            <span style={{ fontSize: 18 }}>👁️</span>
            <span>{viewCount.toLocaleString()} views</span>
          </div>
          <button
            onClick={handleLike}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 8, 
              padding: "8px 16px",
              backgroundColor: liked ? "#fef2f2" : "#f9fafb",
              border: liked ? "2px solid #ef4444" : "2px solid #e5e7eb",
              borderRadius: 24,
              cursor: "pointer",
              transition: "all 0.2s",
              fontSize: 14,
              fontWeight: 500,
              color: liked ? "#ef4444" : "#000"
            }}
          >
            <span style={{ fontSize: 18 }}>{liked ? "❤️" : "🤍"}</span>
            <span>{likeCount.toLocaleString()} {likeCount === 1 ? "like" : "likes"}</span>
          </button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* Copy Link */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={{ 
                padding: "8px 14px", 
                backgroundColor: copied ? "#d1fae5" : "#fff", 
                border: copied ? "1px solid #10b981" : "1px solid #000",
                borderRadius: 8, 
                cursor: "pointer",
                fontSize: 14, 
                color: copied ? "#065f46" : "#000",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s"
              }}
            >
              {copied ? "✓ Copied!" : "🔗 Copy Link"}
            </button>
            {/* Twitter/X */}
            <button
              onClick={() => {
                const text = encodeURIComponent(post.title);
                const url = encodeURIComponent(window.location.href);
                window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "width=550,height=420");
              }}
              style={{ 
                padding: "8px 14px", 
                backgroundColor: "#000", 
                border: "none",
                borderRadius: 8, 
                cursor: "pointer",
                fontSize: 14, 
                color: "#fff",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              𝕏 Post
            </button>
            {/* LinkedIn */}
            <button
              onClick={() => {
                const url = encodeURIComponent(window.location.href);
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank", "width=550,height=420");
              }}
              style={{ 
                padding: "8px 14px", 
                backgroundColor: "#0A66C2", 
                border: "none",
                borderRadius: 8, 
                cursor: "pointer",
                fontSize: 14, 
                color: "#fff",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              in Share
            </button>
            {/* WhatsApp */}
            <button
              onClick={() => {
                const text = encodeURIComponent(`${post.title} - ${window.location.href}`);
                window.open(`https://wa.me/?text=${text}`, "_blank");
              }}
              style={{ 
                padding: "8px 14px", 
                backgroundColor: "#25D366", 
                border: "none",
                borderRadius: 8, 
                cursor: "pointer",
                fontSize: 14, 
                color: "#fff",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              💬 WhatsApp
            </button>
          </div>
        </div>

        {/* Article Content */}
        <article dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Tags</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {post.tags.map((tag) => (
                <span key={tag} style={{ padding: "8px 16px", backgroundColor: "#f3f4f6", color: "#374151", fontSize: 14, borderRadius: 20 }}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Like CTA */}
        <div style={{ 
          marginTop: 48, 
          padding: 32, 
          backgroundColor: "#f9fafb", 
          borderRadius: 16, 
          textAlign: "center" 
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>👏</div>
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Enjoyed this post?</h3>
          <p style={{ color: "#6b7280", marginBottom: 20 }}>Show your appreciation with a like!</p>
          <button
            onClick={handleLike}
            style={{ 
              padding: "14px 32px",
              backgroundColor: liked ? "#ef4444" : "#111",
              color: "white",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 8
            }}
          >
            {liked ? "❤️ Liked!" : "🤍 Like this post"}
          </button>
        </div>

        {/* Back */}
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid #e5e7eb" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#374151", textDecoration: "none", fontWeight: 500 }}>
            ← Back to all posts
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #f3f4f6", backgroundColor: "#f9fafb" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 32px", textAlign: "center" }}>
          <Link href="/" style={{ fontSize: 20, fontWeight: "bold", color: "black", textDecoration: "none" }}>ments.</Link>
          <p style={{ color: "#6b7280", fontSize: 14, marginTop: 16 }}>© {new Date().getFullYear()} ments. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
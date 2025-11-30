"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";

interface BlogPost {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image: string;
  category: string;
  tags: string[];
  status: "draft" | "published";
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function AdminBlogEditor() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentImageRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [post, setPost] = useState<BlogPost>({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    featured_image: "",
    category: "",
    tags: [],
    status: "draft",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    checkAdminAuth();
    fetchCategories();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/admin/login");
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("admins")
        .select("id, email, role")
        .eq("user_id", session.user.id)
        .single();

      if (adminError || !admin) {
        await supabase.auth.signOut();
        router.push("/admin/login");
        return;
      }

      setUserId(session.user.id);
      setIsAuthorized(true);
    } catch (err) {
      router.push("/admin/login");
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name, slug")
      .order("name");

    if (data) {
      setCategories(data);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  };

  const handleTitleChange = (title: string) => {
    setPost((prev) => ({
      ...prev,
      title,
      slug: generateSlug(title),
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("blog_image")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("blog_image").getPublicUrl(fileName);

      setPost((prev) => ({ ...prev, featured_image: data.publicUrl }));
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `content-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("blog_image")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("blog_image").getPublicUrl(fileName);

      const textarea = contentRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const imageMarkdown = `\n![Image](${data.publicUrl})\n`;
        const newContent = post.content.substring(0, start) + imageMarkdown + post.content.substring(start);
        setPost((prev) => ({ ...prev, content: newContent }));
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const insertFormatting = (before: string, after: string = "") => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = post.content.substring(start, end);
    const newText =
      post.content.substring(0, start) +
      before +
      selectedText +
      after +
      post.content.substring(end);

    setPost((prev) => ({ ...prev, content: newText }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const handleSave = async (status: "draft" | "published") => {
    setError("");
    setSuccess("");

    if (!post.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!post.content.trim()) {
      setError("Content is required");
      return;
    }
    if (!userId) {
      setError("You must be logged in as admin");
      return;
    }

    setSaving(true);

    try {
      const now = new Date().toISOString();

      const postData = {
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt || null,
        featured_image: post.featured_image || null,
        category: post.category || null,
        tags: post.tags.length > 0 ? post.tags : null,
        status: status,
        author_id: userId,
        created_at: now,
        updated_at: now,
        published_at: status === "published" ? now : null,
        views: 0,
        likes: 0,
      };

      const { error: insertError } = await supabase
        .from("blogs")
        .insert(postData);

      if (insertError) throw insertError;

      setSuccess(status === "published" ? "Post published successfully!" : "Draft saved!");

      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  const renderPreview = (content: string) => {
    if (!content) return "";
    
    let html = content;

    html = html.replace(/```(\w+)?\n([\s\S]*?)```/gim, 
      '<pre style="background:#1f2937;color:#f3f4f6;padding:16px;border-radius:8px;overflow-x:auto;margin:16px 0"><code>$2</code></pre>');

    html = html.replace(/^### (.*)$/gim, '<h3 style="font-size:20px;font-weight:600;margin:24px 0 12px;color:#000">$1</h3>');
    html = html.replace(/^## (.*)$/gim, '<h2 style="font-size:24px;font-weight:700;margin:32px 0 16px;color:#000">$1</h2>');
    html = html.replace(/^# (.*)$/gim, '<h1 style="font-size:30px;font-weight:700;margin:32px 0 16px;color:#000">$1</h1>');

    html = html.replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/gim, "<em>$1</em>");

    html = html.replace(/!\[(.*?)\]\((.*?)\)/gim, 
      '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:16px 0" />');

    html = html.replace(/\[(.*?)\]\((.*?)\)/gim, 
      '<a href="$2" style="color:#2563eb;text-decoration:underline">$1</a>');

    html = html.replace(/`([^`]+)`/gim, 
      '<code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:14px;color:#000">$1</code>');

    html = html.replace(/^> (.*)$/gim, 
      '<blockquote style="border-left:4px solid #000;padding-left:16px;margin:16px 0;color:#000;font-style:italic">$1</blockquote>');

    html = html.replace(/^- (.*)$/gim, '<li style="margin-left:20px;margin-bottom:8px;color:#000">$1</li>');

    html = html.replace(/\n\n/gim, '</p><p style="margin-bottom:16px;line-height:1.7;color:#000">');
    html = html.replace(/\n/gim, "<br />");

    return `<p style="margin-bottom:16px;line-height:1.7;color:#000">${html}</p>`;
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: "4px solid black", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#6b7280" }}>Verifying admin access...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <p style={{ color: "#4b5563" }}>Access denied. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb", width: "100vw", margin: 0, padding: 0 }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: "white", 
        borderBottom: "1px solid #e5e7eb", 
        position: "sticky", 
        top: 0, 
        zIndex: 50,
        width: "100%"
      }}>
        <div style={{ 
          maxWidth: 1400, 
          margin: "0 auto", 
          padding: "16px 32px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={() => router.push("/admin/dashboard")}
              style={{ background: "none", border: "none", color: "#000", cursor: "pointer", fontSize: 14, fontWeight: 500 }}
            >
              ← Back
            </button>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#000" }}>New Post</h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setPreviewMode(!previewMode)}
              style={{ padding: "8px 16px", fontSize: 14, color: "#000", background: "white", border: "1px solid #000", borderRadius: 8, cursor: "pointer", fontWeight: 500 }}
            >
              {previewMode ? "✏️ Edit" : "👁️ Preview"}
            </button>
            <button
              onClick={() => handleSave("draft")}
              disabled={saving}
              style={{ padding: "8px 16px", fontSize: 14, border: "1px solid #000", borderRadius: 8, cursor: "pointer", backgroundColor: "white", opacity: saving ? 0.5 : 1, color: "#000", fontWeight: 500 }}
            >
              💾 Save Draft
            </button>
            <button
              onClick={() => handleSave("published")}
              disabled={saving}
              style={{ padding: "8px 16px", fontSize: 14, backgroundColor: "#000", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", opacity: saving ? 0.5 : 1, fontWeight: 500 }}
            >
              {saving ? "Saving..." : "🚀 Publish"}
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      {error && (
        <div style={{ maxWidth: 1400, margin: "16px auto 0", padding: "0 32px" }}>
          <div style={{ backgroundColor: "#fef2f2", color: "#dc2626", padding: "12px 16px", borderRadius: 8, fontSize: 14 }}>
            ⚠️ {error}
          </div>
        </div>
      )}
      {success && (
        <div style={{ maxWidth: 1400, margin: "16px auto 0", padding: "0 32px" }}>
          <div style={{ backgroundColor: "#f0fdf4", color: "#16a34a", padding: "12px 16px", borderRadius: 8, fontSize: 14 }}>
            ✅ {success}
          </div>
        </div>
      )}

      {/* Main Editor */}
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32 }}>
          
          {/* Editor Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {previewMode ? (
              <div style={{ backgroundColor: "white", borderRadius: 12, padding: 32, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                {post.featured_image && (
                  <img src={post.featured_image} alt={post.title} style={{ width: "100%", height: 300, objectFit: "cover", borderRadius: 8, marginBottom: 24 }} />
                )}
                <h1 style={{ fontSize: 32, fontWeight: "bold", marginBottom: 16, color: "#000" }}>{post.title || "Untitled Post"}</h1>
                {post.excerpt && (
                  <p style={{ fontSize: 18, color: "#000", marginBottom: 24, fontStyle: "italic", borderLeft: "4px solid black", paddingLeft: 16 }}>{post.excerpt}</p>
                )}
                <div dangerouslySetInnerHTML={{ __html: renderPreview(post.content) }} />
              </div>
            ) : (
              <>
                {/* Title */}
                <div style={{ backgroundColor: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                  <input
                    type="text"
                    placeholder="Enter your post title..."
                    value={post.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    style={{ width: "100%", fontSize: 28, fontWeight: "bold", border: "none", outline: "none", padding: 0, color: "#000", backgroundColor: "transparent" }}
                  />
                  <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
                    🔗 Slug: <span style={{ color: "#000" }}>{post.slug || "auto-generated"}</span>
                  </div>
                </div>

                {/* Excerpt */}
                <div style={{ backgroundColor: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#000" }}>📝 Excerpt</label>
                  <textarea
                    placeholder="Write a short summary..."
                    value={post.excerpt}
                    onChange={(e) => setPost((prev) => ({ ...prev, excerpt: e.target.value }))}
                    rows={2}
                    style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, fontSize: 15, resize: "none", outline: "none", color: "#000", backgroundColor: "#fff" }}
                  />
                </div>

                {/* Content */}
                <div style={{ backgroundColor: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
                  <div style={{ borderBottom: "1px solid #e5e7eb", padding: "12px 16px", display: "flex", gap: 4, flexWrap: "wrap", backgroundColor: "#f9fafb" }}>
                    {[
                      { label: "H1", action: () => insertFormatting("# ") },
                      { label: "H2", action: () => insertFormatting("## ") },
                      { label: "H3", action: () => insertFormatting("### ") },
                      { label: "B", action: () => insertFormatting("**", "**"), style: { fontWeight: "bold" } },
                      { label: "I", action: () => insertFormatting("*", "*"), style: { fontStyle: "italic" } },
                      { label: "</>", action: () => insertFormatting("`", "`") },
                      { label: "🔗", action: () => insertFormatting("[", "](url)") },
                      { label: "📷", action: () => contentImageRef.current?.click() },
                      { label: "• List", action: () => insertFormatting("- ") },
                      { label: '" Quote', action: () => insertFormatting("> ") },
                    ].map((btn, i) => (
                      <button
                        key={i}
                        onClick={btn.action}
                        style={{ padding: "6px 10px", backgroundColor: "white", border: "1px solid #000", borderRadius: 6, fontSize: 13, cursor: "pointer", color: "#000", fontWeight: 500, ...btn.style }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                  <input ref={contentImageRef} type="file" accept="image/*" onChange={handleContentImageUpload} style={{ display: "none" }} />
                  <textarea
                    ref={contentRef}
                    placeholder="Write your content here... (Markdown supported)"
                    value={post.content}
                    onChange={(e) => setPost((prev) => ({ ...prev, content: e.target.value }))}
                    style={{ width: "100%", minHeight: 500, padding: 24, border: "none", outline: "none", fontSize: 15, lineHeight: 1.8, fontFamily: "monospace", resize: "vertical", color: "#000", backgroundColor: "#fff" }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Featured Image */}
            <div style={{ backgroundColor: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#000" }}>🖼️ Featured Image</label>
              {post.featured_image ? (
                <div style={{ position: "relative" }}>
                  <img src={post.featured_image} alt="Featured" style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 8 }} />
                  <button
                    onClick={() => setPost((prev) => ({ ...prev, featured_image: "" }))}
                    style={{ position: "absolute", top: 8, right: 8, backgroundColor: "white", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}
                  >✕</button>
                </div>
              ) : (
                <div onClick={() => fileInputRef.current?.click()} style={{ border: "2px dashed #d1d5db", borderRadius: 8, padding: 32, textAlign: "center", cursor: "pointer" }}>
                  {uploading ? <div>Uploading...</div> : <><div style={{ fontSize: 36 }}>📷</div><div style={{ fontSize: 14, color: "#6b7280" }}>Click to upload</div></>}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
            </div>

            {/* Category */}
            <div style={{ backgroundColor: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#000" }}>📁 Category</label>
              <select
                value={post.category}
                onChange={(e) => setPost((prev) => ({ ...prev, category: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, outline: "none", color: "#000", backgroundColor: "#fff" }}
              >
                <option value="">Select category</option>
                {categories.map((cat) => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </select>
            </div>

            {/* Tags */}
            <div style={{ backgroundColor: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#000" }}>🏷️ Tags</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const tag = tagInput.trim().toLowerCase();
                      if (tag && !post.tags.includes(tag)) {
                        setPost((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
                        setTagInput("");
                      }
                    }
                  }}
                  style={{ flex: 1, padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, outline: "none", color: "#000", backgroundColor: "#fff" }}
                />
                <button
                  onClick={() => {
                    const tag = tagInput.trim().toLowerCase();
                    if (tag && !post.tags.includes(tag)) {
                      setPost((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
                      setTagInput("");
                    }
                  }}
                  style={{ padding: "8px 16px", backgroundColor: "#f3f4f6", border: "none", borderRadius: 8, cursor: "pointer", color: "#000" }}
                >Add</button>
              </div>
              {post.tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {post.tags.map((tag) => (
                    <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", backgroundColor: "#e5e7eb", borderRadius: 20, fontSize: 13, color: "#000" }}>
                      #{tag}
                      <button onClick={() => setPost((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#000", fontWeight: "bold" }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Slug */}
            <div style={{ backgroundColor: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#000" }}>🔗 Custom Slug</label>
              <input
                type="text"
                value={post.slug}
                onChange={(e) => setPost((prev) => ({ ...prev, slug: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, outline: "none", color: "#000", backgroundColor: "#fff" }}
              />
            </div>

            {/* Tips */}
            <div style={{ backgroundColor: "#f0f9ff", borderRadius: 12, padding: 20, border: "1px solid #bae6fd" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#0369a1", marginBottom: 8 }}>💡 Tips</h3>
              <ul style={{ fontSize: 13, color: "#0c4a6e", margin: 0, paddingLeft: 16, lineHeight: 1.6 }}>
                <li>Use 📷 to insert images</li>
                <li>Preview before publishing</li>
                <li>Markdown is supported</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
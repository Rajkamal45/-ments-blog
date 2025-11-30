"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/supabaseClient";
import Link from "next/link";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: string;
  category: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/admin/login");
        return;
      }

      // Verify admin status
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

      setAdminEmail(admin.email);
      setIsAuthorized(true);
      await fetchPosts();
    } catch (err) {
      console.error("Auth error:", err);
      router.push("/admin/login");
    }
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("blogs")
      .select("id, title, slug, excerpt, status, category, created_at, updated_at, published_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    setDeleting(id);

    const { error } = await supabase.from("blogs").delete().eq("id", id);

    if (error) {
      alert("Failed to delete post");
      console.error(error);
    } else {
      setPosts(posts.filter((p) => p.id !== id));
    }

    setDeleting(null);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "published" ? "draft" : "published";
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("blogs")
      .update({
        status: newStatus,
        updated_at: now,
        published_at: newStatus === "published" ? now : null,
      })
      .eq("id", id);

    if (error) {
      alert("Failed to update post");
      console.error(error);
    } else {
      setPosts(
        posts.map((p) =>
          p.id === id
            ? { ...p, status: newStatus, published_at: newStatus === "published" ? now : null }
            : p
        )
      );
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Loading state
  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-black">
              ments.
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600">Admin Dashboard</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{adminEmail}</span>
            <Link
              href="/admin/editor"
              className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
            >
              + New Post
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-black transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-3xl font-bold">{posts.length}</div>
            <div className="text-gray-500 text-sm">Total Posts</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-3xl font-bold text-green-600">
              {posts.filter((p) => p.status === "published").length}
            </div>
            <div className="text-gray-500 text-sm">Published</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-3xl font-bold text-gray-400">
              {posts.filter((p) => p.status === "draft").length}
            </div>
            <div className="text-gray-500 text-sm">Drafts</div>
          </div>
        </div>

        {/* Posts Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold">All Posts</h2>
          </div>

          {posts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-4">📝</div>
              <div className="text-gray-500 mb-4">No posts yet</div>
              <Link
                href="/admin/editor"
                className="inline-block px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800"
              >
                Create your first post
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-left text-sm text-gray-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Title</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {post.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {post.excerpt || "No excerpt"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {post.category || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleStatus(post.id, post.status)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            post.status === "published"
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {post.status === "published" ? "Published" : "Draft"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(post.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            className="px-3 py-1 text-sm text-gray-500 hover:text-black"
                          >
                            View
                          </Link>
                          <Link
                            href={`/admin/editor/${post.id}`}
                            className="px-3 py-1 text-sm text-gray-500 hover:text-black"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(post.id, post.title)}
                            disabled={deleting === post.id}
                            className="px-3 py-1 text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
                          >
                            {deleting === post.id ? "..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
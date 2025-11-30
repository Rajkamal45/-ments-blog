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
  views: number;
  likes: number;
}

interface Subscriber {
  id: string;
  email: string;
  is_active: boolean;
  subscribed_at: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Subscriber states
  const [showSubscriberModal, setShowSubscriberModal] = useState(false);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [manualEmails, setManualEmails] = useState("");
  const [addingSubscribers, setAddingSubscribers] = useState(false);
  const [subscriberMessage, setSubscriberMessage] = useState({ type: "", text: "" });

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
      await fetchSubscribers();
    } catch (err) {
      console.error("Auth error:", err);
      router.push("/admin/login");
    }
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("blogs")
      .select("id, title, slug, excerpt, status, category, created_at, updated_at, published_at, views, likes")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  };

  const fetchSubscribers = async () => {
    const { data, count, error } = await supabase
      .from("newsletter_subscribers")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("subscribed_at", { ascending: false });

    if (!error) {
      setSubscribers(data || []);
      setSubscriberCount(count || 0);
    }
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

  // Parse emails from text (handles comma, newline, space separated)
  const parseEmails = (text: string): string[] => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex) || [];
    return [...new Set(matches.map(e => e.toLowerCase()))]; // Remove duplicates
  };

  // Add subscribers manually
  const handleAddSubscribers = async () => {
    const emails = parseEmails(manualEmails);
    
    if (emails.length === 0) {
      setSubscriberMessage({ type: "error", text: "No valid emails found" });
      return;
    }

    setAddingSubscribers(true);
    setSubscriberMessage({ type: "", text: "" });

    let added = 0;
    let skipped = 0;

    for (const email of emails) {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ 
          email, 
          is_active: true, 
          source: "manual",
          subscribed_at: new Date().toISOString()
        });

      if (error) {
        if (error.code === "23505") {
          skipped++; // Duplicate
        } else {
          console.error("Error adding:", email, error);
        }
      } else {
        added++;
      }
    }

    setSubscriberMessage({ 
      type: "success", 
      text: `✅ Added ${added} subscriber${added !== 1 ? 's' : ''}${skipped > 0 ? `, ${skipped} already existed` : ''}`
    });
    
    setManualEmails("");
    setAddingSubscribers(false);
    await fetchSubscribers();
  };

  // Handle CSV file upload
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAddingSubscribers(true);
    setSubscriberMessage({ type: "", text: "" });

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const emails = parseEmails(text);

      if (emails.length === 0) {
        setSubscriberMessage({ type: "error", text: "No valid emails found in CSV" });
        setAddingSubscribers(false);
        return;
      }

      let added = 0;
      let skipped = 0;

      for (const email of emails) {
        const { error } = await supabase
          .from("newsletter_subscribers")
          .insert({ 
            email, 
            is_active: true, 
            source: "csv_import",
            subscribed_at: new Date().toISOString()
          });

        if (error) {
          if (error.code === "23505") {
            skipped++;
          }
        } else {
          added++;
        }
      }

      setSubscriberMessage({ 
        type: "success", 
        text: `✅ Imported ${added} subscriber${added !== 1 ? 's' : ''} from CSV${skipped > 0 ? `, ${skipped} already existed` : ''}`
      });
      
      setAddingSubscribers(false);
      await fetchSubscribers();
    };

    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  // Delete subscriber
  const handleDeleteSubscriber = async (id: string, email: string) => {
    if (!confirm(`Remove ${email} from subscribers?`)) return;

    const { error } = await supabase
      .from("newsletter_subscribers")
      .delete()
      .eq("id", id);

    if (!error) {
      await fetchSubscribers();
    }
  };

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
              href="/admin/newsletter"
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              📧 Newsletter
            </Link>
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-2xl font-bold">{posts.length}</div>
            <div className="text-gray-500 text-sm">Total Posts</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {posts.filter((p) => p.status === "published").length}
            </div>
            <div className="text-gray-500 text-sm">Published</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-2xl font-bold text-gray-400">
              {posts.filter((p) => p.status === "draft").length}
            </div>
            <div className="text-gray-500 text-sm">Drafts</div>
          </div>
          {/* Total Views */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {posts.reduce((sum, p) => sum + (p.views || 0), 0).toLocaleString()}
            </div>
            <div className="text-gray-500 text-sm">👁️ Total Views</div>
          </div>
          {/* Total Likes */}
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-2xl font-bold text-red-500">
              {posts.reduce((sum, p) => sum + (p.likes || 0), 0).toLocaleString()}
            </div>
            <div className="text-gray-500 text-sm">❤️ Total Likes</div>
          </div>
          {/* Subscriber Card with Add Button */}
          <div 
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 shadow-sm cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all"
            onClick={() => setShowSubscriberModal(true)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{subscriberCount}</div>
                <div className="text-blue-100 text-sm">📧 Subscribers</div>
              </div>
            </div>
            <div className="mt-1 text-xs text-blue-100">Click to manage →</div>
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
                    <th className="px-6 py-3 font-medium text-center">👁️ Views</th>
                    <th className="px-6 py-3 font-medium text-center">❤️ Likes</th>
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
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-purple-600 font-medium">
                          {(post.views || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-red-500 font-medium">
                          {(post.likes || 0).toLocaleString()}
                        </span>
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

      {/* Subscriber Modal */}
      {showSubscriberModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowSubscriberModal(false)}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600">
              <div>
                <h2 className="text-xl font-bold text-white">📧 Manage Subscribers</h2>
                <p className="text-blue-100 text-sm">{subscriberCount} active subscribers</p>
              </div>
              <button 
                onClick={() => setShowSubscriberModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Message */}
              {subscriberMessage.text && (
                <div className={`mb-4 p-4 rounded-lg text-sm ${
                  subscriberMessage.type === "success" 
                    ? "bg-green-50 text-green-700 border border-green-200" 
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {subscriberMessage.text}
                </div>
              )}

              {/* Add Methods */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* CSV Upload */}
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                  <div className="text-4xl mb-3">📄</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Upload CSV</h3>
                  <p className="text-sm text-gray-500 mb-4">Import emails from a CSV file</p>
                  <label className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors text-sm font-medium">
                    Choose File
                    <input 
                      type="file" 
                      accept=".csv,.txt" 
                      onChange={handleCSVUpload}
                      className="hidden"
                      disabled={addingSubscribers}
                    />
                  </label>
                </div>

                {/* Quick Stats */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">📊 Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Active</span>
                      <span className="font-bold text-green-600">{subscriberCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">This Month</span>
                      <span className="font-bold text-blue-600">
                        {subscribers.filter(s => {
                          const subDate = new Date(s.subscribed_at);
                          const now = new Date();
                          return subDate.getMonth() === now.getMonth() && subDate.getFullYear() === now.getFullYear();
                        }).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Add */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">✍️ Add Manually</h3>
                <textarea
                  placeholder="Enter emails (comma, space, or newline separated)&#10;&#10;Example:&#10;john@example.com, jane@example.com&#10;bob@example.com"
                  value={manualEmails}
                  onChange={(e) => setManualEmails(e.target.value)}
                  className="w-full h-32 p-4 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={addingSubscribers}
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm text-gray-500">
                    {parseEmails(manualEmails).length} valid email{parseEmails(manualEmails).length !== 1 ? 's' : ''} detected
                  </span>
                  <button
                    onClick={handleAddSubscribers}
                    disabled={addingSubscribers || parseEmails(manualEmails).length === 0}
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {addingSubscribers ? "Adding..." : "Add Subscribers"}
                  </button>
                </div>
              </div>

              {/* Subscriber List */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">👥 Recent Subscribers</h3>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {subscribers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <div className="text-4xl mb-2">📭</div>
                      <p>No subscribers yet</p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 text-left text-xs text-gray-500 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 font-medium">Email</th>
                            <th className="px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {subscribers.slice(0, 20).map((sub) => (
                            <tr key={sub.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{sub.email}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{formatDate(sub.subscribed_at)}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {subscribers.length > 20 && (
                        <div className="px-4 py-3 bg-gray-50 text-center text-sm text-gray-500">
                          And {subscribers.length - 20} more...{" "}
                          <Link href="/admin/newsletter" className="text-blue-600 hover:underline">
                            View all
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
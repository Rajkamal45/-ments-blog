"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/supabaseClient";

interface Subscriber {
  id: string;
  email: string;
  subscribed_at: string;
  is_active: boolean;
  source: string;
}

interface NewsletterLog {
  id: string;
  blog_id: string;
  blog_title: string;
  recipients_count: number;
  failed_count: number;
  sent_at: string;
}

export default function NewsletterDashboard() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"subscribers" | "logs" | "compose">("subscribers");
  
  // Subscribers
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);
  
  // Logs
  const [logs, setLogs] = useState<NewsletterLog[]>([]);
  
  // Compose
  const [composeSubject, setComposeSubject] = useState("");
  const [composeContent, setComposeContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    thisMonth: 0
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchSubscribers();
      fetchLogs();
    }
  }, [isAuthorized]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/admin/login");
        return;
      }

      const { data: admin } = await supabase
        .from("admins")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!admin) {
        router.push("/admin/login");
        return;
      }

      setIsAuthorized(true);
    } catch (err) {
      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscribers = async () => {
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false });

    if (!error && data) {
      setSubscribers(data);
      
      // Calculate stats
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      setStats({
        total: data.length,
        active: data.filter(s => s.is_active).length,
        inactive: data.filter(s => !s.is_active).length,
        thisMonth: data.filter(s => new Date(s.subscribed_at) >= monthStart).length
      });
    }
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("newsletter_logs")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setLogs(data);
    }
  };

  const toggleSubscriberStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("newsletter_subscribers")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (!error) {
      fetchSubscribers();
    }
  };

  const deleteSubscriber = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subscriber?")) return;

    const { error } = await supabase
      .from("newsletter_subscribers")
      .delete()
      .eq("id", id);

    if (!error) {
      fetchSubscribers();
    }
  };

  const deleteSelectedSubscribers = async () => {
    if (selectedSubscribers.length === 0) return;
    if (!confirm(`Delete ${selectedSubscribers.length} subscribers?`)) return;

    const { error } = await supabase
      .from("newsletter_subscribers")
      .delete()
      .in("id", selectedSubscribers);

    if (!error) {
      setSelectedSubscribers([]);
      fetchSubscribers();
    }
  };

  const exportSubscribers = () => {
    const activeSubscribers = subscribers.filter(s => s.is_active);
    const csv = [
      "email,subscribed_at,source",
      ...activeSubscribers.map(s => `${s.email},${s.subscribed_at},${s.source}`)
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const sendCustomNewsletter = async () => {
    if (!composeSubject.trim() || !composeContent.trim()) {
      setSendResult({ success: false, message: "Subject and content are required" });
      return;
    }

    setSending(true);
    setSendResult(null);

    try {
      const response = await fetch("/api/send-custom-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: composeSubject,
          content: composeContent
        })
      });

      const result = await response.json();

      if (result.success) {
        setSendResult({ success: true, message: `Newsletter sent to ${result.count} subscribers!` });
        setComposeSubject("");
        setComposeContent("");
        fetchLogs();
      } else {
        setSendResult({ success: false, message: result.error || "Failed to send" });
      }
    } catch (err) {
      setSendResult({ success: false, message: "Failed to send newsletter" });
    } finally {
      setSending(false);
    }
  };

  const filteredSubscribers = subscribers.filter(s =>
    s.email.toLowerCase().includes(subscriberSearch.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #333", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", color: "#fff" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #222", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/admin/dashboard" style={{ color: "#888", textDecoration: "none", fontSize: 14 }}>
            ← Back to Dashboard
          </Link>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>📧 Newsletter Management</h1>
        </div>
        <button
          onClick={exportSubscribers}
          style={{ padding: "8px 16px", backgroundColor: "#222", border: "1px solid #333", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 14 }}
        >
          📥 Export CSV
        </button>
      </header>

      {/* Stats */}
      <div style={{ padding: "24px 32px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, maxWidth: 1200, margin: "0 auto" }}>
        {[
          { label: "Total Subscribers", value: stats.total, icon: "👥", color: "#3b82f6" },
          { label: "Active", value: stats.active, icon: "✅", color: "#22c55e" },
          { label: "Unsubscribed", value: stats.inactive, icon: "❌", color: "#ef4444" },
          { label: "This Month", value: stats.thisMonth, icon: "📈", color: "#a855f7" }
        ].map((stat, i) => (
          <div key={i} style={{ backgroundColor: "#111", borderRadius: 12, padding: 20, border: "1px solid #222" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>{stat.icon}</span>
              <span style={{ fontSize: 32, fontWeight: 700, color: stat.color }}>{stat.value}</span>
            </div>
            <div style={{ fontSize: 14, color: "#888" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 32px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #222", marginBottom: 24 }}>
          {[
            { id: "subscribers", label: "👥 Subscribers", count: stats.active },
            { id: "compose", label: "✍️ Compose" },
            { id: "logs", label: "📊 Send History", count: logs.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: "12px 20px",
                backgroundColor: "transparent",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #fff" : "2px solid transparent",
                color: activeTab === tab.id ? "#fff" : "#888",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span style={{ backgroundColor: "#333", padding: "2px 8px", borderRadius: 10, fontSize: 12 }}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Subscribers Tab */}
        {activeTab === "subscribers" && (
          <div>
            {/* Search & Actions */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <input
                type="text"
                placeholder="Search by email..."
                value={subscriberSearch}
                onChange={(e) => setSubscriberSearch(e.target.value)}
                style={{ flex: 1, padding: "12px 16px", backgroundColor: "#111", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none" }}
              />
              {selectedSubscribers.length > 0 && (
                <button
                  onClick={deleteSelectedSubscribers}
                  style={{ padding: "12px 20px", backgroundColor: "#7f1d1d", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 14 }}
                >
                  🗑️ Delete ({selectedSubscribers.length})
                </button>
              )}
            </div>

            {/* Subscribers Table */}
            <div style={{ backgroundColor: "#111", borderRadius: 12, border: "1px solid #222", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #222" }}>
                    <th style={{ padding: 16, textAlign: "left", fontSize: 13, color: "#888", fontWeight: 500 }}>
                      <input
                        type="checkbox"
                        checked={selectedSubscribers.length === filteredSubscribers.length && filteredSubscribers.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSubscribers(filteredSubscribers.map(s => s.id));
                          } else {
                            setSelectedSubscribers([]);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      />
                    </th>
                    <th style={{ padding: 16, textAlign: "left", fontSize: 13, color: "#888", fontWeight: 500 }}>Email</th>
                    <th style={{ padding: 16, textAlign: "left", fontSize: 13, color: "#888", fontWeight: 500 }}>Status</th>
                    <th style={{ padding: 16, textAlign: "left", fontSize: 13, color: "#888", fontWeight: 500 }}>Source</th>
                    <th style={{ padding: 16, textAlign: "left", fontSize: 13, color: "#888", fontWeight: 500 }}>Subscribed</th>
                    <th style={{ padding: 16, textAlign: "right", fontSize: 13, color: "#888", fontWeight: 500 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscribers.map((subscriber) => (
                    <tr key={subscriber.id} style={{ borderBottom: "1px solid #222" }}>
                      <td style={{ padding: 16 }}>
                        <input
                          type="checkbox"
                          checked={selectedSubscribers.includes(subscriber.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubscribers([...selectedSubscribers, subscriber.id]);
                            } else {
                              setSelectedSubscribers(selectedSubscribers.filter(id => id !== subscriber.id));
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                      <td style={{ padding: 16, fontSize: 14 }}>{subscriber.email}</td>
                      <td style={{ padding: 16 }}>
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 500,
                          backgroundColor: subscriber.is_active ? "#052e16" : "#450a0a",
                          color: subscriber.is_active ? "#22c55e" : "#ef4444"
                        }}>
                          {subscriber.is_active ? "Active" : "Unsubscribed"}
                        </span>
                      </td>
                      <td style={{ padding: 16, fontSize: 14, color: "#888" }}>{subscriber.source}</td>
                      <td style={{ padding: 16, fontSize: 14, color: "#888" }}>{formatDate(subscriber.subscribed_at)}</td>
                      <td style={{ padding: 16, textAlign: "right" }}>
                        <button
                          onClick={() => toggleSubscriberStatus(subscriber.id, subscriber.is_active)}
                          style={{ padding: "6px 12px", backgroundColor: "#222", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 12, marginRight: 8 }}
                        >
                          {subscriber.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => deleteSubscriber(subscriber.id)}
                          style={{ padding: "6px 12px", backgroundColor: "#7f1d1d", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 12 }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredSubscribers.length === 0 && (
                <div style={{ padding: 48, textAlign: "center", color: "#888" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                  <p>No subscribers found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compose Tab */}
        {activeTab === "compose" && (
          <div style={{ maxWidth: 800 }}>
            <div style={{ backgroundColor: "#111", borderRadius: 12, padding: 24, border: "1px solid #222" }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                ✍️ Compose Newsletter
              </h2>

              {sendResult && (
                <div style={{
                  padding: 16,
                  borderRadius: 8,
                  marginBottom: 20,
                  backgroundColor: sendResult.success ? "#052e16" : "#450a0a",
                  color: sendResult.success ? "#22c55e" : "#ef4444"
                }}>
                  {sendResult.success ? "✅" : "❌"} {sendResult.message}
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#ccc" }}>Subject</label>
                <input
                  type="text"
                  placeholder="Enter email subject..."
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  style={{ width: "100%", padding: "14px 16px", backgroundColor: "#0a0a0a", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 15, outline: "none" }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 8, color: "#ccc" }}>Content (Markdown supported)</label>
                <textarea
                  placeholder="Write your newsletter content here..."
                  value={composeContent}
                  onChange={(e) => setComposeContent(e.target.value)}
                  rows={12}
                  style={{ width: "100%", padding: "14px 16px", backgroundColor: "#0a0a0a", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 15, outline: "none", resize: "vertical", fontFamily: "monospace", lineHeight: 1.6 }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: 13, color: "#888" }}>
                  📧 Will be sent to <strong style={{ color: "#fff" }}>{stats.active}</strong> active subscribers
                </p>
                <button
                  onClick={sendCustomNewsletter}
                  disabled={sending}
                  style={{
                    padding: "14px 28px",
                    backgroundColor: "#fff",
                    color: "#000",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: sending ? "not-allowed" : "pointer",
                    opacity: sending ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}
                >
                  {sending ? "Sending..." : "🚀 Send Newsletter"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <div style={{ backgroundColor: "#111", borderRadius: 12, border: "1px solid #222", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #222" }}>
                  <th style={{ padding: 16, textAlign: "left", fontSize: 13, color: "#888", fontWeight: 500 }}>Subject / Blog</th>
                  <th style={{ padding: 16, textAlign: "left", fontSize: 13, color: "#888", fontWeight: 500 }}>Recipients</th>
                  <th style={{ padding: 16, textAlign: "left", fontSize: 13, color: "#888", fontWeight: 500 }}>Failed</th>
                  <th style={{ padding: 16, textAlign: "left", fontSize: 13, color: "#888", fontWeight: 500 }}>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid #222" }}>
                    <td style={{ padding: 16, fontSize: 14 }}>{log.blog_title || "Custom Newsletter"}</td>
                    <td style={{ padding: 16 }}>
                      <span style={{ padding: "4px 10px", backgroundColor: "#052e16", color: "#22c55e", borderRadius: 20, fontSize: 12 }}>
                        {log.recipients_count} sent
                      </span>
                    </td>
                    <td style={{ padding: 16 }}>
                      {log.failed_count > 0 ? (
                        <span style={{ padding: "4px 10px", backgroundColor: "#450a0a", color: "#ef4444", borderRadius: 20, fontSize: 12 }}>
                          {log.failed_count} failed
                        </span>
                      ) : (
                        <span style={{ color: "#888", fontSize: 14 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: 16, fontSize: 14, color: "#888" }}>{formatDate(log.sent_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {logs.length === 0 && (
              <div style={{ padding: 48, textAlign: "center", color: "#888" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                <p>No newsletters sent yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
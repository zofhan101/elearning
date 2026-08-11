import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, Plus, ChevronLeft, Send } from "lucide-react";

interface Thread {
  id: string;
  title: string;
  body: string | null;
  author_name: string;
  created_by: string;
  created_at: string;
}

interface Reply {
  id: string;
  body: string;
  author_name: string;
  created_by: string;
  created_at: string;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function ForumBlock({ blockId }: { blockId: string }) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);

  const myName = async () => {
    if (!user) return "Someone";
    const { data } = await supabase.from("personnel").select("nom, prenom").eq("id", user.id).maybeSingle();
    const name = [data?.prenom, data?.nom].filter(Boolean).join(" ").trim();
    return name || user.email || "Someone";
  };

  const loadThreads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("forum_threads")
      .select("*")
      .eq("content_block_id", blockId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setThreads((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadThreads(); }, [blockId]);

  const openThread = async (t: Thread) => {
    setSelected(t);
    const { data, error } = await supabase
      .from("forum_replies")
      .select("*")
      .eq("thread_id", t.id)
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setReplies((data as any) ?? []);
  };

  const createThread = async () => {
    if (!newTitle.trim()) return toast.error("Title required");
    if (!user) return;
    setBusy(true);
    const author_name = await myName();
    const { error } = await supabase.from("forum_threads").insert({
      content_block_id: blockId,
      title: newTitle.trim(),
      body: newBody.trim() || null,
      created_by: user.id,
      author_name,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setNewTitle(""); setNewBody(""); setNewThreadOpen(false);
    loadThreads();
  };

  const postReply = async () => {
    if (!replyBody.trim() || !selected || !user) return;
    setBusy(true);
    const author_name = await myName();
    const { error } = await supabase.from("forum_replies").insert({
      thread_id: selected.id,
      body: replyBody.trim(),
      created_by: user.id,
      author_name,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setReplyBody("");
    openThread(selected);
  };

  if (selected) {
    return (
      <div className="border border-border rounded-lg p-4 bg-card">
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back to threads
        </button>
        <div className="mb-4">
          <h4 className="font-medium">{selected.title}</h4>
          <div className="text-xs text-muted-foreground mt-0.5">
            {selected.author_name} · {fmt(selected.created_at)}
          </div>
          {selected.body && <p className="text-sm mt-2 whitespace-pre-wrap">{selected.body}</p>}
        </div>
        <div className="space-y-3 mb-4">
          {replies.map((r) => (
            <div key={r.id} className="pl-3 border-l-2 border-border">
              <div className="text-xs text-muted-foreground">{r.author_name} · {fmt(r.created_at)}</div>
              <p className="text-sm mt-0.5 whitespace-pre-wrap">{r.body}</p>
            </div>
          ))}
          {replies.length === 0 && <p className="text-xs text-muted-foreground italic">No replies yet.</p>}
        </div>
        <div className="flex gap-2">
          <Textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write a reply…"
            className="min-h-[60px]"
          />
        </div>
        <Button size="sm" className="mt-2" onClick={postReply} disabled={busy || !replyBody.trim()}>
          <Send className="h-3.5 w-3.5 mr-1" /> Reply
        </Button>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="h-4 w-4" /> Discussion
        </div>
        <Button size="sm" variant="outline" onClick={() => setNewThreadOpen((o) => !o)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New Thread
        </Button>
      </div>

      {newThreadOpen && (
        <div className="mb-4 space-y-2 border border-border rounded-md p-3 bg-muted/30">
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Thread title" />
          <Textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Write your message… (optional)"
            className="min-h-[60px]"
          />
          <Button size="sm" onClick={createThread} disabled={busy || !newTitle.trim()}>
            Post Thread
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : threads.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No threads yet. Start the conversation.</p>
      ) : (
        <div className="space-y-1">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => openThread(t)}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <div className="text-sm font-medium">{t.title}</div>
              <div className="text-xs text-muted-foreground">{t.author_name} · {fmt(t.created_at)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

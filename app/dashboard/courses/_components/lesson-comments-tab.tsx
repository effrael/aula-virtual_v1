"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, MessageSquare, CornerDownRight, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getLessonComments, postLessonComment, type CommentRow } from "@/app/actions/lesson-comments";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

function AuthorAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className="shrink-0 flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary text-xs font-bold select-none">
      {initials || "?"}
    </span>
  );
}

// ── CommentItem ───────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  userId,
  lessonId,
  onReplyPosted,
}: {
  comment: CommentRow;
  userId: string;
  lessonId: string;
  onReplyPosted: (parentId: string, reply: CommentRow) => void;
}) {
  const [replying, setReplying]     = useState(false);
  const [replyBody, setReplyBody]   = useState("");
  const [pending, startTransition]  = useTransition();

  function submitReply() {
    if (!replyBody.trim()) return;
    startTransition(async () => {
      const result = await postLessonComment(lessonId, replyBody, comment.id);
      if (result.success) {
        onReplyPosted(comment.id, result.comment);
        setReplyBody("");
        setReplying(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Comentario principal */}
      <div className="flex gap-3">
        <AuthorAvatar name={comment.author_name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-[var(--color-neutral-800)]">
              {comment.author_id === userId ? "Tú" : comment.author_name}
            </span>
            <span className="text-xs text-[var(--color-neutral-400)]">
              {formatRelativeTime(comment.created_at)}
            </span>
          </div>
          <p className="text-sm text-[var(--color-neutral-700)] mt-0.5 leading-relaxed whitespace-pre-wrap">
            {comment.body}
          </p>
          <button
            onClick={() => setReplying((v) => !v)}
            className="mt-1 text-xs text-[var(--color-neutral-400)] hover:text-primary transition-colors flex items-center gap-1"
          >
            <CornerDownRight className="size-3" />
            Responder
          </button>
        </div>
      </div>

      {/* Respuestas */}
      {comment.replies.length > 0 && (
        <div className="ml-11 flex flex-col gap-3 border-l-2 border-[var(--color-neutral-100)] pl-4">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <AuthorAvatar name={reply.author_name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-[var(--color-neutral-800)]">
                    {reply.author_id === userId ? "Tú" : reply.author_name}
                  </span>
                  <span className="text-xs text-[var(--color-neutral-400)]">
                    {formatRelativeTime(reply.created_at)}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-neutral-700)] mt-0.5 leading-relaxed whitespace-pre-wrap">
                  {reply.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input de respuesta */}
      {replying && (
        <div className="ml-11 relative">
          <Input
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitReply(); } }}
            placeholder="Escribe tu respuesta…"
            disabled={pending}
            autoFocus
            className="pr-10 bg-white"
          />
          <button
            onClick={submitReply}
            disabled={pending || !replyBody.trim()}
            className="absolute right-2 top-1 p-1.5 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}

// ── CommentsTab ───────────────────────────────────────────────────────────────

export function CommentsTab({ lessonId, userId }: { lessonId: string; userId: string }) {
  const [comments, setComments]    = useState<CommentRow[]>([]);
  const [loading, setLoading]      = useState(true);
  const [body, setBody]            = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLoading(true);
    getLessonComments(lessonId)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [lessonId]);

  function submitComment() {
    if (!body.trim()) return;
    startTransition(async () => {
      const result = await postLessonComment(lessonId, body);
      if (result.success) {
        setComments((prev) => [...prev, result.comment]);
        setBody("");
      }
    });
  }

  function handleReplyPosted(parentId: string, reply: CommentRow) {
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId ? { ...c, replies: [...c.replies, reply] } : c
      )
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-96 overflow-y-auto flex flex-col gap-5 pr-1">
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 text-[var(--color-neutral-300)] animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <MessageSquare className="size-6 text-[var(--color-neutral-300)]" />
          <p className="text-sm text-[var(--color-neutral-400)]">Sé el primero en comentar.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 divide-y divide-[var(--color-neutral-100)]">
          {comments.map((c) => (
            <div key={c.id} className="pt-5 first:pt-0">
              <CommentItem
                comment={c}
                userId={userId}
                lessonId={lessonId}
                onReplyPosted={handleReplyPosted}
              />
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Input nuevo comentario */}
      <div className="relative pt-2 border-t border-[var(--color-neutral-100)]">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitComment(); } }}
          placeholder="Escribe un comentario…"
          disabled={pending}
          className="pr-10 bg-white"
        />
        <button
          onClick={submitComment}
          disabled={pending || !body.trim()}
          className="absolute right-2 top-3 p-1.5 rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

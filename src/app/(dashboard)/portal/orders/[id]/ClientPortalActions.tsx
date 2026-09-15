"use client";

import { useState } from "react";
import { clientApproveQuoteAction, clientAddCommentAction } from "./actions";

interface Comment {
  id: number;
  name: string;
  body: string;
  createdAt: Date | string;
}

interface Props {
  orderId: string;
  stage: number;
  showCommentOnly?: boolean;
  comments?: Comment[];
  clientName?: string;
}

export default function ClientPortalActions({
  orderId,
  stage,
  showCommentOnly = false,
  comments = [],
  clientName = "Client",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleApproveQuote = async () => {
    if (!confirm("Approve this quote? This will confirm your order with Arches.")) return;
    setLoading(true);
    try {
      await clientApproveQuoteAction(orderId);
    } catch (err: any) {
      alert(err.message || "Failed to approve quote. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setLoading(true);
    try {
      await clientAddCommentAction(orderId, commentText, clientName);
      setCommentText("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mb-6">
      {/* SPEC §9: Quote approval button — only at Stage 0, not showCommentOnly */}
      {!showCommentOnly && stage === 0 && (
        <div className="bg-stone-900 rounded-md p-6 text-white">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 mb-1">
            Action Required
          </p>
          <h2 className="text-lg font-black mb-2">Approve Your Quote</h2>
          <p className="text-sm text-white/70 mb-4">
            Review the line items and pricing below, then approve to confirm your order with Arches.
          </p>
          <button
            onClick={handleApproveQuote}
            disabled={loading}
            className="px-6 py-3 bg-white text-stone-900 text-[10px] uppercase tracking-[0.18em] font-bold rounded-[2px] hover:bg-stone-100 transition-colors disabled:opacity-50"
          >
            {loading ? "Approving…" : "✓ Approve Quote"}
          </button>
        </div>
      )}

      {/* SPEC §9: Order comment thread */}
      {showCommentOnly && (
        <div className="bg-white rounded-md border border-stone-200">
          <div className="px-6 py-4 border-b border-stone-100">
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">
              Messages
            </p>
          </div>

          {/* Comment list */}
          {comments.length > 0 ? (
            <div className="divide-y divide-stone-100">
              {comments.map((comment) => (
                <div key={comment.id} className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-stone-700">
                      {comment.name}
                    </p>
                    <span className="text-stone-300">·</span>
                    <p className="text-[10px] text-stone-400">
                      {new Date(comment.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <p className="text-sm text-stone-600">{comment.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-[11px] text-stone-300 uppercase tracking-widest">
                No messages yet
              </p>
            </div>
          )}

          {/* Comment composer */}
          <div className="px-6 py-4 border-t border-stone-100 bg-stone-50">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Send a message to Arches…"
              rows={3}
              className="w-full text-sm border border-stone-200 rounded-[2px] p-3 resize-none focus:outline-none focus:border-stone-400 bg-white"
            />
            <div className="flex justify-between items-center mt-2">
              {submitted && (
                <p className="text-[10px] text-emerald-600 uppercase tracking-wider">
                  Message sent ✓
                </p>
              )}
              {!submitted && <span />}
              <button
                onClick={handleSendComment}
                disabled={loading || !commentText.trim()}
                className="px-5 py-2 bg-stone-900 text-white text-[10px] uppercase tracking-[0.14em] rounded-[2px] hover:bg-stone-700 transition-colors disabled:opacity-40"
              >
                {loading ? "Sending…" : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

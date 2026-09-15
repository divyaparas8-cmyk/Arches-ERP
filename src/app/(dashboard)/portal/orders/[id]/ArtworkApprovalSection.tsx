"use client";

import { useState } from "react";
import { clientApproveArtworkAction, clientAddArtworkCommentAction } from "./actions";

interface ArtworkComment {
  id: number;
  name: string;
  body: string;
  createdAt: Date | string;
}

interface Props {
  orderId: string;
  artworkId: number;
  lineId: number;
  skuName: string;
  alreadyApproved: boolean;
  artworkComments: ArtworkComment[];
  clientName: string;
}

export default function ArtworkApprovalSection({
  orderId,
  artworkId,
  skuName,
  alreadyApproved,
  artworkComments,
  clientName,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSent, setCommentSent] = useState(false);
  const [approved, setApproved] = useState(alreadyApproved);

  const handleApprove = async () => {
    if (!confirm(`Approve artwork for ${skuName}? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await clientApproveArtworkAction(orderId, artworkId);
      setApproved(true);
    } catch (err: any) {
      alert(err.message || "Failed to approve artwork. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setLoading(true);
    try {
      await clientAddArtworkCommentAction(orderId, artworkId, commentText, clientName);
      setCommentText("");
      setCommentSent(true);
      setTimeout(() => setCommentSent(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to send comment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Approve button — only if not already approved */}
      {!approved ? (
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="px-5 py-2.5 bg-stone-900 text-white text-[10px] uppercase tracking-[0.18em] font-bold rounded-[2px] hover:bg-stone-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Approving…" : "✓ Approve Artwork"}
          </button>
          <p className="self-center text-[11px] text-stone-400">
            or leave a note below if changes are needed
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 py-2">
          <span className="text-emerald-600 text-sm font-bold">✓</span>
          <p className="text-[11px] text-emerald-700 font-medium uppercase tracking-wider">
            Artwork Approved
          </p>
        </div>
      )}

      {/* Artwork comment thread */}
      {artworkComments.length > 0 && (
        <div className="border border-stone-100 rounded-[2px] divide-y divide-stone-100 mt-2">
          {artworkComments.map((comment) => (
            <div key={comment.id} className="px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-stone-700">
                  {comment.name}
                </p>
                <span className="text-stone-300">·</span>
                <p className="text-[10px] text-stone-400">
                  {new Date(comment.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </p>
              </div>
              <p className="text-sm text-stone-600">{comment.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Artwork comment composer */}
      <div className="mt-2">
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={`Note on ${skuName} artwork (e.g. change requests)…`}
          rows={2}
          className="w-full text-sm border border-stone-200 rounded-[2px] p-3 resize-none focus:outline-none focus:border-stone-400 bg-white text-stone-800"
        />
        <div className="flex justify-between items-center mt-1">
          {commentSent ? (
            <p className="text-[10px] text-emerald-600 uppercase tracking-wider">Note sent ✓</p>
          ) : (
            <span />
          )}
          <button
            onClick={handleSendComment}
            disabled={loading || !commentText.trim()}
            className="px-4 py-2 border border-stone-300 text-stone-700 text-[10px] uppercase tracking-[0.14em] rounded-[2px] hover:bg-stone-50 transition-colors disabled:opacity-40"
          >
            {loading ? "Sending…" : "Send Note"}
          </button>
        </div>
      </div>
    </div>
  );
}

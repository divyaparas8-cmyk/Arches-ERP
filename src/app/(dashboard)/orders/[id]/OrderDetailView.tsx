"use client";

import { useState } from "react";
import Link from "next/link";
import ColorSwatch from "@/components/ColorSwatch";
import StageDots from "@/components/StageDots";
import {
  advanceOrderAction,
  revertOrderAction,
  pushMilestoneAction,
  addCommentAction,
  updateTrackingAction,
  declineOrderAction,
  reopenOrderAction,
} from "./actions";
import { STAGE_ACTIONS, STAGE_NAMES } from "@/lib/stageConstants";
import { orderValue, orderCost, orderMarginPct, blanksRevenue, embsRevenue, PricingOrder } from "@/lib/pricing";

interface OrderDetailViewProps {
  order: any;
}

export default function OrderDetailView({ order }: OrderDetailViewProps) {
  const [loading, setLoading] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [activeReopenStage, setActiveReopenStage] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [carrierInput, setCarrierInput] = useState(order.carrier || "DHL Express");
  const [trackingInput, setTrackingInput] = useState(order.tracking || "");
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  // Map order to PricingOrder for financial calculation
  const pricingOrder: PricingOrder = {
    shippingPence: order.shippingPence ?? 0,
    lines: order.lines.map((l: any) => ({
      qty: l.qty,
      overridePence: l.overridePence,
      blankCostPence: l.blankCostPence,
      blankSellPence: l.blankSellPence,
      sku: { basePence: l.sku.basePence, costPence: l.sku.costPence },
      embellishments: l.embellishments.map((le: any) => ({
        costPence: le.costPence,
        sellPence: le.sellPence,
        emb: { pricePence: le.emb.pricePence, costPence: le.emb.costPence },
      })),
    })),
  };

  const totalValue = orderValue(pricingOrder);
  const totalCost = orderCost(pricingOrder);
  const profit = totalValue - totalCost;
  const marginPct = orderMarginPct(pricingOrder);
  const bRev = blanksRevenue(pricingOrder);
  const eRev = embsRevenue(pricingOrder);
  const totalQty = order.lines.reduce((sum: number, l: any) => sum + l.qty, 0);

  const formatGBP = (pence: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

  const currentAction = STAGE_ACTIONS[order.stage] || STAGE_ACTIONS[0];

  const handleAdvance = async () => {
    setLoading(true);
    try {
      await advanceOrderAction(order.id);
    } catch (err: any) {
      alert(err.message || "Failed to advance stage");
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (targetStage: number) => {
    setLoading(true);
    try {
      await revertOrderAction(order.id, targetStage, reopenReason);
      setActiveReopenStage(null);
      setReopenReason("");
    } catch (err: any) {
      alert(err.message || "Failed to revert stage");
    } finally {
      setLoading(false);
    }
  };

  const handlePushMilestone = async () => {
    setLoading(true);
    try {
      await pushMilestoneAction(order.id);
    } catch (err: any) {
      alert(err.message || "Failed to push milestone");
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (isInternal: boolean) => {
    if (!commentText.trim()) return;
    setLoading(true);
    try {
      await addCommentAction(order.id, commentText, isInternal);
      setCommentText("");
    } catch (err: any) {
      alert(err.message || "Failed to add comment");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTracking = async () => {
    if (!trackingInput.trim()) return;
    setLoading(true);
    try {
      await updateTrackingAction(order.id, carrierInput, trackingInput);
    } catch (err: any) {
      alert(err.message || "Failed to update tracking");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) return;
    setLoading(true);
    try {
      await declineOrderAction(order.id, declineReason);
      setShowDeclineModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to decline order");
    } finally {
      setLoading(false);
    }
  };

  const handleReopenOrder = async () => {
    setLoading(true);
    try {
      await reopenOrderAction(order.id);
    } catch (err: any) {
      alert(err.message || "Failed to reopen order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-[1240px] mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex items-start justify-between pb-6 border-b border-warm-grey">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Link href="/" className="text-[10px] uppercase tracking-[0.14em] text-mid-grey hover:text-near-black">
              &larr; Back to Dashboard
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <h1 className="text-[36px] font-black tracking-tight leading-none">
              {order.client.name}
            </h1>
            <span className="text-[16px] font-mono text-mid-grey font-medium">
              {order.id}
            </span>
          </div>
          <p className="text-[12px] text-mid-grey mt-1">
            Contact: {order.contact || "—"} &middot; {order.weeks} Weeks Lead &middot; Created{" "}
            {new Date(order.createdAt).toLocaleDateString("en-GB")}
          </p>
        </div>

        <div className="flex flex-col items-end space-y-3">
          <StageDots stage={order.stage} status={order.status} />
          {order.status === "declined" && (
            <button
              onClick={handleReopenOrder}
              disabled={loading}
              className="text-[10px] uppercase tracking-[0.18em] bg-near-black text-white px-4 py-2 rounded-[2px]"
            >
              Reopen Order
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-[240px_1fr] gap-8">

        {/* LEFT COLUMN: Lifecycle Rail */}
        <div className="bg-white border border-warm-grey rounded-[2px] p-5 h-fit space-y-6">
          <h2 className="text-[10px] uppercase tracking-[0.18em] text-dark-grey font-medium">
            Lifecycle Stage
          </h2>

          <div className="space-y-4 relative">
            {STAGE_NAMES.map((name, idx) => {
              const isCurrent = order.stage === idx && order.status !== "declined";
              const isPassed = order.stage > idx && order.status !== "declined";

              return (
                <div key={idx} className="relative">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 transition-all ${
                        isCurrent
                          ? "bg-near-black text-white ring-4 ring-black/10"
                          : isPassed
                          ? "bg-near-black text-white"
                          : "bg-warm-grey text-mid-grey"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="pt-0.5">
                      <p
                        className={`text-[12px] font-medium leading-none ${
                          isCurrent ? "text-near-black font-bold" : "text-dark-grey"
                        }`}
                      >
                        {name}
                      </p>
                      {isPassed && order.status !== "declined" && (
                        <button
                          onClick={() => setActiveReopenStage(activeReopenStage === idx ? null : idx)}
                          className="text-[9px] uppercase tracking-[0.14em] text-mid-grey hover:text-near-black underline mt-1 block"
                        >
                          Reopen here
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Reopen Reason Input Box */}
                  {activeReopenStage === idx && (
                    <div className="mt-3 p-3 bg-cream border border-warm-grey rounded-[2px] space-y-2">
                      <p className="text-[9px] uppercase tracking-[0.14em] text-dark-grey">
                        Reason for reopening:
                      </p>
                      <textarea
                        value={reopenReason}
                        onChange={(e) => setReopenReason(e.target.value)}
                        placeholder="Enter reason..."
                        className="w-full text-[11px] p-2 border border-warm-grey rounded-[2px]"
                        rows={2}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRevert(idx)}
                          disabled={loading}
                          className="bg-near-black text-white text-[9px] uppercase tracking-[0.14em] px-3 py-1 rounded-[2px]"
                        >
                          Confirm Reopen
                        </button>
                        <button
                          onClick={() => setActiveReopenStage(null)}
                          className="text-[9px] uppercase tracking-[0.14em] text-mid-grey px-2 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Content */}
        <div className="space-y-8">

          {/* 1. BLACK ACTION CARD */}
          {order.status !== "declined" ? (
            <div className="bg-near-black text-white p-6 rounded-[2px] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-[0.2em] text-white/50">
                  Next Action &middot; Stage {order.stage} of 7
                </span>
                {order.stage === 5 && (
                  <span className="text-[11px] font-mono text-white/70">
                    Progress: {order.progress}%
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-[20px] font-bold tracking-tight">{currentAction.title}</h2>
                <p className="text-[13px] text-white/70 mt-1">{currentAction.desc}</p>
              </div>

              {/* Stage Progress Bar if stage 5 */}
              {order.stage === 5 && (
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-full transition-all duration-300"
                    style={{ width: `${order.progress}%` }}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center space-x-4">
                {order.stage === 5 ? (
                  <button
                    onClick={handlePushMilestone}
                    disabled={loading}
                    className="bg-white text-near-black text-[10px] uppercase tracking-[0.18em] font-medium px-6 py-3 rounded-[2px] hover:bg-white/90 transition-colors"
                  >
                    {order.progress >= 80 ? "Mark Ready for Packing →" : "Push Next 20% Milestone →"}
                  </button>
                ) : order.stage === 7 ? (
                  <div className="flex items-center space-x-3 w-full max-w-md">
                    <input
                      type="text"
                      value={carrierInput}
                      onChange={(e) => setCarrierInput(e.target.value)}
                      placeholder="Carrier"
                      className="bg-white/10 text-white text-[12px] px-3 py-2 border border-white/20 rounded-[2px] w-1/3"
                    />
                    <input
                      type="text"
                      value={trackingInput}
                      onChange={(e) => setTrackingInput(e.target.value)}
                      placeholder="Tracking #"
                      className="bg-white/10 text-white text-[12px] px-3 py-2 border border-white/20 rounded-[2px] flex-1"
                    />
                    <button
                      onClick={handleSaveTracking}
                      disabled={loading}
                      className="bg-white text-near-black text-[10px] uppercase tracking-[0.18em] font-medium px-4 py-2 rounded-[2px]"
                    >
                      Update Tracking
                    </button>
                  </div>
                ) : (
                  currentAction.button && (
                    <button
                      onClick={handleAdvance}
                      disabled={loading}
                      className="bg-white text-near-black text-[10px] uppercase tracking-[0.18em] font-medium px-6 py-3 rounded-[2px] hover:bg-white/90 transition-colors"
                    >
                      {currentAction.button} &rarr;
                    </button>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="bg-red-900/10 border border-red-200 text-red-900 p-6 rounded-[2px]">
              <h2 className="text-[16px] font-bold">Order Declined</h2>
              <p className="text-[13px] mt-1">Reason: {order.declinedReason || "No reason given."}</p>
            </div>
          )}

          {/* 2. FINANCIALS GRID */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white border border-warm-grey rounded-[2px] p-5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-mid-grey mb-1">
                Order Value
              </p>
              <p className="text-[24px] font-bold font-mono tracking-tight">
                {formatGBP(totalValue)}
              </p>
            </div>
            <div className="bg-white border border-warm-grey rounded-[2px] p-5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-mid-grey mb-1">
                Deposit (50%)
              </p>
              <p className="text-[24px] font-bold font-mono tracking-tight text-mid-grey">
                {formatGBP(Math.round(totalValue / 2))}
              </p>
            </div>
            <div className="bg-white border border-warm-grey rounded-[2px] p-5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-mid-grey mb-1">
                Balance + Ship
              </p>
              <p className="text-[24px] font-bold font-mono tracking-tight text-mid-grey">
                {formatGBP(totalValue - Math.round(totalValue / 2))}
              </p>
            </div>
            <div className="bg-white border border-warm-grey rounded-[2px] p-5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-mid-grey mb-1">
                Total Quantity
              </p>
              <p className="text-[24px] font-bold font-mono tracking-tight">
                {totalQty} <span className="text-[12px] font-normal">pcs</span>
              </p>
            </div>
          </div>

          {/* 3. MARGIN STRIP (Internal Only) */}
          <div className="bg-near-black text-white p-5 rounded-[2px]">
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/50 mb-4">
              Margin Analysis &middot; Internal Only
            </p>
            <div className="grid grid-cols-4 gap-[1px] bg-white/10 border border-white/10">
              <div className="bg-near-black p-4">
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/50">Revenue</p>
                <p className="text-[18px] font-mono font-medium mt-1">{formatGBP(totalValue)}</p>
              </div>
              <div className="bg-near-black p-4">
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/50">Vendor Cost</p>
                <p className="text-[18px] font-mono font-medium mt-1">{formatGBP(totalCost)}</p>
              </div>
              <div className="bg-near-black p-4">
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/50">Gross Profit</p>
                <p className="text-[18px] font-mono font-medium mt-1 text-green-400">
                  {formatGBP(profit)}
                </p>
              </div>
              <div className="bg-near-black p-4">
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/50">
                  Blended Margin
                </p>
                <p className="text-[18px] font-mono font-medium mt-1">{marginPct}%</p>
              </div>
            </div>
          </div>

          {/* 4. COST COMPOSITION */}
          <div className="bg-white border border-warm-grey rounded-[2px] p-6 space-y-4">
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-dark-grey font-medium">
              Cost &amp; Revenue Composition
            </h2>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between text-[12px]">
                  <span>Blanks Revenue</span>
                  <span className="font-mono font-medium">{formatGBP(bRev)}</span>
                </div>
                <div className="w-full bg-warm-grey h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-near-black h-full"
                    style={{ width: `${totalValue > 0 ? (bRev / totalValue) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[12px]">
                  <span>Embellishments Revenue</span>
                  <span className="font-mono font-medium">{formatGBP(eRev)}</span>
                </div>
                <div className="w-full bg-warm-grey h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-near-black h-full"
                    style={{ width: `${totalValue > 0 ? (eRev / totalValue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 5. LINE ITEMS CARD */}
          <div className="bg-white border border-warm-grey rounded-[2px] p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] uppercase tracking-[0.18em] text-dark-grey font-medium">
                Line Items ({order.lines.length})
              </h2>
            </div>

            <div className="divide-y divide-warm-grey">
              {order.lines.map((line: any) => {
                const unitPrice =
                  line.overridePence ??
                  line.sku.basePence +
                    line.embellishments.reduce(
                      (s: number, e: any) => s + e.emb.pricePence,
                      0
                    );
                const lineTotal = unitPrice * line.qty;

                return (
                  <div key={line.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <ColorSwatch hex={line.color.hex} name={line.color.name} size={18} />
                        <div>
                          <p className="text-[14px] font-bold">{line.sku.name}</p>
                          <p className="text-[11px] text-mid-grey">
                            {line.sku.code} &middot; {line.color.name} ({line.color.code})
                          </p>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <p className="text-[15px] font-bold">{formatGBP(lineTotal)}</p>
                        <p className="text-[11px] text-mid-grey">
                          {line.qty} pcs &times; {formatGBP(unitPrice)}/pc
                        </p>
                      </div>
                    </div>

                    {/* Embellishments */}
                    {line.embellishments.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {line.embellishments.map((e: any) => (
                          <span
                            key={e.id}
                            className="bg-cream border border-warm-grey text-[10px] px-2 py-0.5 rounded-[2px] font-mono"
                          >
                            {e.emb.name} (+{formatGBP(e.emb.pricePence)})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. COMMENTS & NOTES */}
          <div className="bg-white border border-warm-grey rounded-[2px] p-6 space-y-6">
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-dark-grey font-medium">
              Client &amp; Internal Thread ({order.comments.length})
            </h2>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {order.comments.map((c: any) => (
                <div
                  key={c.id}
                  className={`p-4 rounded-[2px] ${
                    c.who === "internal"
                      ? "bg-near-black text-white ml-8"
                      : "bg-cream border border-warm-grey mr-8 text-near-black"
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.14em] mb-1 opacity-70">
                    <span>{c.name} ({c.who})</span>
                    <span>{new Date(c.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="text-[13px]">{c.body}</p>
                </div>
              ))}
              {order.comments.length === 0 && (
                <p className="text-[12px] text-mid-grey text-center py-4">
                  No notes or comments yet.
                </p>
              )}
            </div>

            {/* Comment Composer */}
            <div className="pt-4 border-t border-warm-grey space-y-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Type a message or internal note..."
                className="w-full text-[12px] p-3 border border-warm-grey rounded-[2px]"
                rows={2}
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => handleAddComment(false)}
                  disabled={loading}
                  className="bg-cream border border-warm-grey text-near-black text-[9px] uppercase tracking-[0.14em] px-4 py-2 rounded-[2px]"
                >
                  Post Client Message
                </button>
                <button
                  onClick={() => handleAddComment(true)}
                  disabled={loading}
                  className="bg-near-black text-white text-[9px] uppercase tracking-[0.14em] px-4 py-2 rounded-[2px]"
                >
                  Post Internal Note
                </button>
              </div>
            </div>
          </div>

          {/* 7. ACTIVITY LOG */}
          <div className="bg-white border border-warm-grey rounded-[2px] p-6 space-y-4">
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-dark-grey font-medium">
              Activity History
            </h2>

            <div className="divide-y divide-warm-grey text-[12px]">
              {order.activityLogs.map((log: any) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-[10px] bg-warm-grey px-2 py-0.5 rounded-[2px]">
                      {log.who}
                    </span>
                    <span className="text-near-black">{log.body}</span>
                  </div>
                  <span className="text-mid-grey text-[10px]">
                    {new Date(log.createdAt).toLocaleString("en-GB")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 8. DANGER ZONE */}
          {order.status !== "declined" && (
            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setShowDeclineModal(true)}
                className="text-[10px] uppercase tracking-[0.18em] text-red-600 hover:text-red-800 underline"
              >
                Decline Order
              </button>
            </div>
          )}

          {/* Decline Modal */}
          {showDeclineModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white p-6 rounded-[2px] max-w-md w-full space-y-4">
                <h3 className="text-[16px] font-bold">Decline Order {order.id}</h3>
                <p className="text-[12px] text-mid-grey">
                  Please provide a reason for declining this order.
                </p>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Reason for declining..."
                  className="w-full text-[12px] p-3 border border-warm-grey rounded-[2px]"
                  rows={3}
                />
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeclineModal(false)}
                    className="text-[10px] uppercase tracking-[0.14em] text-mid-grey px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDecline}
                    disabled={loading}
                    className="bg-red-600 text-white text-[10px] uppercase tracking-[0.14em] px-4 py-2 rounded-[2px]"
                  >
                    Confirm Decline
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

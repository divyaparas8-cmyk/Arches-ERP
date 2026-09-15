"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "./actions";
import {
  blankSell, embSell, unitSell, lineTotal, blankCost, embCost, unitCost,
  marginPct, sellFromCost,
} from "@/lib/pricing";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client { id: number; name: string; contact: string | null; }
interface Vendor { id: number; name: string; }
interface SkuType {
  code: string; name: string; cat: string; gsm: string; brand: string;
  basePence: number; costPence: number; vendor: Vendor | null; vendorId: number | null;
}
interface Colorway { code: string; name: string; hex: string; }
interface EmbellishmentType {
  code: string; name: string; pricePence: number; costPence: number;
  vendor: Vendor | null; vendorId: number | null;
}

interface EmbOverride {
  vendorId: number | null;
  costPence: number;
  sellPence: number;
}

interface QuoteLine {
  id: string;
  skuCode: string;
  colorCode: string;
  qty: number;
  embCodes: string[];
  overridePence: number | null;
  blankVendorId: number | null;
  blankCostPence: number | null;
  blankSellPence: number | null;
  embOverrides: Record<string, EmbOverride>;
}

interface Props {
  clients: Client[];
  skus: SkuType[];
  colorways: Colorway[];
  embellishments: EmbellishmentType[];
  vendors: Vendor[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatGBP = (pence: number, decimals = 2) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency", currency: "GBP",
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(pence / 100);

const uid = () => Math.random().toString(36).slice(2, 9);

const SKU_CATEGORIES = ["T-Shirts", "Sweats", "Bottoms", "Bags", "Headwear", "Outerwear", "Accessories"] as const;

interface NewSkuFormState {
  code: string; name: string; cat: string; gsm: string;
  brand: string; vendorId: string; costPence: string; basePence: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuoteBuilder({ clients, skus, colorways, embellishments, vendors }: Props) {
  const router = useRouter();

  // ── Quote-level state ──
  const [clientId, setClientId] = useState<number | null>(null);
  const [contact, setContact] = useState("");
  const [weeks, setWeeks] = useState(6);

  // ── Lines state ──
  const [lines, setLines] = useState<QuoteLine[]>([]);

  // ── Current line being built ──
  const [curSkuCode, setCurSkuCode] = useState("");
  const [curColorCode, setCurColorCode] = useState("");
  const [curQty, setCurQty] = useState(1);
  const [curEmbCodes, setCurEmbCodes] = useState<string[]>([]);
  const [curOverridePence, setCurOverridePence] = useState<number | null>(null);
  const [curOverrideInput, setCurOverrideInput] = useState("");
  const [curBlankVendorId, setCurBlankVendorId] = useState<number | null>(null);
  const [curBlankCostPence, setCurBlankCostPence] = useState<number | null>(null);
  const [curBlankSellPence, setCurBlankSellPence] = useState<number | null>(null);
  const [curEmbOverrides, setCurEmbOverrides] = useState<Record<string, EmbOverride>>({});
  const [saveToCatalog, setSaveToCatalog] = useState(false);
  const [targetMargin, setTargetMargin] = useState(55);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showNewSku, setShowNewSku] = useState(false);
  const [newSkuForm, setNewSkuForm] = useState<NewSkuFormState>({ code: "", name: "", cat: "T-Shirts", gsm: "", brand: "", vendorId: "", costPence: "", basePence: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Derived ──
  const curSku = useMemo(() => skus.find(s => s.code === curSkuCode) ?? null, [skus, curSkuCode]);
  const curColor = useMemo(() => colorways.find(c => c.code === curColorCode) ?? null, [colorways, curColorCode]);

  // Build a PricingLine for the current line being edited (for live display)
  const curPricingLine = useMemo(() => {
    if (!curSku) return null;
    return {
      qty: curQty,
      overridePence: curOverridePence,
      blankCostPence: curBlankCostPence,
      blankSellPence: curBlankSellPence,
      sku: { basePence: curSku.basePence, costPence: curSku.costPence },
      embellishments: curEmbCodes.map(code => {
        const emb = embellishments.find(e => e.code === code)!;
        const ov = curEmbOverrides[code];
        return {
          costPence: ov?.costPence ?? null,
          sellPence: ov?.sellPence ?? null,
          emb: { pricePence: emb.pricePence, costPence: emb.costPence },
        };
      }),
    };
  }, [curSku, curQty, curOverridePence, curBlankCostPence, curBlankSellPence, curEmbCodes, curEmbOverrides, embellishments]);

  // Build PricingLines for finalized lines
  const pricingLines = useMemo(() =>
    lines.map(line => {
      const sku = skus.find(s => s.code === line.skuCode)!;
      return {
        qty: line.qty,
        overridePence: line.overridePence,
        blankCostPence: line.blankCostPence,
        blankSellPence: line.blankSellPence,
        sku: { basePence: sku.basePence, costPence: sku.costPence },
        embellishments: line.embCodes.map(code => {
          const emb = embellishments.find(e => e.code === code)!;
          const ov = line.embOverrides[code];
          return {
            costPence: ov?.costPence ?? null,
            sellPence: ov?.sellPence ?? null,
            emb: { pricePence: emb.pricePence, costPence: emb.costPence },
          };
        }),
      };
    }),
  [lines, skus, embellishments]);

  const subtotalPence = useMemo(() =>
    pricingLines.reduce((acc, l) => acc + lineTotal(l), 0),
  [pricingLines]);

  // ── Handlers ──

  const handleToggleEmb = (code: string) => {
    setCurEmbCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleEmbOverrideChange = (code: string, field: keyof EmbOverride, value: number | null) => {
    setCurEmbOverrides(prev => {
      const emb = embellishments.find(e => e.code === code)!;
      const existing = prev[code] ?? { vendorId: null, costPence: emb.costPence, sellPence: emb.pricePence };
      return { ...prev, [code]: { ...existing, [field]: value } };
    });
  };

  const handleReprice = () => {
    if (!curSku) return;
    const newBlankSell = sellFromCost(curBlankCostPence ?? curSku.costPence, targetMargin);
    setCurBlankSellPence(newBlankSell);
    const newEmbOvs = { ...curEmbOverrides };
    for (const code of curEmbCodes) {
      const emb = embellishments.find(e => e.code === code)!;
      const existing = curEmbOverrides[code];
      const cost = existing?.costPence ?? emb.costPence;
      const newSell = sellFromCost(cost, targetMargin);
      newEmbOvs[code] = { ...(existing ?? { vendorId: null, costPence: cost }), sellPence: newSell };
    }
    setCurEmbOverrides(newEmbOvs);
  };

  const handleAddLine = () => {
    if (!curSkuCode || !curColorCode || curQty < 1) return;
    setLines(prev => [...prev, {
      id: uid(),
      skuCode: curSkuCode,
      colorCode: curColorCode,
      qty: curQty,
      embCodes: curEmbCodes,
      overridePence: curOverridePence,
      blankVendorId: curBlankVendorId,
      blankCostPence: curBlankCostPence,
      blankSellPence: curBlankSellPence,
      embOverrides: curEmbOverrides,
    }]);
    // Reset current line form
    setCurSkuCode(""); setCurColorCode(""); setCurQty(1);
    setCurEmbCodes([]); setCurOverridePence(null); setCurOverrideInput("");
    setCurBlankVendorId(null); setCurBlankCostPence(null); setCurBlankSellPence(null);
    setCurEmbOverrides({}); setPanelOpen(false);
  };

  const handleRemoveLine = (id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const handleCreate = async () => {
    if (!clientId || !contact || lines.length === 0) {
      setError("Client, contact, and at least one line are required.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const orderId = await createOrder({
        clientId,
        contact,
        weeks,
        lines: lines.map(line => ({
          skuCode: line.skuCode,
          colorCode: line.colorCode,
          qty: line.qty,
          embCodes: line.embCodes,
          overridePence: line.overridePence,
          blankVendorId: line.blankVendorId,
          blankCostPence: line.blankCostPence,
          blankSellPence: line.blankSellPence,
          embOverrides: Object.entries(line.embOverrides).map(([embCode, ov]) => ({
            embCode,
            vendorId: ov.vendorId,
            costPence: ov.costPence,
            sellPence: ov.sellPence,
          })),
        })),
      });
      router.push(`/orders/${orderId}`);
    } catch (err: any) {
      setError(err.message ?? "Failed to create order");
      setIsSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      <h1 className="text-[10px] uppercase tracking-[0.18em] text-dark-grey mb-8">New Quote</h1>

      <div className="grid gap-8" style={{ gridTemplateColumns: "1.15fr 0.85fr", maxWidth: "1180px" }}>

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6">

          {/* Client & Timeline */}
          <div className="bg-white border border-warm-grey rounded-[2px] p-6">
            <h2 className="text-[10px] uppercase tracking-[0.14em] text-mid-grey mb-4">Client &amp; Timeline</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.12em] text-mid-grey mb-1.5">Client</label>
                <select
                  value={clientId ?? ""}
                  onChange={e => {
                    const id = parseInt(e.target.value);
                    setClientId(id || null);
                    const cl = clients.find(c => c.id === id);
                    setContact(cl?.contact ?? "");
                  }}
                  className="w-full border border-warm-grey px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-black rounded-[2px]"
                >
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.12em] text-mid-grey mb-1.5">Contact</label>
                <input
                  type="text"
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  placeholder="Named contact"
                  className="w-full border border-warm-grey px-3 py-2 text-[13px] focus:outline-none focus:border-black rounded-[2px]"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.12em] text-mid-grey mb-1.5">Delivery Weeks</label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={weeks}
                  onChange={e => setWeeks(parseInt(e.target.value) || 6)}
                  className="w-full border border-warm-grey px-3 py-2 text-[13px] focus:outline-none focus:border-black rounded-[2px]"
                />
              </div>
            </div>
          </div>

          {/* Add Line Item */}
          <div className="bg-white border border-warm-grey rounded-[2px]">
            <div className="p-6 border-b border-warm-grey">
              <h2 className="text-[10px] uppercase tracking-[0.14em] text-mid-grey mb-4">Add Line Item</h2>

              {/* SKU Select + New SKU toggle */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] uppercase tracking-[0.12em] text-mid-grey">Style / SKU</label>
                  <button
                    onClick={() => setShowNewSku(v => !v)}
                    className="text-[10px] uppercase tracking-[0.12em] text-mid-grey hover:text-black transition-colors"
                  >
                    {showNewSku ? "↑ Cancel" : "+ New SKU"}
                  </button>
                </div>

                {showNewSku ? (
                  <NewSkuForm
                    vendors={vendors}
                    form={newSkuForm}
                    setForm={setNewSkuForm}
                    onCreated={(code) => { setCurSkuCode(code); setShowNewSku(false); }}
                  />
                ) : (
                  <select
                    value={curSkuCode}
                    onChange={e => {
                      setCurSkuCode(e.target.value);
                      const sku = skus.find(s => s.code === e.target.value);
                      if (sku) {
                        setCurBlankCostPence(null);
                        setCurBlankSellPence(null);
                        setCurBlankVendorId(sku.vendorId);
                      }
                    }}
                    className="w-full border border-warm-grey px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-black rounded-[2px]"
                  >
                    <option value="">Select SKU…</option>
                    {skus.map(s => (
                      <option key={s.code} value={s.code}>{s.code} — {s.name} ({s.brand})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Colorway select with swatch */}
              <div className="mb-4">
                <label className="block text-[10px] uppercase tracking-[0.12em] text-mid-grey mb-1.5">Colorway</label>
                <div className="relative">
                  {curColor && (
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-black/10 flex-shrink-0 z-10"
                      style={{ backgroundColor: curColor.hex }}
                    />
                  )}
                  <select
                    value={curColorCode}
                    onChange={e => setCurColorCode(e.target.value)}
                    className={`w-full border border-warm-grey py-2 pr-3 text-[13px] bg-white focus:outline-none focus:border-black rounded-[2px] ${curColor ? "pl-9" : "pl-3"}`}
                  >
                    <option value="">Select colorway…</option>
                    {colorways.map(c => (
                      <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Qty */}
              <div className="mb-5">
                <label className="block text-[10px] uppercase tracking-[0.12em] text-mid-grey mb-1.5">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={curQty}
                  onChange={e => setCurQty(parseInt(e.target.value) || 1)}
                  className="w-32 border border-warm-grey px-3 py-2 text-[13px] focus:outline-none focus:border-black rounded-[2px]"
                />
              </div>

              {/* Embellishment chips 2-up grid */}
              {embellishments.length > 0 && (
                <div className="mb-5">
                  <label className="block text-[10px] uppercase tracking-[0.12em] text-mid-grey mb-2">Embellishments</label>
                  <div className="grid grid-cols-2 gap-2">
                    {embellishments.map(emb => {
                      const selected = curEmbCodes.includes(emb.code);
                      return (
                        <button
                          key={emb.code}
                          type="button"
                          onClick={() => handleToggleEmb(emb.code)}
                          className={`flex items-center justify-between px-3 py-2.5 border text-[12px] rounded-[2px] transition-all ${
                            selected
                              ? "bg-near-black text-white border-near-black"
                              : "bg-white text-near-black border-warm-grey hover:border-near-black/40"
                          }`}
                        >
                          <span>{emb.name}</span>
                          <span className={selected ? "text-white/70" : "text-mid-grey"}>
                            +{formatGBP(emb.pricePence)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Cost & Margin Panel */}
            {curSku && curPricingLine && (
              <div>
                {/* Black header bar */}
                <button
                  type="button"
                  onClick={() => setPanelOpen(v => !v)}
                  className="w-full bg-near-black text-white px-6 py-3.5 flex items-center justify-between text-[12px] hover:bg-black/90 transition-colors"
                >
                  <span className="uppercase tracking-[0.12em] text-white/60 text-[10px]">Cost &amp; Margin</span>
                  <span className="font-medium">
                    Cost {formatGBP(unitCost(curPricingLine))} · Sell {formatGBP(unitSell(curPricingLine))} · {marginPct(unitSell(curPricingLine), unitCost(curPricingLine))}%
                  </span>
                  <span className="text-white/50">{panelOpen ? "▲" : "▼"}</span>
                </button>

                {panelOpen && (
                  <div className="p-6 bg-[#F4F2EE] border-b border-warm-grey space-y-5">
                    {/* Save preference */}
                    <div className="flex items-center gap-4 text-[12px]">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-mid-grey">Apply to:</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="saveScope" checked={!saveToCatalog} onChange={() => setSaveToCatalog(false)} />
                        <span>This quote only</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="saveScope" checked={saveToCatalog} onChange={() => setSaveToCatalog(true)} />
                        <span>Save to catalog</span>
                      </label>
                    </div>

                    {/* Blank row */}
                    <ComponentRow
                      label={`Blank — ${curSku.name}`}
                      vendors={vendors}
                      vendorId={curBlankVendorId}
                      costPence={curBlankCostPence ?? curSku.costPence}
                      sellPence={curBlankSellPence ?? curSku.basePence}
                      onVendorChange={setBlankVendorId => setCurBlankVendorId(setBlankVendorId)}
                      onCostChange={v => setCurBlankCostPence(v)}
                      onSellChange={v => setCurBlankSellPence(v)}
                    />

                    {/* Per-embellishment rows */}
                    {curEmbCodes.map(code => {
                      const emb = embellishments.find(e => e.code === code)!;
                      const ov = curEmbOverrides[code];
                      return (
                        <ComponentRow
                          key={code}
                          label={emb.name}
                          vendors={vendors}
                          vendorId={ov?.vendorId ?? null}
                          costPence={ov?.costPence ?? emb.costPence}
                          sellPence={ov?.sellPence ?? emb.pricePence}
                          onVendorChange={v => handleEmbOverrideChange(code, "vendorId", v)}
                          onCostChange={v => handleEmbOverrideChange(code, "costPence", v ?? emb.costPence)}
                          onSellChange={v => handleEmbOverrideChange(code, "sellPence", v ?? emb.pricePence)}
                        />
                      );
                    })}

                    {/* Target-margin reprice */}
                    <div className="flex items-center gap-3 pt-2 border-t border-warm-grey">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-mid-grey">Reprice at target</span>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={targetMargin}
                        onChange={e => setTargetMargin(parseInt(e.target.value) || 55)}
                        className="w-16 border border-warm-grey px-2 py-1 text-[13px] text-center focus:outline-none focus:border-black rounded-[2px]"
                      />
                      <span className="text-[13px]">%</span>
                      <button
                        type="button"
                        onClick={handleReprice}
                        className="bg-near-black text-white px-3 py-1 text-[11px] uppercase tracking-[0.1em] rounded-[2px] hover:bg-black transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}

                {/* Unit build-up */}
                <div className="px-6 py-4 bg-white border-b border-warm-grey">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-mid-grey mb-3">Unit build-up</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-mid-grey">Blank — {curSku.name}</span>
                      <div className="flex gap-4">
                        <span className="text-mid-grey text-[11px]">cost {formatGBP(curBlankCostPence ?? curSku.costPence)}</span>
                        <span>{formatGBP(curBlankSellPence ?? curSku.basePence)}</span>
                      </div>
                    </div>
                    {curEmbCodes.map(code => {
                      const emb = embellishments.find(e => e.code === code)!;
                      const ov = curEmbOverrides[code];
                      const cost = ov?.costPence ?? emb.costPence;
                      const sell = ov?.sellPence ?? emb.pricePence;
                      return (
                        <div key={code} className="flex justify-between text-[13px]">
                          <span className="text-mid-grey">{emb.name}</span>
                          <div className="flex gap-4">
                            <span className="text-mid-grey text-[11px]">cost {formatGBP(cost)}</span>
                            <span>+{formatGBP(sell)}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="border-t border-warm-grey pt-2 mt-2 flex justify-between font-medium text-[14px]">
                      <span>Unit total</span>
                      <span>{formatGBP(unitSell(curPricingLine))}</span>
                    </div>
                  </div>

                  {/* Sell override */}
                  <div className="mt-4 flex items-center gap-3">
                    <label className="text-[10px] uppercase tracking-[0.12em] text-mid-grey whitespace-nowrap">Override unit sell</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-mid-grey text-[13px]">£</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={curOverrideInput}
                        placeholder={formatGBP(unitSell(curPricingLine)).replace("£", "")}
                        onChange={e => {
                          setCurOverrideInput(e.target.value);
                          const v = parseFloat(e.target.value);
                          setCurOverridePence(isNaN(v) ? null : Math.round(v * 100));
                        }}
                        className="w-28 pl-5 pr-2 py-1.5 border border-warm-grey text-[13px] focus:outline-none focus:border-black rounded-[2px]"
                      />
                    </div>
                    {curOverridePence !== null && (
                      <button onClick={() => { setCurOverridePence(null); setCurOverrideInput(""); }} className="text-[11px] text-mid-grey hover:text-black">
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Line estimate */}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-mid-grey">
                      Line estimate ({curQty} × {formatGBP(curOverridePence ?? unitSell(curPricingLine))})
                    </span>
                    <span className="font-medium">{formatGBP(lineTotal(curPricingLine))}</span>
                  </div>
                </div>

                {/* Add line button */}
                <div className="p-4 bg-white">
                  <button
                    type="button"
                    onClick={handleAddLine}
                    disabled={!curSkuCode || !curColorCode}
                    className="w-full bg-near-black text-white py-2.5 text-[12px] uppercase tracking-[0.14em] rounded-[2px] hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add line →
                  </button>
                </div>
              </div>
            )}

            {(!curSku) && curSkuCode === "" && (
              <div className="px-6 pb-6 pt-2 text-[12px] text-mid-grey italic">
                Select a SKU above to configure this line.
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: Sticky Summary ── */}
        <div className="relative">
          <div className="sticky top-8 space-y-4">
            <div className="bg-white border border-warm-grey rounded-[2px] overflow-hidden">
              <div className="px-6 py-4 border-b border-warm-grey">
                <h2 className="text-[10px] uppercase tracking-[0.14em] text-mid-grey">Quote Summary</h2>
              </div>

              {lines.length === 0 ? (
                <div className="px-6 py-10 text-center text-[12px] text-mid-grey">
                  No lines yet. Add a line to start your quote.
                </div>
              ) : (
                <div className="divide-y divide-warm-grey">
                  {lines.map((line, idx) => {
                    const sku = skus.find(s => s.code === line.skuCode)!;
                    const color = colorways.find(c => c.code === line.colorCode)!;
                    const pl = pricingLines[idx];
                    return (
                      <SummaryLine
                        key={line.id}
                        line={line}
                        sku={sku}
                        color={color}
                        pricingLine={pl}
                        embellishments={embellishments}
                        onRemove={() => handleRemoveLine(line.id)}
                        formatGBP={formatGBP}
                      />
                    );
                  })}
                </div>
              )}

              {/* Subtotal + Create */}
              <div className="px-6 py-5 bg-[#F4F2EE] border-t border-warm-grey">
                <div className="flex items-baseline justify-between mb-5">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-mid-grey">Subtotal</span>
                  <span className="text-[28px] font-black leading-none">{formatGBP(subtotalPence, 0)}</span>
                </div>
                {error && (
                  <p className="text-red-600 text-[12px] mb-3">{error}</p>
                )}
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isSaving || lines.length === 0 || !clientId || !contact}
                  className="w-full bg-near-black text-white py-3.5 text-[12px] uppercase tracking-[0.14em] rounded-[2px] hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Creating…" : "Create quote & open order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ComponentRow ─────────────────────────────────────────────────────────────

function ComponentRow({
  label, vendors, vendorId, costPence, sellPence,
  onVendorChange, onCostChange, onSellChange,
}: {
  label: string;
  vendors: Vendor[];
  vendorId: number | null;
  costPence: number;
  sellPence: number;
  onVendorChange: (id: number | null) => void;
  onCostChange: (v: number | null) => void;
  onSellChange: (v: number | null) => void;
}) {
  const margin = marginPct(sellPence, costPence);
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium text-near-black">{label}</div>
      <div className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2 items-center">
        <select
          value={vendorId ?? ""}
          onChange={e => onVendorChange(e.target.value ? parseInt(e.target.value) : null)}
          className="border border-warm-grey px-2 py-1.5 text-[12px] bg-white rounded-[2px] focus:outline-none focus:border-black"
        >
          <option value="">Vendor…</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-mid-grey text-[12px]">£</span>
          <input
            type="number" step="0.01" min="0"
            value={(costPence / 100).toFixed(2)}
            onChange={e => onCostChange(Math.round(parseFloat(e.target.value || "0") * 100))}
            className="w-full pl-5 pr-1 py-1.5 border border-warm-grey text-[12px] text-right rounded-[2px] focus:outline-none focus:border-black"
          />
        </div>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-mid-grey text-[12px]">£</span>
          <input
            type="number" step="0.01" min="0"
            value={(sellPence / 100).toFixed(2)}
            onChange={e => onSellChange(Math.round(parseFloat(e.target.value || "0") * 100))}
            className="w-full pl-5 pr-1 py-1.5 border border-warm-grey text-[12px] text-right rounded-[2px] focus:outline-none focus:border-black"
          />
        </div>
        <div className="text-[11px] text-mid-grey text-right">{margin}%</div>
      </div>
    </div>
  );
}

// ─── NewSkuForm ───────────────────────────────────────────────────────────────


function NewSkuForm({
  vendors, form, setForm, onCreated,
}: {
  vendors: Vendor[];
  form: NewSkuFormState;
  setForm: (f: NewSkuFormState) => void;
  onCreated: (code: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.code || !form.name || !form.brand || !form.costPence || !form.basePence) {
      setErr("Code, name, brand, cost and base sell are required."); return;
    }
    setSaving(true);
    setErr(null);
    try {
      const { addSku } = await import("@/app/(dashboard)/catalog/actions");
      await addSku({
        code: form.code.toUpperCase(),
        name: form.name,
        cat: form.cat,
        gsm: form.gsm || "—",
        brand: form.brand,
        vendorId: form.vendorId ? parseInt(form.vendorId) : undefined,
        costPence: Math.round(parseFloat(form.costPence) * 100),
        basePence: Math.round(parseFloat(form.basePence) * 100),
      });
      onCreated(form.code.toUpperCase());
    } catch (e: any) {
      setErr(e.message ?? "Error saving SKU");
    } finally {
      setSaving(false);
    }
  };

  const f = (k: keyof NewSkuFormState, v: string) => setForm({ ...form, [k]: v });

  return (
    <div className="border border-warm-grey p-4 rounded-[2px] space-y-3 bg-[#F4F2EE]">
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="SKU Code *" value={form.code} onChange={e => f("code", e.target.value)} className="border border-warm-grey px-2 py-1.5 text-[13px] rounded-[2px] focus:outline-none focus:border-black" />
        <input placeholder="Name *" value={form.name} onChange={e => f("name", e.target.value)} className="border border-warm-grey px-2 py-1.5 text-[13px] rounded-[2px] focus:outline-none focus:border-black" />
        <select value={form.cat} onChange={e => f("cat", e.target.value)} className="border border-warm-grey px-2 py-1.5 text-[13px] bg-white rounded-[2px] focus:outline-none focus:border-black">
          {SKU_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="GSM" value={form.gsm} onChange={e => f("gsm", e.target.value)} className="border border-warm-grey px-2 py-1.5 text-[13px] rounded-[2px] focus:outline-none focus:border-black" />
        <input placeholder="Brand *" value={form.brand} onChange={e => f("brand", e.target.value)} className="border border-warm-grey px-2 py-1.5 text-[13px] rounded-[2px] focus:outline-none focus:border-black" />
        <select value={form.vendorId} onChange={e => f("vendorId", e.target.value)} className="border border-warm-grey px-2 py-1.5 text-[13px] bg-white rounded-[2px] focus:outline-none focus:border-black">
          <option value="">No vendor</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-mid-grey text-[13px]">£</span>
          <input type="number" step="0.01" placeholder="Cost *" value={form.costPence} onChange={e => f("costPence", e.target.value)} className="w-full pl-5 pr-2 py-1.5 border border-warm-grey text-[13px] text-right rounded-[2px] focus:outline-none focus:border-black" />
        </div>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-mid-grey text-[13px]">£</span>
          <input type="number" step="0.01" placeholder="Base Sell *" value={form.basePence} onChange={e => f("basePence", e.target.value)} className="w-full pl-5 pr-2 py-1.5 border border-warm-grey text-[13px] text-right rounded-[2px] focus:outline-none focus:border-black" />
        </div>
      </div>
      {err && <p className="text-red-600 text-[11px]">{err}</p>}
      <button onClick={handleSave} disabled={saving} className="bg-near-black text-white px-4 py-2 text-[12px] rounded-[2px] hover:bg-black transition-colors disabled:opacity-50">
        {saving ? "Saving…" : "Save to catalog & select"}
      </button>
    </div>
  );
}

// ─── SummaryLine ──────────────────────────────────────────────────────────────

function SummaryLine({
  line, sku, color, pricingLine, embellishments, onRemove, formatGBP,
}: {
  line: QuoteLine;
  sku: SkuType;
  color: Colorway;
  pricingLine: ReturnType<typeof Object.create>;
  embellishments: EmbellishmentType[];
  onRemove: () => void;
  formatGBP: (p: number, d?: number) => string;
}) {
  const [expanded, setExpanded] = useState(true);
  const total = lineTotal(pricingLine);
  const cost = unitCost(pricingLine);
  const sell = unitSell(pricingLine);
  const margin = marginPct(sell, cost);

  return (
    <div className="px-6 py-4">
      {/* Line header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border border-black/10 flex-shrink-0" style={{ backgroundColor: color.hex }} />
            <span className="text-[14px] font-medium">{sku.name}</span>
          </div>
          <div className="text-[11px] text-mid-grey mt-0.5 ml-5">
            {color.code} · {line.qty} pcs · {formatGBP(sell)} / unit
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-medium">{formatGBP(total, 0)}</div>
          <button onClick={onRemove} className="text-[10px] text-mid-grey hover:text-red-600 transition-colors mt-0.5">
            Remove
          </button>
        </div>
      </div>

      {/* Build-up */}
      <div className="ml-5 border-t border-warm-grey pt-2 mt-2 space-y-1">
        {/* Blank */}
        <div className="flex justify-between text-[11px]">
          <span className="text-mid-grey">Blank</span>
          <div className="flex gap-3">
            <span className="text-mid-grey">cost {formatGBP(blankCost(pricingLine))}</span>
            <span>{formatGBP(blankSell(pricingLine))}</span>
          </div>
        </div>
        {/* Embellishments */}
        {line.embCodes.map(code => {
          const emb = embellishments.find(e => e.code === code)!;
          const ov = line.embOverrides[code];
          const embPl = {
            costPence: ov?.costPence ?? null,
            sellPence: ov?.sellPence ?? null,
            emb: { pricePence: emb.pricePence, costPence: emb.costPence },
          };
          return (
            <div key={code} className="flex justify-between text-[11px]">
              <span className="text-mid-grey">{emb.name}</span>
              <div className="flex gap-3">
                <span className="text-mid-grey">cost {formatGBP(embCost(embPl))}</span>
                <span>+{formatGBP(embSell(embPl))}</span>
              </div>
            </div>
          );
        })}
        {/* Cost/Margin row */}
        <div className="flex justify-between text-[10px] text-mid-grey pt-1 border-t border-warm-grey/60 mt-1">
          <span>Cost {formatGBP(cost)} · Margin {margin}%</span>
          {line.overridePence !== null && (
            <span className="italic">override applied</span>
          )}
        </div>
      </div>
    </div>
  );
}

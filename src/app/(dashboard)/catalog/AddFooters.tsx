"use client";

import { useState } from "react";
import { addSku, addEmb, addColorway } from "./actions";

interface Vendor {
  id: number;
  name: string;
}

export function AddSkuFooter({ vendors }: { vendors: Vendor[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) {
    return (
      <div 
        className="bg-[#F4F2EE] border-t border-warm-grey px-5 py-3 text-[12px] text-mid-grey hover:text-near-black cursor-pointer transition-colors"
        onClick={() => setIsOpen(true)}
      >
        + Add Style
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await addSku({
        code: fd.get("code") as string,
        name: fd.get("name") as string,
        cat: fd.get("cat") as string,
        gsm: fd.get("gsm") as string,
        brand: fd.get("brand") as string,
        vendorId: fd.get("vendorId") ? parseInt(fd.get("vendorId") as string) : undefined,
        costPence: Math.round(parseFloat(fd.get("cost") as string) * 100),
        basePence: Math.round(parseFloat(fd.get("base") as string) * 100),
      });
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      alert("Error adding SKU. Please check the code is unique.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#F4F2EE] border-t border-warm-grey p-5">
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <input name="code" placeholder="SKU Code" required className="border px-2 py-1 text-[13px] w-24" />
        <input name="name" placeholder="Name" required className="border px-2 py-1 text-[13px] flex-1" />
        <select name="cat" className="border px-2 py-1 text-[13px] w-28 bg-white">
          <option value="T-Shirts">T-Shirts</option>
          <option value="Sweats">Sweats</option>
          <option value="Bottoms">Bottoms</option>
          <option value="Bags">Bags</option>
          <option value="Headwear">Headwear</option>
          <option value="Outerwear">Outerwear</option>
          <option value="Accessories">Accessories</option>
        </select>
        <input name="gsm" placeholder="GSM" className="border px-2 py-1 text-[13px] w-16" />
        <input name="brand" placeholder="Brand" required className="border px-2 py-1 text-[13px] w-28" />
        <select name="vendorId" className="border px-2 py-1 text-[13px] w-32 bg-white">
          <option value="">No vendor</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-mid-grey text-[13px]">£</span>
          <input name="cost" type="number" step="0.01" min="0" required placeholder="Cost" className="border pl-5 pr-2 py-1 text-[13px] w-20 text-right" />
        </div>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-mid-grey text-[13px]">£</span>
          <input name="base" type="number" step="0.01" min="0" required placeholder="Base" className="border pl-5 pr-2 py-1 text-[13px] w-20 text-right" />
        </div>
        <button type="submit" disabled={isSaving} className="bg-black text-white px-3 py-1 text-[12px] rounded-[2px] disabled:opacity-50">Save</button>
        <button type="button" onClick={() => setIsOpen(false)} className="px-2 py-1 text-mid-grey text-[12px] hover:text-black">Cancel</button>
      </form>
    </div>
  );
}

export function AddEmbFooter({ vendors }: { vendors: Vendor[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) {
    return (
      <div 
        className="bg-[#F4F2EE] border-t border-warm-grey px-5 py-3 text-[12px] text-mid-grey hover:text-near-black cursor-pointer transition-colors"
        onClick={() => setIsOpen(true)}
      >
        + Add Embellishment
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await addEmb({
        code: fd.get("code") as string,
        name: fd.get("name") as string,
        vendorId: fd.get("vendorId") ? parseInt(fd.get("vendorId") as string) : undefined,
        costPence: Math.round(parseFloat(fd.get("cost") as string) * 100),
        pricePence: Math.round(parseFloat(fd.get("sell") as string) * 100),
      });
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      alert("Error adding Embellishment. Check uniqueness.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#F4F2EE] border-t border-warm-grey p-5">
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <input name="code" placeholder="Code (e.g. EMB01)" required className="border px-2 py-1 text-[13px] w-24" />
        <input name="name" placeholder="Name" required className="border px-2 py-1 text-[13px] flex-1" />
        <select name="vendorId" className="border px-2 py-1 text-[13px] w-32 bg-white">
          <option value="">No vendor</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-mid-grey text-[13px]">£</span>
          <input name="cost" type="number" step="0.01" min="0" required placeholder="Cost" className="border pl-5 pr-2 py-1 text-[13px] w-20 text-right" />
        </div>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-mid-grey text-[13px]">£</span>
          <input name="sell" type="number" step="0.01" min="0" required placeholder="Sell" className="border pl-5 pr-2 py-1 text-[13px] w-20 text-right" />
        </div>
        <button type="submit" disabled={isSaving} className="bg-black text-white px-3 py-1 text-[12px] rounded-[2px] disabled:opacity-50">Save</button>
        <button type="button" onClick={() => setIsOpen(false)} className="px-2 py-1 text-mid-grey text-[12px] hover:text-black">Cancel</button>
      </form>
    </div>
  );
}

export function AddColorwayFooter() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) {
    return (
      <div 
        className="bg-[#F4F2EE] border border-t-0 border-warm-grey px-5 py-3 text-[12px] text-mid-grey hover:text-near-black cursor-pointer transition-colors rounded-b-[2px]"
        onClick={() => setIsOpen(true)}
      >
        + Add Colorway
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await addColorway({
        code: fd.get("code") as string,
        name: fd.get("name") as string,
        hex: fd.get("hex") as string,
        vendorName: (fd.get("vendorName") as string) || undefined,
      });
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      alert("Error adding colorway. Code might exist.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#F4F2EE] border border-t-0 border-warm-grey p-5 rounded-b-[2px]">
      <form onSubmit={handleSubmit} className="flex gap-2 items-center justify-center flex-wrap">
        <input name="hex" type="color" required className="w-8 h-8 p-0 border-0 bg-transparent rounded-full cursor-pointer" />
        <input name="code" placeholder="Code (e.g. BLK)" required maxLength={3} className="border px-2 py-1 text-[13px] w-16" />
        <input name="name" placeholder="Name" required className="border px-2 py-1 text-[13px] w-32" />
        <input name="vendorName" placeholder="Mill color (opt)" className="border px-2 py-1 text-[13px] w-32" />
        <button type="submit" disabled={isSaving} className="bg-black text-white px-3 py-1 text-[12px] rounded-[2px] disabled:opacity-50">Save</button>
        <button type="button" onClick={() => setIsOpen(false)} className="px-2 py-1 text-mid-grey text-[12px] hover:text-black">Cancel</button>
      </form>
    </div>
  );
}

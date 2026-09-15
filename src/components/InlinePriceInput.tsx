"use client";

import { useState, useEffect, useRef } from "react";

interface InlinePriceInputProps {
  initialPence: number;
  id: string;
  type: "cost" | "sell";
  action: (data: { id: string; type: "cost" | "sell"; newPence: number }) => Promise<void>;
  editable: boolean;
}

export default function InlinePriceInput({ initialPence, id, type, action, editable }: InlinePriceInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState((initialPence / 100).toFixed(2));
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state if prop changes (e.g. after revalidation)
  useEffect(() => {
    if (!isEditing && !isSaving) {
      setValue((initialPence / 100).toFixed(2));
    }
  }, [initialPence, isEditing, isSaving]);

  const formatGBP = (p: number) => 
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }).format(p / 100);

  if (!editable) {
    return <span className={type === "sell" ? "font-medium" : "text-mid-grey"}>{formatGBP(initialPence)}</span>;
  }

  const handleBlur = async () => {
    setIsEditing(false);
    const num = parseFloat(value);
    
    if (isNaN(num) || num < 0) {
      setValue((initialPence / 100).toFixed(2)); // revert
      return;
    }

    const newPence = Math.round(num * 100);
    if (newPence === initialPence) {
      setValue((newPence / 100).toFixed(2));
      return;
    }

    setIsSaving(true);
    try {
      await action({ id, type, newPence });
      setValue((newPence / 100).toFixed(2));
    } catch (e) {
      console.error(e);
      setValue((initialPence / 100).toFixed(2)); // revert on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Escape") {
      inputRef.current?.blur();
    }
  };

  if (isEditing) {
    return (
      <div className="relative inline-block w-[70px]">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-mid-grey text-[13px]">£</span>
        <input
          ref={inputRef}
          type="number"
          step="0.01"
          min="0"
          className="w-full pl-5 pr-2 py-1 text-right bg-white border border-black focus:outline-none focus:ring-1 focus:ring-black text-[13px] rounded-[2px]"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div 
      className={`cursor-pointer hover:bg-black/5 px-2 py-1 -mx-2 rounded-[2px] transition-colors inline-block min-w-[50px] text-right ${isSaving ? 'opacity-50' : ''}`}
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      <span className={type === "sell" ? "font-medium" : "text-mid-grey"}>
        {formatGBP(initialPence)}
      </span>
    </div>
  );
}

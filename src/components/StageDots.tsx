import { OrderStatus } from "@prisma/client";

interface StageDotsProps {
  stage: number;
  status: OrderStatus;
}

const STAGE_LABELS = [
  "Quote",
  "Confirm",
  "Artwork",
  "Invoice",
  "Deposit",
  "Production",
  "Ready",
  "Shipped",
];

const NEXT_ACTIONS = [
  "Generate & send quote",
  "Send order confirmation",
  "Approve artwork / send change notes",
  "Send deposit invoice",
  "Mark deposit received",
  "Push 20% milestone updates",
  "Send balance & pack",
  "—",
];

export default function StageDots({ stage, status }: StageDotsProps) {
  const isDeclined = status === "declined";
  const label = isDeclined ? "Declined" : STAGE_LABELS[stage] || "Unknown";
  const nextAction = isDeclined ? "Reopen order" : NEXT_ACTIONS[stage] || "—";

  return (
    <div className="flex items-center space-x-4">
      <div className="flex space-x-1">
        {Array.from({ length: 8 }).map((_, i) => {
          const isFilled = !isDeclined && i <= stage;
          const isCurrent = !isDeclined && i === stage;
          return (
            <div
              key={i}
              className={`w-[6px] h-[6px] ${
                isFilled ? "bg-near-black" : "bg-warm-grey"
              } ${isCurrent ? "ring-4 ring-black/10" : ""}`}
            />
          );
        })}
      </div>
      <div className="flex items-center space-x-2 text-[10px] uppercase tracking-[0.18em]">
        <span className="text-near-black font-medium">{label}</span>
        {nextAction !== "—" && (
          <>
            <span className="text-mid-grey">·</span>
            <span className="text-mid-grey hover:text-near-black transition-colors cursor-pointer">
              {nextAction} &rarr;
            </span>
          </>
        )}
      </div>
    </div>
  );
}

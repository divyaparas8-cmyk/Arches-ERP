export const STAGE_NAMES = [
  "Quote Draft",
  "Awaiting Confirmation",
  "Artwork Approval",
  "Invoice & Accounting",
  "Awaiting Deposit",
  "In Production",
  "Ready for Packing",
  "Shipped",
];

export const STAGE_ACTIONS: Record<number, { title: string; desc: string; button?: string }> = {
  0: {
    title: "Quote ready to send",
    desc: "Generate the quote PDF and send to the client for approval.",
    button: "Send quote",
  },
  1: {
    title: "Awaiting client confirmation",
    desc: "Client approved the quote. Send the formal order confirmation.",
    button: "Send order confirmation",
  },
  2: {
    title: "Artwork approval",
    desc: "Client is reviewing artwork per SKU. Approve artwork to proceed.",
    button: "Advance to invoicing",
  },
  3: {
    title: "Invoice & accounting",
    desc: "Deposit invoice (50%) issued. Route to accounting and send to client.",
    button: "Send deposit invoice",
  },
  4: {
    title: "Awaiting deposit",
    desc: "Mark the deposit as received to start the production timer.",
    button: "Mark deposit received",
  },
  5: {
    title: "In production",
    desc: "Push production updates to the client at each 20% milestone.",
    button: "Push milestone update",
  },
  6: {
    title: "Ready — balance due",
    desc: "Order complete. Send balance invoice + shipping, then pack.",
    button: "Send balance & pack",
  },
  7: {
    title: "Shipped",
    desc: "Goods dispatched. Tracking has been sent to the client.",
  },
};

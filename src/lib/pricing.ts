export interface PricingSku {
  basePence: number;
  costPence: number;
}

export interface PricingEmbellishment {
  pricePence: number;
  costPence: number;
}

export interface PricingLineEmbellishment {
  costPence: number | null;
  sellPence: number | null;
  emb: PricingEmbellishment;
}

export interface PricingLine {
  qty: number;
  overridePence: number | null;
  blankCostPence: number | null;
  blankSellPence: number | null;
  sku: PricingSku;
  embellishments: PricingLineEmbellishment[];
}

export interface PricingOrder {
  shippingPence: number;
  lines: PricingLine[];
}

// -----------------------------------------------------------------------------
// Sell Side
// -----------------------------------------------------------------------------

export function blankSell(line: PricingLine): number {
  return line.blankSellPence ?? line.sku.basePence;
}

export function embSell(lineEmb: PricingLineEmbellishment): number {
  return lineEmb.sellPence ?? lineEmb.emb.pricePence;
}

export function unitSell(line: PricingLine): number {
  if (line.overridePence !== null) {
    return line.overridePence;
  }
  const embsTotal = line.embellishments.reduce((acc, le) => acc + embSell(le), 0);
  return blankSell(line) + embsTotal;
}

export function lineTotal(line: PricingLine): number {
  return unitSell(line) * line.qty;
}

export function orderValue(order: PricingOrder): number {
  return order.lines.reduce((acc, line) => acc + lineTotal(line), 0);
}

export function calculateDeposit(value: number): number {
  return Math.round(value * 0.5);
}

export function calculateBalance(value: number, deposit: number, shipping: number): number {
  return value - deposit + shipping;
}

// -----------------------------------------------------------------------------
// Cost Side
// -----------------------------------------------------------------------------

export function blankCost(line: PricingLine): number {
  return line.blankCostPence ?? line.sku.costPence;
}

export function embCost(lineEmb: PricingLineEmbellishment): number {
  return lineEmb.costPence ?? lineEmb.emb.costPence;
}

export function unitCost(line: PricingLine): number {
  const embsTotal = line.embellishments.reduce((acc, le) => acc + embCost(le), 0);
  return blankCost(line) + embsTotal;
}

export function lineCost(line: PricingLine): number {
  return unitCost(line) * line.qty;
}

export function orderCost(order: PricingOrder): number {
  return order.lines.reduce((acc, line) => acc + lineCost(line), 0);
}

// -----------------------------------------------------------------------------
// Margins & Splits
// -----------------------------------------------------------------------------

export function grossProfit(order: PricingOrder): number {
  return orderValue(order) - orderCost(order);
}

export function marginPct(rev: number, cost: number): number {
  return rev > 0 ? Math.round(((rev - cost) / rev) * 100) : 0;
}

export function orderMarginPct(order: PricingOrder): number {
  const rev = orderValue(order);
  const cost = orderCost(order);
  return marginPct(rev, cost);
}

export function blanksRevenue(order: PricingOrder): number {
  return order.lines
    .filter(line => line.overridePence === null)
    .reduce((acc, line) => acc + (blankSell(line) * line.qty), 0);
}

export function embsRevenue(order: PricingOrder): number {
  return order.lines
    .filter(line => line.overridePence === null)
    .reduce((acc, line) => {
      const embsTotal = line.embellishments.reduce((sum, le) => sum + embSell(le), 0);
      return acc + (embsTotal * line.qty);
    }, 0);
}

export function sellFromCost(costPence: number, targetPct: number): number {
  if (targetPct >= 100) return costPence; // Prevent divide by zero or negative
  return Math.round(costPence / (1 - targetPct / 100));
}

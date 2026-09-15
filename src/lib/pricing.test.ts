import { describe, it, expect } from 'vitest';
import {
  unitSell,
  lineTotal,
  orderValue,
  calculateDeposit,
  calculateBalance,
  unitCost,
  lineCost,
  orderCost,
  grossProfit,
  marginPct,
  orderMarginPct,
  blanksRevenue,
  embsRevenue,
  sellFromCost,
  PricingLine,
  PricingOrder
} from './pricing';

describe('pricing logic', () => {
  const mockLine: PricingLine = {
    qty: 100,
    overridePence: null,
    blankCostPence: null,
    blankSellPence: null,
    sku: { basePence: 1000, costPence: 450 }, // £10 sell, £4.50 cost
    embellishments: [
      {
        costPence: null,
        sellPence: null,
        emb: { pricePence: 250, costPence: 100 } // £2.50 sell, £1 cost
      }
    ]
  };

  it('calculates standard unit sell build-up', () => {
    // 1000 + 250 = 1250
    expect(unitSell(mockLine)).toBe(1250);
  });

  it('respects blank and emb sell overrides', () => {
    const overriddenLine: PricingLine = {
      ...mockLine,
      blankSellPence: 900,
      embellishments: [
        { ...mockLine.embellishments[0], sellPence: 200 }
      ]
    };
    // 900 + 200 = 1100
    expect(unitSell(overriddenLine)).toBe(1100);
  });

  it('respects full line override', () => {
    const overriddenLine: PricingLine = {
      ...mockLine,
      overridePence: 1150
    };
    expect(unitSell(overriddenLine)).toBe(1150);
  });

  it('calculates line total', () => {
    expect(lineTotal(mockLine)).toBe(125000);
  });

  it('calculates unit cost build-up', () => {
    // 450 + 100 = 550
    expect(unitCost(mockLine)).toBe(550);
  });

  it('respects cost overrides', () => {
    const overriddenLine: PricingLine = {
      ...mockLine,
      blankCostPence: 400,
      embellishments: [
        { ...mockLine.embellishments[0], costPence: 80 }
      ]
    };
    // 400 + 80 = 480
    expect(unitCost(overriddenLine)).toBe(480);
  });

  it('calculates line cost', () => {
    expect(lineCost(mockLine)).toBe(55000);
  });

  describe('order level', () => {
    const order: PricingOrder = {
      shippingPence: 2000,
      lines: [
        mockLine,
        {
          qty: 50,
          overridePence: 2000, // full override sell
          blankCostPence: null,
          blankSellPence: null,
          sku: { basePence: 1500, costPence: 800 },
          embellishments: []
        }
      ]
    };

    it('calculates order value', () => {
      // (1250 * 100) + (2000 * 50) = 125000 + 100000 = 225000
      expect(orderValue(order)).toBe(225000);
    });

    it('calculates order cost', () => {
      // (550 * 100) + (800 * 50) = 55000 + 40000 = 95000
      expect(orderCost(order)).toBe(95000);
    });

    it('calculates deposit and balance', () => {
      const val = orderValue(order);
      const dep = calculateDeposit(val);
      expect(dep).toBe(112500);
      // 225000 - 112500 + 2000 = 114500
      expect(calculateBalance(val, dep, order.shippingPence)).toBe(114500);
    });

    it('calculates gross profit', () => {
      // 225000 - 95000 = 130000
      expect(grossProfit(order)).toBe(130000);
    });

    it('calculates order margin pct', () => {
      // (130000 / 225000) * 100 = 57.77 -> 58
      expect(orderMarginPct(order)).toBe(58);
    });

    it('calculates blanks and embs revenue excluding overridden lines', () => {
      // Only mockLine is not overridden
      expect(blanksRevenue(order)).toBe(1000 * 100);
      expect(embsRevenue(order)).toBe(250 * 100);
    });
  });

  describe('sellFromCost', () => {
    it('calculates sell price from cost and target margin', () => {
      // cost 450, target 55%
      // 450 / (1 - 0.55) = 450 / 0.45 = 1000
      expect(sellFromCost(450, 55)).toBe(1000);
    });
  });
});

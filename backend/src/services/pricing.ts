import type { Service, ServiceCombo } from '../types.js';

export interface AppliedCombo {
  id: string;
  name: { tr: string; en: string };
  discountAmount: number;
}

export interface PricingResult {
  subtotal: number;
  discountAmount: number;
  total: number;
  appliedCombos: AppliedCombo[];
}

export function calculatePricing(services: Service[], combos: ServiceCombo[]): PricingResult {
  const subtotal = services.reduce((sum, s) => sum + s.price, 0);
  const selectedIds = new Set(services.map((s) => String(s._id)));

  const appliedCombos: AppliedCombo[] = [];
  const sortedCombos = [...combos].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const combo of sortedCombos) {
    if (!combo.active) continue;
    const comboServiceIds = combo.serviceIds.map((id) => String(id));
    if (comboServiceIds.length < 2) continue;
    if (comboServiceIds.every((id) => selectedIds.has(id))) {
      appliedCombos.push({
        id: String(combo._id),
        name: combo.name,
        discountAmount: combo.discountAmount,
      });
    }
  }

  const discountAmount = appliedCombos.reduce((sum, c) => sum + c.discountAmount, 0);

  return {
    subtotal,
    discountAmount,
    total: Math.max(0, subtotal - discountAmount),
    appliedCombos,
  };
}

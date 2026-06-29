import type { Service, ServiceCombo } from '@/types';

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

export function calculatePricing(
  selectedIds: string[],
  services: Service[],
  combos: ServiceCombo[],
): PricingResult {
  const selectedServices = services.filter((s) => selectedIds.includes(s.id));
  const subtotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const selectedSet = new Set(selectedIds);

  const appliedCombos: AppliedCombo[] = [];
  const sortedCombos = [...combos].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const combo of sortedCombos) {
    if (!combo.active) continue;
    if (combo.serviceIds.length < 2) continue;
    if (combo.serviceIds.every((id) => selectedSet.has(id))) {
      appliedCombos.push({
        id: combo.id,
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

export const DISTRIBUTOR_COMMISSION_XAF = {
  PREMIUM: 5_000,
  PRO: 10_000,
} as const;

export function getDistributorCommission(planCode: string | null | undefined): number {
  const plan = String(planCode || '').toUpperCase();
  if (plan === 'PREMIUM') return DISTRIBUTOR_COMMISSION_XAF.PREMIUM;
  if (plan === 'PRO') return DISTRIBUTOR_COMMISSION_XAF.PRO;
  return 0;
}

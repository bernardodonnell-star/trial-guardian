// Assistant message allowance. A message is one question or request typed or
// spoken to the assistant on the Ask screen, with its answer. Alerts, briefs,
// readiness and route checks, Help, guides and adding bookings never count.

export type Plan = 'free' | 'monthly' | 'annual' | 'super-user';

export const MONTHLY_ALLOWANCE: Record<Plan, number> = {
  free: 10,
  monthly: 150,
  annual: 150,
  'super-user': 500,
};

export const TOP_UP = { messages: 200, priceEur: 4.99 } as const;

export interface Usage {
  plan: Plan;
  usedThisMonth: number;
  topUpRemaining: number; // top-up messages do not expire at month end
}

export interface AllowanceState {
  remaining: number;
  total: number;
  /** True once 80% of the monthly allowance is used. */
  warn: boolean;
  /** When false, the assistant answers from the brief and database only, without live search. */
  liveSearch: boolean;
  label: string;
}

export function allowanceState(u: Usage): AllowanceState {
  const monthly = MONTHLY_ALLOWANCE[u.plan];
  const monthlyLeft = Math.max(0, monthly - u.usedThisMonth);
  const remaining = monthlyLeft + u.topUpRemaining;
  const total = monthly + u.topUpRemaining;
  const warn = u.usedThisMonth >= monthly * 0.8;
  const liveSearch = remaining > 0;
  const label = liveSearch
    ? `${remaining} of ${total} messages left this month`
    : 'Monthly messages used. Answers now come from your brief and checked data only.';
  return { remaining, total, warn, liveSearch, label };
}

/** Spend one message, using the monthly allowance before any top-up. */
export function spendMessage(u: Usage): Usage {
  const monthly = MONTHLY_ALLOWANCE[u.plan];
  if (u.usedThisMonth < monthly) return { ...u, usedThisMonth: u.usedThisMonth + 1 };
  if (u.topUpRemaining > 0) return { ...u, topUpRemaining: u.topUpRemaining - 1 };
  return u;
}

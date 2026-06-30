export const BILLING_BASE = "/billing";
export const ADMIN_BILLING_BASE = "/admin/billing";

export function billingMonthPath(monthId: string) {
  return `${BILLING_BASE}/${monthId}`;
}

export function adminBillingMonthPath(monthId: string) {
  return `${ADMIN_BILLING_BASE}/${monthId}`;
}

export function adminBillingAllPath() {
  return `${ADMIN_BILLING_BASE}/all`;
}

export function billingAllPath() {
  return `${BILLING_BASE}/all`;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Billing month boundaries in India Standard Time (INR billing). */
export function getBillingMonthRange(date = new Date()) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();
  const monthId = `${year}-${String(month + 1).padStart(2, "0")}`;

  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999) - IST_OFFSET_MS);

  return { start, end, monthId };
}

export function getBillingMonthRangeForId(monthId: string) {
  const [yearPart, monthPart] = monthId.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart) - 1;
  if (!year || Number.isNaN(month) || month < 0 || month > 11) {
    throw new Error(`Invalid invoice month: ${monthId}`);
  }

  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999) - IST_OFFSET_MS);
  return { start, end, monthId };
}

const MONTH_ID_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidBillingMonthId(monthId: string) {
  return MONTH_ID_RE.test(monthId);
}

export function formatBillingMonthLabel(monthId: string) {
  const { start } = getBillingMonthRangeForId(monthId);
  return start.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function listRecentBillingMonthIds(count = 24, fromDate = new Date()) {
  const months: string[] = [];
  let cursor = fromDate;

  for (let i = 0; i < count; i++) {
    const { monthId, start } = getBillingMonthRange(cursor);
    if (!months.includes(monthId)) months.push(monthId);
    cursor = new Date(start.getTime() - 1);
  }

  return months;
}

export function mergeBillingMonthIds(...groups: string[][]) {
  return Array.from(new Set(groups.flat())).sort((a, b) => b.localeCompare(a));
}

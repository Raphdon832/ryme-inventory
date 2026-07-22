export const DEFAULT_VAT_PERCENTAGE = 7.5;

export const normalizeVatPercentage = (value, fallback = DEFAULT_VAT_PERCENTAGE) => {
  if (value === '' || value === null || value === undefined) {
    return fallback;
  }

  const percentage = Number(value);
  if (!Number.isFinite(percentage)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, percentage));
};

export const getOrderVatPercentage = (order) => (
  normalizeVatPercentage(order?.vat_percentage)
);

export const formatVatPercentage = (value) => (
  `${normalizeVatPercentage(value).toLocaleString('en-US', {
    maximumFractionDigits: 4
  })}%`
);

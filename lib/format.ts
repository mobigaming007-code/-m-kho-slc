export function formatNumber(value: unknown) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}

export function normalizeName(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");
}

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateTime(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("vi-VN");
}

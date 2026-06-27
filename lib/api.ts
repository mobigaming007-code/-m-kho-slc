import { APP_CONFIG } from "./config";

export type ApiResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

async function callApi<T>(action: string, payload: Record<string, unknown> = {}): Promise<ApiResponse<T>> {
  if (!APP_CONFIG.APPS_SCRIPT_URL || APP_CONFIG.APPS_SCRIPT_URL.includes("THAY_BANG")) {
    throw new Error("Bạn chưa cấu hình APPS_SCRIPT_URL.");
  }

  const response = await fetch(APP_CONFIG.APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload }),
  });
  const text = await response.text();

  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    console.error("Raw response:", text);
    throw new Error("API không trả về JSON hợp lệ. Kiểm tra Apps Script deployment.");
  }
}

export const Api = {
  getConfig: () =>
    callApi<{
      khuVuc: KhuVuc[];
      tuanActive?: Record<string, string>;
      hangDoi?: CatalogItem[];
      hangTrungBay?: CatalogItem[];
    }>("getConfig"),
  getBangQuyDoi: (maTuan: string) => callApi<{ rows: Record<string, unknown>[] }>("getBangQuyDoi", { maTuan }),
  getDeXuatDoiHang: (payload: Record<string, unknown>) =>
    callApi<AiSuggestionResult>("getDeXuatDoiHang", payload),
  submitGiaoDich: (payload: Record<string, unknown>) =>
    callApi<{ maGiaoDich: string; duplicate?: boolean }>("submitGiaoDich", payload),
  submitKiemKho: (payload: Record<string, unknown>) =>
    callApi<{ maKiemKho: string }>("submitKiemKho", payload),
  getTonKho: (payload: Record<string, unknown>) =>
    callApi<{ tonKho: StockMap; tonKhoSource?: TonKhoSource }>("getTonKho", payload),
  login: (email: string, matKhau: string) =>
    callApi<{ token: string; user: AdminUser }>("login", { email, matKhau }),
  verifySession: (token: string) => callApi<AdminUser>("verifySession", { token }),
  getThongKe: (payload: Record<string, unknown>) => callApi<DashboardData>("getThongKe", payload),
  getKiemKho: (payload: Record<string, unknown>) => callApi<KiemKhoRow[]>("getKiemKho", payload),
  xuatNhapKho: (payload: Record<string, unknown>) => callApi<{ maPhieu: string }>("xuatNhapKho", payload),
  getGiaoDich: (payload: Record<string, unknown>) =>
    callApi<{ rows: GiaoDichRow[]; total?: number; limit?: number; offset?: number }>("getGiaoDich", payload),
  updateGiaoDich: (payload: Record<string, unknown>) => callApi<{ maGiaoDich: string }>("updateGiaoDich", payload),
  deleteGiaoDich: (payload: Record<string, unknown>) =>
    callApi<{ message?: string }>("deleteGiaoDich", payload),
  addSanPham: (payload: Record<string, unknown>) =>
    callApi<{ sanPham: CatalogItem; addedColumns?: string[] }>("addSanPham", payload),
  deleteSanPham: (payload: Record<string, unknown>) =>
    callApi<{ maSanPham: string; deletedColumns?: string[] }>("deleteSanPham", payload),
};

export type KhuVuc = { maKhuVuc: string; tenKhuVuc: string };
export type CatalogItem = { key: string; label: string; loaiSanPham?: "HangDoi" | "HangTrungBay"; trangThai?: string };
export type StockMap = Record<string, number>;
export type TonKhoSource = {
  type?: string;
  maKiemKho?: string;
  ngayToChuc?: string;
  buoiToChuc?: string;
  loaiKiem?: string;
};
export type AdminUser = { hoTen?: string; email?: string; capQuyen?: string };
export type AiSuggestionResult = {
  diem?: { diemA?: number; diemB?: number; diemC?: number; diemD?: number; tongDiem?: number };
  suggestions?: { note?: string; items: { key: string; tenHangDoi: string; soLuong: number }[] }[];
};
export type GiaoDichRow = Record<string, string | number | undefined>;
export type KiemKhoRow = Record<string, string | number | undefined>;
export type DashboardData = {
  tongGiaoDich?: number;
  tongDiemGoi?: number;
  tongDiemDoiHang?: number;
  soPhieuKiemKhoBatThuong?: number;
  topKhuVuc?: { key: string; count: number }[];
  theoNgay?: Record<string, string | number>[];
};

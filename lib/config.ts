export type CatalogItem = {
  key: string;
  label: string;
};

export type InputCatalogItem = {
  field: string;
  label: string;
  unit: string;
};

export const APP_CONFIG = {
  APPS_SCRIPT_URL:
    process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
    "https://script.google.com/macros/s/AKfycbz0LA9GkJS62HA-StocVu9xybM1a_Mw1OG1fnSdKZEGJzo4L5f8rVIhqj5qh7x5YdsS/exec",
  STORAGE_KEYS: {
    SESSION: "dslc2026_session",
    WORK_CONTEXT: "dslc2026_work_context",
    DRAFT_GIAODICH: "dslc2026_draft_giaodich",
    DRAFT_KIEMKHO: "dslc2026_draft_kiemkho",
  },
  HANG_DOI: [
    { key: "OngHutTre", label: "Ống hút tre" },
    { key: "OngHutCoBang", label: "Ống hút cỏ bàng" },
    { key: "OngHutCoSay", label: "Ống hút cỏ sậy" },
    { key: "OngHutGao", label: "Ống hút gạo/ngũ cốc" },
    { key: "ButBi", label: "Bút bi nhựa tái chế" },
    { key: "SenDa", label: "Cây sen đá" },
    { key: "MassageTay", label: "Massage tay nhựa tái chế" },
    { key: "GiacHoi", label: "Bộ giác hơi nhựa tái chế" },
    { key: "Fuwa3e", label: "Nước rửa chén/lau sàn/giặt/vệ sinh bồn cầu Fuwa3e" },
    { key: "MocKhoaTreViet", label: "Móc khóa nón lá TreViet" },
    { key: "CoRuaOngHut", label: "Cọ rửa ống hút" },
  ] satisfies CatalogItem[],
  NHOM_C: [
    { field: "NhomC_CapTui", label: "Cặp học sinh", unit: "cái" },
    { field: "NhomC_BoDungCu", label: "Bộ đồ dùng học tập", unit: "bộ" },
    { field: "NhomC_QuanAo_KG", label: "Quần áo sạch", unit: "cái" },
    { field: "NhomC_DoChoi_Cai", label: "Đồ chơi/gấu bông", unit: "cái" },
    { field: "NhomC_TapVo_Quyen", label: "Tập vở", unit: "quyển" },
  ] satisfies InputCatalogItem[],
  NHOM_D: [
    { field: "NhomD_GiayBao_KG", label: "Giấy báo/vụn/vở cũ", unit: "kg" },
    { field: "NhomD_Carton_KG", label: "Giấy bìa/thùng carton", unit: "kg" },
    { field: "NhomD_VoSua_Cai", label: "Vỏ hộp sữa", unit: "cái" },
    { field: "NhomD_Nhua_Cai", label: "Chai/hũ/lọ nhựa", unit: "cái" },
    { field: "NhomD_VoLon_Cai", label: "Vỏ lon", unit: "cái" },
  ] satisfies InputCatalogItem[],
  HANG_TRUNG_BAY: [
    { key: "HuNhua", label: "Hũ nhựa" },
    { key: "MetRo", label: "Mẹt/rổ" },
    { key: "Can", label: "Cân" },
    { key: "TuiGiay", label: "Túi giấy" },
    { key: "BanGhe", label: "Bàn ghế" },
    { key: "CSVC", label: "CSVC khác" },
  ] satisfies CatalogItem[],
};

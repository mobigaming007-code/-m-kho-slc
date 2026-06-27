const CONFIG = {
  SPREADSHEET_DATA_ID: '10ekBLll-rsbXuW0mVpKF0jlXJpjoLARGe0KtBmw-FP0',
  SPREADSHEET_CONFIG_ID: '1vwG8pd_7cfSwEWifekt3WiDs4GIPwsWo4wad819k7TE',

  SHEETS: {
    GIAO_DICH: 'GiaoDich_UngHo',
    KIEM_KHO: 'KiemKho',
    THONG_BAO_HUT_HANG: 'ThongBaoHutHang',
    XUAT_NHAP_KHO: 'XuatNhapKho',
    BANG_QUY_DOI: 'BangQuyDoi',
    CAU_HINH_TUAN: 'CauHinhTuan',

    PHAN_QUYEN: 'PhanQuyen_Admin',
    KHU_VUC: 'CauHinhKhuVuc',
    SAN_PHAM: 'CauHinhSanPham'
  },

  SESSION_EXPIRE_HOURS: 8
};

function getDataSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_DATA_ID);
}

function getConfigSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_CONFIG_ID);
}

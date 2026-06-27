
function setupSystem() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_DATA_ID);

  const sheetDefs = {
    GiaoDich_UngHo: [
      'MaGiaoDich','ThoiGianNhap','MaKhuVuc','TenKhuVuc','NgayToChuc','BuoiToChuc','HoTenNguoiUngHo','SoDienThoai',
      'NhomA_KG','NhomB_KG',
      'NhomC_CapTui','NhomC_BoDungCu','NhomC_QuanAo_KG','NhomC_DoChoi_Cai','NhomC_TapVo_Quyen',
      'NhomD_GiayBao_KG','NhomD_Carton_KG','NhomD_VoSua_Cai','NhomD_Nhua_Cai','NhomD_VoLon_Cai',
      'DiemGoi_A','DiemGoi_B','DiemGoi_C','DiemGoi_D','TongDiemGoi',
      'HangDoi_OngHutTre','HangDoi_OngHutCoBang','HangDoi_OngHutCoSay','HangDoi_OngHutGao','HangDoi_ButBi','HangDoi_SenDa','HangDoi_MassageTay','HangDoi_GiacHoi','HangDoi_Fuwa3e','HangDoi_MocKhoaTreViet','HangDoi_CoRuaOngHut', 'HangDoi_BanChai',
      'TongDiemDoiHang','TrangThai','GhiChu','EmailTNV','MaTuan'
    ],

    BangQuyDoi: [
      'MaTuan','TenNhom','LoaiHang','DonVi','SoLuongTrao','DiemGoi','TenHangDoi','DiemCanDoi','SoLuongDoi','GhiChu','UuTien'
    ],

    KiemKho: [
      'MaKiemKho','ThoiGianNhap','MaKhuVuc','TenKhuVuc','NgayToChuc','BuoiToChuc','LoaiKiem',
      'OngHutTre_TonDau','OngHutTre_NhanThem','OngHutTre_DaDoi','OngHutTre_HongHu','OngHutTre_TonCuoi','OngHutTre_ThucTe','OngHutTre_Hut',
      'OngHutCoBang_TonDau','OngHutCoBang_NhanThem','OngHutCoBang_DaDoi','OngHutCoBang_HongHu','OngHutCoBang_TonCuoi','OngHutCoBang_ThucTe','OngHutCoBang_Hut',
      'OngHutCoSay_TonDau','OngHutCoSay_NhanThem','OngHutCoSay_DaDoi','OngHutCoSay_HongHu','OngHutCoSay_TonCuoi','OngHutCoSay_ThucTe','OngHutCoSay_Hut',
      'OngHutGao_TonDau','OngHutGao_NhanThem','OngHutGao_DaDoi','OngHutGao_HongHu','OngHutGao_TonCuoi','OngHutGao_ThucTe','OngHutGao_Hut',
      'ButBi_TonDau','ButBi_NhanThem','ButBi_DaDoi','ButBi_HongHu','ButBi_TonCuoi','ButBi_ThucTe','ButBi_Hut',
      'SenDa_TonDau','SenDa_NhanThem','SenDa_DaDoi','SenDa_HongHu','SenDa_TonCuoi','SenDa_ThucTe','SenDa_Hut',
      'MassageTay_TonDau','MassageTay_NhanThem','MassageTay_DaDoi','MassageTay_HongHu','MassageTay_TonCuoi','MassageTay_ThucTe','MassageTay_Hut',
      'GiacHoi_TonDau','GiacHoi_NhanThem','GiacHoi_DaDoi','GiacHoi_HongHu','GiacHoi_TonCuoi','GiacHoi_ThucTe','GiacHoi_Hut',
      'Fuwa3e_TonDau','Fuwa3e_NhanThem','Fuwa3e_DaDoi','Fuwa3e_HongHu','Fuwa3e_TonCuoi','Fuwa3e_ThucTe','Fuwa3e_Hut',
      'MocKhoaTreViet_TonDau','MocKhoaTreViet_NhanThem','MocKhoaTreViet_DaDoi','MocKhoaTreViet_HongHu','MocKhoaTreViet_TonCuoi','MocKhoaTreViet_ThucTe','MocKhoaTreViet_Hut',
      'CoRuaOngHut_TonDau','CoRuaOngHut_NhanThem','CoRuaOngHut_DaDoi','CoRuaOngHut_HongHu','CoRuaOngHut_TonCuoi','CoRuaOngHut_ThucTe','CoRuaOngHut_Hut',
      'BanChai_ToNDau','BanChai_NhanThem','BanChai_DaDoi','BanChai_HongHu','BanChai_TonCuoi','BanChai_ThucTe','BanChai_Hut',
      'HuNhua_TonDau','HuNhua_NhanThem','HuNhua_DaDoi','HuNhua_HongHu','HuNhua_TonCuoi','HuNhua_ThucTe','HuNhua_Hut',
      'MetRo_TonDau','MetRo_NhanThem','MetRo_DaDoi','MetRo_HongHu','MetRo_TonCuoi','MetRo_ThucTe','MetRo_Hut',
      'Can_TonDau','Can_NhanThem','Can_DaDoi','Can_HongHu','Can_TonCuoi','Can_ThucTe','Can_Hut',
      'TuiGiay_TonDau','TuiGiay_NhanThem','TuiGiay_DaDoi','TuiGiay_HongHu','TuiGiay_TonCuoi','TuiGiay_ThucTe','TuiGiay_Hut',
      'BanGhe_TonDau','BanGhe_NhanThem','BanGhe_DaDoi','BanGhe_HongHu','BanGhe_TonCuoi','BanGhe_ThucTe','BanGhe_Hut',
      'CSVC_TonDau','CSVC_NhanThem','CSVC_DaDoi','CSVC_HongHu','CSVC_TonCuoi','CSVC_ThucTe','CSVC_Hut',
      'AnhMinhChung_URL','EmailNguoiKiem','XacNhanBoi','TrangThaiXacNhan','GhiChu'
    ],


    ThongBaoHutHang: [
      'MaThongBao','ThoiGianTao','MaKiemKho','MaKhuVuc','TenKhuVuc','NgayToChuc','BuoiToChuc','LoaiKiem',
      'MaSanPham','TenSanPham','TonHeThong','ThucTe','SoLuongHut','AnhMinhChung_URL','EmailNguoiKiem','TrangThaiXuLy','GhiChu'
    ],

    XuatNhapKho: [
      'MaPhieu','ThoiGianNhap','LoaiPhieu','NgayPhieu','TuKhuVuc','DenKhuVuc',
      'OngHutTre','OngHutCoBang','OngHutCoSay','OngHutGao','ButBi','SenDa','MassageTay','GiacHoi', 'Fuwa3e','MocKhoaTreViet','CoRuaOngHut','BanChai',
      'HuNhua','MetRo','Can','TuiGiay','BanGhe','CSVC',
      'NguoiLap','NguoiXacNhan','TrangThai','GhiChu'
    ],

    CauHinhTuan: ['MaTuan','TuNgay','DenNgay','TrangThai']
  };

  Object.keys(sheetDefs).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);

    const headers = sheetDefs[name];

    if (sh.getLastRow() === 0 || sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].join('').trim() === '') {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      formatHeader_(sh, headers.length);
      return;
    }

    const current = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    const missing = headers.filter(h => current.indexOf(h) === -1);

    if (missing.length) {
      sh.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
      formatHeader_(sh, current.length + missing.length);
    }

    migrateOldNhomDNhua_(sh);
  });
  ensureSanPhamSheet_();
  syncAllSanPhamColumns_();

  SpreadsheetApp.flush();
}

function migrateOldNhomDNhua_(sh) {
  if (sh.getName() !== 'GiaoDich_UngHo') return;

  const lastCol = sh.getLastColumn();
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const oldIdx = headers.indexOf('NhomD_Nhua_KG');
  const newIdx = headers.indexOf('NhomD_Nhua_Cai');

  if (oldIdx === -1 || newIdx === -1) return;

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return;

  const oldValues = sh.getRange(2, oldIdx + 1, lastRow - 1, 1).getValues();
  const newValues = sh.getRange(2, newIdx + 1, lastRow - 1, 1).getValues();
  const merged = newValues.map((r, i) => [r[0] || oldValues[i][0] || '']);

  sh.getRange(2, newIdx + 1, lastRow - 1, 1).setValues(merged);
}

function formatHeader_(sheet, totalCols) {
  const range = sheet.getRange(1, 1, 1, totalCols);
  range
    .setBackground('#1f5f38')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.setFrozenRows(1);

  for (let i = 1; i <= totalCols; i++) {
    sheet.setColumnWidth(i, 150);
  }
}


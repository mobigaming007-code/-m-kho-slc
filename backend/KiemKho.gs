function submitKiemKho(payload) {
  payload = payload || {};

  const maKhuVuc = String(payload.MaKhuVuc || payload.maKhuVuc || '').trim();
  const tenKhuVuc = String(payload.TenKhuVuc || payload.tenKhuVuc || maKhuVuc).trim();
  const ngayToChuc = String(payload.NgayToChuc || payload.ngayToChuc || '').trim();
  const buoiToChuc = String(payload.BuoiToChuc || payload.buoiToChuc || '').trim();
  const loaiKiem = String(payload.LoaiKiem || payload.loaiKiem || '').trim();

  if (!maKhuVuc) return sendError('Thiếu khu vực kiểm kho');
  if (!ngayToChuc) return sendError('Thiếu ngày kiểm kho');
  if (!buoiToChuc) return sendError('Thiếu buổi kiểm kho');
  if (!loaiKiem) return sendError('Thiếu loại kiểm kho');

  const sheet = getSheet(
    getDataSpreadsheet(),
    CONFIG.SHEETS.KIEM_KHO
  );

  const maKiemKho = generateId('KK');

  // Tồn hệ thống hiện tại được tính từ phiếu kiểm kho mới nhất + giao dịch phát sinh.
  const tonHeThong = tinhTonKhoTheoKhuVuc(maKhuVuc);
  const items = getStockItemKeys_();

  const data = {
    MaKiemKho: maKiemKho,
    ThoiGianNhap: new Date(),
    MaKhuVuc: maKhuVuc,
    TenKhuVuc: tenKhuVuc,
    NgayToChuc: ngayToChuc,
    BuoiToChuc: buoiToChuc,
    LoaiKiem: loaiKiem
  };

  let coBatThuong = false;
  let coHutHang = false;
  let tongLech = 0;
  const hutHangItems = [];

  items.forEach(k => {
    const thucTe = Number(payload[k + '_ThucTe'] || 0);
    const lyThuyet = Number(tonHeThong[k] || 0);
    const lech = thucTe - lyThuyet;

    data[k + '_TonDau'] = '';
    data[k + '_NhanThem'] = '';
    data[k + '_DaDoi'] = '';
    data[k + '_HongHu'] = '';
    data[k + '_TonCuoi'] = lyThuyet;
    data[k + '_ThucTe'] = thucTe;
    data[k + '_Hut'] = lech;

    if (lech !== 0) {
      coBatThuong = true;
      tongLech += Math.abs(lech);
    }

    if (lech < 0) {
      coHutHang = true;
      hutHangItems.push({
        key: k,
        ten: getItemDisplayName_(k),
        tonHeThong: lyThuyet,
        thucTe: thucTe,
        soLuongHut: Math.abs(lech)
      });
    }
  });

  data.AnhMinhChung_URL = payload.AnhMinhChung_URL || '';
  data.EmailNguoiKiem = payload.EmailNguoiKiem || '';
  data.XacNhanBoi = '';
  data.TrangThaiXacNhan = coBatThuong ? 'CoBatThuong' : 'ChoXacNhan';
  data.GhiChu = payload.GhiChu || '';

  // Chỉ bắt buộc minh chứng khi có HỤT hàng. Nếu đầu buổi đếm ra tồn thực tế > 0 trong khi chưa có nhập ban đầu,
  // hệ thống vẫn cho lưu để lấy số đếm làm tồn gốc.
  if (coHutHang && !data.AnhMinhChung_URL) {
    return sendError('Có hàng bị hụt, vui lòng dán URL ảnh minh chứng trước khi lưu');
  }

  appendObject(sheet, data);

  if (coHutHang) {
    appendThongBaoHutHang_(maKiemKho, data, hutHangItems);
  }

  return sendSuccess({
    maKiemKho: maKiemKho,
    trangThaiXacNhan: data.TrangThaiXacNhan,
    tongLech: tongLech,
    coHutHang: coHutHang,
    soDongThongBaoHutHang: hutHangItems.length
  });
}

function appendThongBaoHutHang_(maKiemKho, data, hutHangItems) {
  if (!hutHangItems || !hutHangItems.length) return;

  const ss = getDataSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEETS.THONG_BAO_HUT_HANG || 'ThongBaoHutHang');

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.THONG_BAO_HUT_HANG || 'ThongBaoHutHang');
    const headers = [
      'MaThongBao','ThoiGianTao','MaKiemKho','MaKhuVuc','TenKhuVuc','NgayToChuc','BuoiToChuc','LoaiKiem',
      'MaSanPham','TenSanPham','TonHeThong','ThucTe','SoLuongHut','AnhMinhChung_URL','EmailNguoiKiem','TrangThaiXuLy','GhiChu'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    if (typeof formatHeader_ === 'function') formatHeader_(sheet, headers.length);
  }

  hutHangItems.forEach(item => {
    appendObject(sheet, {
      MaThongBao: generateId('HH'),
      ThoiGianTao: new Date(),
      MaKiemKho: maKiemKho,
      MaKhuVuc: data.MaKhuVuc || '',
      TenKhuVuc: data.TenKhuVuc || '',
      NgayToChuc: data.NgayToChuc || '',
      BuoiToChuc: data.BuoiToChuc || '',
      LoaiKiem: data.LoaiKiem || '',
      MaSanPham: item.key,
      TenSanPham: item.ten,
      TonHeThong: item.tonHeThong,
      ThucTe: item.thucTe,
      SoLuongHut: item.soLuongHut,
      AnhMinhChung_URL: data.AnhMinhChung_URL || '',
      EmailNguoiKiem: data.EmailNguoiKiem || '',
      TrangThaiXuLy: 'ChuaXuLy',
      GhiChu: data.GhiChu || ''
    });
  });
}

function getKiemKho(payload) {
  payload = payload || {};

  const sheet = getSheet(
    getDataSpreadsheet(),
    CONFIG.SHEETS.KIEM_KHO
  );

  let rows = getRowsObject(sheet);

  if (payload.maKhuVuc) {
    rows = rows.filter(r =>
      String(r.MaKhuVuc || '').trim() === String(payload.maKhuVuc).trim() ||
      String(r.TenKhuVuc || '').trim() === String(payload.maKhuVuc).trim()
    );
  }

  if (payload.ngayToChuc) {
    rows = rows.filter(r =>
      String(r.NgayToChuc || '').slice(0, 10) === String(payload.ngayToChuc).slice(0, 10)
    );
  }

  return sendSuccess(rows);
}

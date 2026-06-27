function xuatNhapKho(payload) {
  payload = payload || {};

  const sheet = getSheet(
    getDataSpreadsheet(),
    CONFIG.SHEETS.XUAT_NHAP_KHO
  );

  const maPhieu = generateId('PX');

  const data = {
    MaPhieu: maPhieu,
    ThoiGianNhap: new Date(),
    LoaiPhieu: payload.LoaiPhieu || '',
    NgayPhieu: payload.NgayPhieu || '',
    TuKhuVuc: payload.TuKhuVuc || '',
    DenKhuVuc: payload.DenKhuVuc || '',

    OngHutTre: Number(payload.OngHutTre || 0),
    OngHutCoBang: Number(payload.OngHutCoBang || 0),
    OngHutCoSay: Number(payload.OngHutCoSay || 0),
    OngHutGao: Number(payload.OngHutGao || 0),
    ButBi: Number(payload.ButBi || 0),
    SenDa: Number(payload.SenDa || 0),
    MassageTay: Number(payload.MassageTay || 0),
    GiacHoi: Number(payload.GiacHoi || 0),
    Fuwa3e: Number(payload.Fuwa3e || 0),
    MocKhoaTreViet: Number(payload.MocKhoaTreViet || 0),
    CoRuaOngHut: Number(payload.CoRuaOngHut || 0),
    BanChai: Number(payload.BanChai || 0),

    HuNhua: Number(payload.HuNhua || 0),
    MetRo: Number(payload.MetRo || 0),
    Can: Number(payload.Can || 0),
    TuiGiay: Number(payload.TuiGiay || 0),
    BanGhe: Number(payload.BanGhe || 0),
    CSVC: Number(payload.CSVC || 0),

    NguoiLap: payload.NguoiLap || '',
    NguoiXacNhan: '',
    TrangThai: 'ChoDuyet',
    GhiChu: payload.GhiChu || ''
  };
  // dynamic product columns
  getAllSanPhamKeys_().forEach(function(k) {
    data[k] = Number(payload[k] || 0);
  });

  appendObject(sheet, data);

  return sendSuccess({
    maPhieu: maPhieu
  });
}

function getTonKho(payload) {
  payload = payload || {};

  const khuVuc = String(
    payload.maKhuVuc ||
    payload.MaKhuVuc ||
    payload.tenKhuVuc ||
    payload.TenKhuVuc ||
    ''
  ).trim();

  if (!khuVuc) {
    return sendError('Thiếu khu vực để lấy tồn kho');
  }

  const result = tinhTonKhoTheoKhuVucChiTiet_(khuVuc);

  return sendSuccess({
    maKhuVuc: khuVuc,
    tonKho: result.tonKho,
    tonKhoSource: result.source
  });
}

/**
 * Hàm cũ vẫn giữ tên để các file khác không lỗi.
 * Từ bản này, tồn kho ưu tiên lấy từ phiếu kiểm kho mới nhất của điểm.
 */
function tinhTonKhoTheoKhuVuc(khuVuc) {
  return tinhTonKhoTheoKhuVucChiTiet_(khuVuc).tonKho;
}

/**
 * Logic tồn động hoàn chỉnh:
 * 1. Lấy phiếu KiemKho mới nhất của điểm làm MỐC GỐC.
 * 2. Tồn gốc = các cột *_ThucTe của phiếu kiểm đó.
 * 3. Sau mốc đó:
 *    - Phiếu kho nhập/chuyển đến điểm: cộng thêm.
 *    - Phiếu kho xuất/chuyển khỏi điểm: trừ đi.
 *    - Giao dịch đã đổi hàng: trừ đi các cột HangDoi_*.
 * 4. Nếu điểm chưa từng kiểm kho: tồn = 0 + phát sinh phiếu kho - giao dịch.
 *
 * Như vậy chương trình KHÔNG cần nhập hàng hóa ban đầu.
 * TNV đếm đầu buổi -> tồn hiện tại tại điểm = số đếm đầu buổi.
 * Trong buổi -> giao dịch trừ dần tồn realtime.
 * TNV đếm cuối buổi -> hệ thống so số đếm cuối buổi với tồn lý thuyết đã trừ giao dịch.
 */
function tinhTonKhoTheoKhuVucChiTiet_(khuVuc) {
  const ss = getDataSpreadsheet();
  const xuatNhapSheet = getSheet(ss, CONFIG.SHEETS.XUAT_NHAP_KHO);
  const giaoDichSheet = getSheet(ss, CONFIG.SHEETS.GIAO_DICH);

  const rowsKho = getRowsObject(xuatNhapSheet);
  const rowsGiaoDich = getRowsObject(giaoDichSheet);
  const items = getStockItemKeys_();

  const ton = {};
  items.forEach(k => ton[k] = 0);

  const checkpoint = getLatestKiemKhoCheckpoint_(khuVuc);

  if (checkpoint) {
    items.forEach(k => {
      ton[k] = getStockNumberFromRow_(checkpoint.row, k, '_ThucTe');
    });

    const checkpointTime = checkpoint.time || new Date(0);

    // Nếu có phiếu kho phát sinh SAU lần kiểm gần nhất thì cộng/trừ thêm.
    // Lưu ý: XuatNhapKho hiện chỉ có NgayPhieu, không có giờ, nên phần này chủ yếu phục vụ các phiếu có ngày sau ngày kiểm.
    rowsKho.forEach(r => {
      const rowTime = parseDateTime_(r.ThoiGianNhap || r.NgayPhieu || '');
      if (!rowTime || rowTime <= checkpointTime) return;

      const tu = String(r.TuKhuVuc || '').trim();
      const den = String(r.DenKhuVuc || '').trim();

      items.forEach(k => {
        const soLuong = getStockNumberFromRow_(r, k, '');
        if (den === khuVuc) ton[k] += soLuong;
        if (tu === khuVuc) ton[k] -= soLuong;
      });
    });

    rowsGiaoDich.forEach(r => {
      if (!isSameKhuVuc_(r, khuVuc)) return;
      if (isGiaoDichLoi_(r)) return;

      const rowTime = parseDateTime_(r.ThoiGianNhap || '');
      if (!rowTime || rowTime <= checkpointTime) return;

      getExchangeItemKeys_().forEach(k => {
        ton[k] -= getStockNumberFromRow_(r, k, '', 'HangDoi_');
      });
    });

    items.forEach(k => {
      if (ton[k] < 0) ton[k] = 0;
    });

    return {
      tonKho: ton,
      source: {
        type: 'KiemKho',
        maKiemKho: checkpoint.row.MaKiemKho || '',
        thoiGianNhap: checkpoint.row.ThoiGianNhap || '',
        ngayToChuc: checkpoint.row.NgayToChuc || '',
        buoiToChuc: checkpoint.row.BuoiToChuc || '',
        loaiKiem: checkpoint.row.LoaiKiem || ''
      }
    };
  }

  // Logic dự phòng khi điểm chưa từng kiểm kho.
  rowsKho.forEach(r => {
    const tu = String(r.TuKhuVuc || '').trim();
    const den = String(r.DenKhuVuc || '').trim();

    items.forEach(k => {
      const soLuong = getStockNumberFromRow_(r, k, '');
      if (den === khuVuc) ton[k] += soLuong;
      if (tu === khuVuc) ton[k] -= soLuong;
    });
  });

  rowsGiaoDich.forEach(r => {
    if (!isSameKhuVuc_(r, khuVuc)) return;
    if (isGiaoDichLoi_(r)) return;

    getExchangeItemKeys_().forEach(k => {
      ton[k] -= getStockNumberFromRow_(r, k, '', 'HangDoi_');
    });
  });

  items.forEach(k => {
    if (ton[k] < 0) ton[k] = 0;
  });

  return {
    tonKho: ton,
    source: {
      type: 'TinhTuPhieuKho',
      maKiemKho: '',
      thoiGianNhap: '',
      ngayToChuc: '',
      buoiToChuc: '',
      loaiKiem: ''
    }
  };
}

function getLatestKiemKhoCheckpoint_(khuVuc) {
  const ss = getDataSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.KIEM_KHO);
  if (!sheet) return null;

  const rows = getRowsObject(sheet)
    .filter(r => {
      const ma = String(r.MaKhuVuc || '').trim();
      const ten = String(r.TenKhuVuc || '').trim();
      return ma === khuVuc || ten === khuVuc;
    })
    .map(r => ({
      row: r,
      time: parseDateTime_(r.ThoiGianNhap || r.NgayToChuc || '')
    }))
    .filter(x => x.time);

  if (!rows.length) return null;

  rows.sort((a, b) => b.time - a.time);
  return rows[0];
}

function isSameKhuVuc_(row, khuVuc) {
  const ma = String(row.MaKhuVuc || '').trim();
  const ten = String(row.TenKhuVuc || '').trim();
  return ma === khuVuc || ten === khuVuc;
}

function isGiaoDichLoi_(row) {
  const trangThai = String(row.TrangThai || '').trim().toLowerCase();
  return trangThai === 'loi' || trangThai === 'lỗi' || trangThai === 'daxoa' || trangThai === 'da xoa' || trangThai === 'đã xóa';
}

function parseDateTime_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value;
  }

  const s = String(value || '').trim();
  if (!s) return null;

  const d1 = new Date(s);
  if (!isNaN(d1.getTime())) return d1;

  // Hỗ trợ dd/MM/yyyy hoặc dd/MM/yyyy HH:mm:ss
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (m) {
    return new Date(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1]),
      Number(m[4] || 0),
      Number(m[5] || 0),
      Number(m[6] || 0)
    );
  }

  return null;
}


function getStockNumberFromRow_(row, key, suffix, prefix) {
  row = row || {};
  suffix = suffix || '';
  prefix = prefix || '';

  const aliases = getStockKeyAliases_(key);

  for (let i = 0; i < aliases.length; i++) {
    const field = prefix + aliases[i] + suffix;
    if (row[field] !== undefined && row[field] !== '') {
      const n = Number(row[field]);
      return Number.isFinite(n) ? n : 0;
    }
  }

  return 0;
}

function getStockKeyAliases_(key) {
  if (key === 'Fuwa3e') {
    return [
      'Fuwa3e',
      'Fuwa3E',
      'FUWA3E',
      'Fuwa',
      'Fuwa_3e',
      'NuocRuaChenFuwa3e',
      'NuocRuaChen',
      'LauSanFuwa3e'
    ];
  }

  return [key];
}

function getExchangeItemKeys_() {
  return getSanPhamKeysByLoai_('HangDoi');
}

function getDisplayItemKeys_() {
  return getSanPhamKeysByLoai_('HangTrungBay');
}

function getStockItemKeys_() {
  return getExchangeItemKeys_().concat(getDisplayItemKeys_());
}

function getItemDisplayName_(key) {
  const map = {
    OngHutTre: 'Ống hút tre',
    OngHutCoBang: 'Ống hút cỏ bàng',
    OngHutCoSay: 'Ống hút cỏ sậy',
    OngHutGao: 'Ống hút gạo/ngũ cốc',
    ButBi: 'Bút bi nhựa tái chế',
    SenDa: 'Cây sen đá',
    MassageTay: 'Massage tay nhựa tái chế',
    GiacHoi: 'Bộ giác hơi nhựa tái chế',
    Fuwa3e: 'Nước rửa chén/lau sàn/giặt/vệ sinh bồn cầu Fuwa3e',
    MocKhoaTreViet: 'Móc khóa nón lá TreViet',
    CoRuaOngHut: 'Cọ rửa ống hút',
    BanChai: 'Bàn chải',
    HuNhua: 'Hũ nhựa',
    MetRo: 'Mét rổ',
    Can: 'Cân',
    TuiGiay: 'Túi giấy',
    BanGhe: 'Bàn ghế',
    CSVC: 'Cơ sở vật chất'
  };

  return map[key] || key;
}


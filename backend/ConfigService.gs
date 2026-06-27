function getConfig() {
  const configSS = getConfigSpreadsheet();
  const dataSS = getDataSpreadsheet();

  const khuVucSheet = getSheetRequired(
    configSS,
    CONFIG.SHEETS.KHU_VUC
  );

  const lastRow = khuVucSheet.getLastRow();
  let khuVuc = [];

  if (lastRow >= 2) {
    const values = khuVucSheet
      .getRange(2, 2, lastRow - 1, 1)
      .getValues();

    khuVuc = values
      .map((row) => ({
        maKhuVuc: row[0],
        tenKhuVuc: row[0]
      }))
      .filter(item => item.tenKhuVuc);
  }

  const tuanSheet = getSheetRequired(
    dataSS,
    CONFIG.SHEETS.CAU_HINH_TUAN
  );

  const tuanRows = getRowsObject(tuanSheet);
  const active = tuanRows.find(r => {
    const status = String(r.TrangThai || '').trim().toLowerCase();
    return status === 'active' || status === 'hoạt động' || status === 'hoạt động';
  });

  const sanPham = getCatalogSanPham_();

  return sendSuccess({
    khuVuc: khuVuc,
    tuanActive: active || null,
    hangDoi: sanPham.hangDoi,
    hangTrungBay: sanPham.hangTrungBay
  });
}

function getBangQuyDoi(maTuan) {
  const sheet = getSheetRequired(
    getDataSpreadsheet(),
    CONFIG.SHEETS.BANG_QUY_DOI
  );

  const rows = getRowsObject(sheet)
    .filter(r => String(r.MaTuan) === String(maTuan));

  return sendSuccess({
    maTuan: maTuan,
    rows: rows
  });
}

function testReadConfigSheets() {
  const ss = getConfigSpreadsheet();
  const khuVucSheet = getSheetRequired(ss, CONFIG.SHEETS.KHU_VUC);
  const adminSheet = getSheetRequired(ss, CONFIG.SHEETS.PHAN_QUYEN);

  Logger.log('Đọc được sheet CauHinhKhuVuc: ' + khuVucSheet.getName());
  Logger.log('Số dòng khu vực: ' + khuVucSheet.getLastRow());
  Logger.log('Đọc được sheet PhanQuyen_Admin: ' + adminSheet.getName());
  Logger.log('Số dòng admin: ' + adminSheet.getLastRow());
  Logger.log(JSON.stringify(getRowsObject(khuVucSheet), null, 2));
  Logger.log(JSON.stringify(getRowsObject(adminSheet), null, 2));
}

const DEFAULT_HANG_DOI_SAN_PHAM_ = [
  { key: 'OngHutTre', label: 'Ống hút tre' },
  { key: 'OngHutCoBang', label: 'Ống hút cỏ bàng' },
  { key: 'OngHutCoSay', label: 'Ống hút cỏ sậy' },
  { key: 'OngHutGao', label: 'Ống hút gạo/ngũ cốc' },
  { key: 'ButBi', label: 'Bút bi nhựa tái chế' },
  { key: 'SenDa', label: 'Cây sen đá' },
  { key: 'MassageTay', label: 'Massage tay nhựa tái chế' },
  { key: 'GiacHoi', label: 'Bộ giác hơi nhựa tái chế' },
  { key: 'Fuwa3e', label: 'Nước rửa chén/lau sàn/giặt/vệ sinh bồn cầu Fuwa3e' },
  { key: 'MocKhoaTreViet', label: 'Móc khóa nón lá TreViet' },
  { key: 'CoRuaOngHut', label: 'Cọ rửa ống hút' }
];

const DEFAULT_HANG_TRUNG_BAY_SAN_PHAM_ = [
  { key: 'HuNhua', label: 'Hũ nhựa' },
  { key: 'MetRo', label: 'Mẹt/rổ' },
  { key: 'Can', label: 'Cân' },
  { key: 'TuiGiay', label: 'Túi giấy' },
  { key: 'BanGhe', label: 'Bàn ghế' },
  { key: 'CSVC', label: 'CSVC khác' }
];

function getDefaultSanPham_() {
  return DEFAULT_HANG_DOI_SAN_PHAM_.map(function(item, index) {
    return { key: item.key, label: item.label, loaiSanPham: 'HangDoi', thuTu: index + 1, trangThai: 'HoatDong' };
  }).concat(DEFAULT_HANG_TRUNG_BAY_SAN_PHAM_.map(function(item, index) {
    return { key: item.key, label: item.label, loaiSanPham: 'HangTrungBay', thuTu: 100 + index + 1, trangThai: 'HoatDong' };
  }));
}

function ensureSanPhamSheet_() {
  const ss = getConfigSpreadsheet();
  const sheetName = CONFIG.SHEETS.SAN_PHAM || 'CauHinhSanPham';
  let sheet = ss.getSheetByName(sheetName);
  let created = false;

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    created = true;
  }

  const headers = ['MaSanPham', 'TenSanPham', 'LoaiSanPham', 'TrangThai', 'ThuTu', 'GhiChu'];
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0 || sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getDisplayValues()[0].join('').trim() === '') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    if (typeof formatHeader_ === 'function') formatHeader_(sheet, headers.length);
    created = true;
  } else {
    ensureColumnsByHeader_(sheet, headers);
  }

  if (created && sheet.getLastRow() < 2) {
    getDefaultSanPham_().forEach(function(item) {
      appendObject(sheet, {
        MaSanPham: item.key,
        TenSanPham: item.label,
        LoaiSanPham: item.loaiSanPham,
        TrangThai: item.trangThai,
        ThuTu: item.thuTu,
        GhiChu: 'Default'
      });
    });
  }

  return sheet;
}

function getCatalogSanPham_() {
  const sheet = ensureSanPhamSheet_();
  const rows = getRowsObject(sheet)
    .map(function(row) {
      return {
        key: normalizeSanPhamKey_(row.MaSanPham || row.key || ''),
        label: String(row.TenSanPham || row.label || '').trim(),
        loaiSanPham: String(row.LoaiSanPham || row.loaiSanPham || 'HangDoi').trim(),
        trangThai: String(row.TrangThai || row.trangThai || 'HoatDong').trim(),
        thuTu: Number(row.ThuTu || row.thuTu || 9999)
      };
    })
    .filter(function(item) { return item.key && item.label && !isInactiveSanPham_(item.trangThai); })
    .sort(function(a, b) { return Number(a.thuTu || 0) - Number(b.thuTu || 0); });

  const hangDoi = rows.filter(function(item) { return item.loaiSanPham === 'HangDoi'; });
  const hangTrungBay = rows.filter(function(item) { return item.loaiSanPham === 'HangTrungBay'; });

  return {
    hangDoi: hangDoi.length ? hangDoi : DEFAULT_HANG_DOI_SAN_PHAM_.map(function(item) { return { key: item.key, label: item.label, loaiSanPham: 'HangDoi' }; }),
    hangTrungBay: hangTrungBay.length ? hangTrungBay : DEFAULT_HANG_TRUNG_BAY_SAN_PHAM_.map(function(item) { return { key: item.key, label: item.label, loaiSanPham: 'HangTrungBay' }; })
  };
}

function getSanPhamKeysByLoai_(loaiSanPham) {
  const catalog = getCatalogSanPham_();
  const list = loaiSanPham === 'HangTrungBay' ? catalog.hangTrungBay : catalog.hangDoi;
  return list.map(function(item) { return item.key; });
}

function getAllSanPhamKeys_() {
  const catalog = getCatalogSanPham_();
  return catalog.hangDoi.concat(catalog.hangTrungBay).map(function(item) { return item.key; });
}

function addSanPham(payload) {
  payload = payload || {};
  requireAdminToken_(payload.token);

  const key = normalizeSanPhamKey_(payload.maSanPham || payload.MaSanPham || payload.key || payload.tenSanPham || payload.TenSanPham);
  const label = String(payload.tenSanPham || payload.TenSanPham || payload.label || '').trim();
  const loaiSanPham = String(payload.loaiSanPham || payload.LoaiSanPham || 'HangDoi').trim() === 'HangTrungBay' ? 'HangTrungBay' : 'HangDoi';

  if (!key) return sendError('Thiếu mã sản phẩm');
  if (!label) return sendError('Thiếu tên sản phẩm');

  const sheet = ensureSanPhamSheet_();
  const rows = getRowsObject(sheet);
  const existed = rows.some(function(row) { return normalizeSanPhamKey_(row.MaSanPham) === key; });
  if (existed) return sendError('Mã sản phẩm đã tồn tại: ' + key);

  appendObject(sheet, {
    MaSanPham: key,
    TenSanPham: label,
    LoaiSanPham: loaiSanPham,
    TrangThai: 'HoatDong',
    ThuTu: rows.length + 1,
    GhiChu: payload.ghiChu || payload.GhiChu || ''
  });

  const addedColumns = syncSanPhamColumns_(key, loaiSanPham, 'add');

  return sendSuccess({
    sanPham: { key: key, label: label, loaiSanPham: loaiSanPham },
    addedColumns: addedColumns
  });
}

function deleteSanPham(payload) {
  payload = payload || {};
  requireAdminToken_(payload.token);

  const key = normalizeSanPhamKey_(payload.maSanPham || payload.MaSanPham || payload.key);
  if (!key) return sendError('Thiếu mã sản phẩm');

  const sheet = ensureSanPhamSheet_();
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(cleanHeader);
  const keyIdx = headers.indexOf('MaSanPham');
  const loaiIdx = headers.indexOf('LoaiSanPham');
  let rowIndex = -1;
  let loaiSanPham = 'HangDoi';

  for (let i = 1; i < values.length; i++) {
    if (normalizeSanPhamKey_(values[i][keyIdx]) === key) {
      rowIndex = i + 1;
      loaiSanPham = String(values[i][loaiIdx] || 'HangDoi').trim() === 'HangTrungBay' ? 'HangTrungBay' : 'HangDoi';
      break;
    }
  }

  if (rowIndex === -1) return sendError('Không tìm thấy sản phẩm: ' + key);

  sheet.deleteRow(rowIndex);
  const deletedColumns = syncSanPhamColumns_(key, loaiSanPham, 'delete');

  return sendSuccess({ maSanPham: key, deletedColumns: deletedColumns });
}

function syncAllSanPhamColumns_() {
  const catalog = getCatalogSanPham_();
  let changed = [];
  catalog.hangDoi.forEach(function(item) { changed = changed.concat(syncSanPhamColumns_(item.key, 'HangDoi', 'add')); });
  catalog.hangTrungBay.forEach(function(item) { changed = changed.concat(syncSanPhamColumns_(item.key, 'HangTrungBay', 'add')); });
  return changed;
}

function syncSanPhamColumns_(key, loaiSanPham, mode) {
  const ss = getDataSpreadsheet();
  const columns = [];
  const kiemKhoCols = [
    key + '_TonDau', key + '_NhanThem', key + '_DaDoi', key + '_HongHu', key + '_TonCuoi', key + '_ThucTe', key + '_Hut'
  ];

  if (loaiSanPham === 'HangDoi') {
    columns.push({ sheet: CONFIG.SHEETS.GIAO_DICH, headers: ['HangDoi_' + key] });
  }
  columns.push({ sheet: CONFIG.SHEETS.KIEM_KHO, headers: kiemKhoCols });
  columns.push({ sheet: CONFIG.SHEETS.XUAT_NHAP_KHO, headers: [key] });

  let touched = [];
  columns.forEach(function(def) {
    const sheet = ss.getSheetByName(def.sheet);
    if (!sheet) return;
    if (mode === 'delete') {
      touched = touched.concat(deleteColumnsByHeader_(sheet, def.headers).map(function(h) { return def.sheet + '.' + h; }));
    } else {
      touched = touched.concat(ensureColumnsByHeader_(sheet, def.headers).map(function(h) { return def.sheet + '.' + h; }));
    }
  });

  SpreadsheetApp.flush();
  return touched;
}

function ensureColumnsByHeader_(sheet, requiredHeaders) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const current = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(cleanHeader);
  const missing = requiredHeaders.filter(function(header) { return current.indexOf(header) === -1; });
  if (missing.length) {
    sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
    if (typeof formatHeader_ === 'function') formatHeader_(sheet, current.length + missing.length);
  }
  return missing;
}

function deleteColumnsByHeader_(sheet, headersToDelete) {
  const lastCol = sheet.getLastColumn();
  if (!lastCol) return [];
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(cleanHeader);
  const indexes = [];
  headers.forEach(function(header, index) {
    if (headersToDelete.indexOf(header) !== -1) indexes.push(index + 1);
  });
  indexes.sort(function(a, b) { return b - a; });
  indexes.forEach(function(col) { sheet.deleteColumn(col); });
  return indexes.map(function(col) { return headers[col - 1]; });
}

function requireAdminToken_(token) {
  if (!token) throw new Error('Thiếu token admin');
  const raw = CacheService.getScriptCache().get(token);
  if (!raw) throw new Error('Phiên đăng nhập hết hạn');
  return JSON.parse(raw);
}

function normalizeSanPhamKey_(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const cleaned = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map(function(part) { return part.charAt(0).toUpperCase() + part.slice(1); })
    .join('');
  return cleaned.replace(/^[0-9]+/, '');
}

function isInactiveSanPham_(status) {
  const s = String(status || '').trim().toLowerCase();
  return s === 'inactive' || s === 'khonghoatdong' || s === 'không hoạt động' || s === 'xoa' || s === 'daxoa';
}


function submitGiaoDich(payload) {
  payload = payload || {};

  const sheet = getSheet(getDataSpreadsheet(), CONFIG.SHEETS.GIAO_DICH);
  const maTuan = String(payload.MaTuan || payload.maTuan || getCurrentMaTuan_() || '').trim();
  const diem = tinhDiemGoi(payload, maTuan);
  // Từ bản điều chỉnh này AI đề xuất theo bảng quy đổi, không còn chặn bằng điểm gói.
  const tongDiemDoiHang = tinhDiemDoiHangDaChon_(payload, maTuan);

  const duplicate = findRecentDuplicateGiaoDich_(sheet, payload, 30);
  if (duplicate) {
    return sendSuccess({
      maGiaoDich: duplicate.MaGiaoDich,
      tongDiemGoi: Number(duplicate.TongDiemGoi || 0),
      tongDiemDoiHang: Number(duplicate.TongDiemDoiHang || 0),
      duplicate: true,
      message: 'Giao dịch giống hệt vừa được lưu trong 30 giây trước, hệ thống không lưu trùng.'
    });
  }

  const maGiaoDich = generateId('GD');

  const data = {
    MaGiaoDich: maGiaoDich,
    ThoiGianNhap: new Date(),
    MaKhuVuc: payload.MaKhuVuc || '',
    TenKhuVuc: payload.TenKhuVuc || '',
    NgayToChuc: payload.NgayToChuc || '',
    BuoiToChuc: payload.BuoiToChuc || '',
    HoTenNguoiUngHo: payload.HoTenNguoiUngHo || '',
    SoDienThoai: payload.SoDienThoai || '',

    NhomA_KG: Number(payload.NhomA_KG || 0),
    NhomB_KG: Number(payload.NhomB_KG || 0),

    NhomC_CapTui: Number(payload.NhomC_CapTui || 0),
    NhomC_BoDungCu: Number(payload.NhomC_BoDungCu || 0),
    NhomC_QuanAo_KG: Number(payload.NhomC_QuanAo_KG || 0),
    NhomC_DoChoi_Cai: Number(payload.NhomC_DoChoi_Cai || 0),
    NhomC_TapVo_Quyen: Number(payload.NhomC_TapVo_Quyen || 0),

    NhomD_GiayBao_KG: Number(payload.NhomD_GiayBao_KG || 0),
    NhomD_Carton_KG: Number(payload.NhomD_Carton_KG || 0),
    NhomD_VoSua_Cai: Number(payload.NhomD_VoSua_Cai || 0),
    NhomD_Nhua_Cai: Number(payload.NhomD_Nhua_Cai || payload.NhomD_Nhua_KG || 0),
    NhomD_VoLon_Cai: Number(payload.NhomD_VoLon_Cai || 0),

    DiemGoi_A: diem.diemA,
    DiemGoi_B: diem.diemB,
    DiemGoi_C: diem.diemC,
    DiemGoi_D: diem.diemD,
    TongDiemGoi: diem.tongDiem,

    HangDoi_OngHutTre: Number(payload.HangDoi_OngHutTre || 0),
    HangDoi_OngHutCoBang: Number(payload.HangDoi_OngHutCoBang || 0),
    HangDoi_OngHutCoSay: Number(payload.HangDoi_OngHutCoSay || 0),
    HangDoi_OngHutGao: Number(payload.HangDoi_OngHutGao || 0),
    HangDoi_ButBi: Number(payload.HangDoi_ButBi || 0),
    HangDoi_SenDa: Number(payload.HangDoi_SenDa || 0),
    HangDoi_MassageTay: Number(payload.HangDoi_MassageTay || 0),
    HangDoi_GiacHoi: Number(payload.HangDoi_GiacHoi || 0),
    HangDoi_Fuwa3e: Number(payload.HangDoi_Fuwa3e || 0),
    HangDoi_MocKhoaTreViet: Number(payload.HangDoi_MocKhoaTreViet || 0),
    HangDoi_CoRuaOngHut: Number(payload.HangDoi_CoRuaOngHut || 0),
    HangDoi_BanChai: Number(payload.HangDoi_BanChai || 0),

    TongDiemDoiHang: tongDiemDoiHang,
    TrangThai: 'Hop le',
    GhiChu: payload.GhiChu || '',
    EmailTNV: payload.EmailTNV || '',
    MaTuan: maTuan
  };
  // dynamic exchange product columns
  getSanPhamKeysByLoai_('HangDoi').forEach(function(k) {
    data['HangDoi_' + k] = Number(payload['HangDoi_' + k] || 0);
  });

  appendObject(sheet, data);

  return sendSuccess({
    maGiaoDich,
    tongDiemGoi: diem.tongDiem,
    tongDiemDoiHang
  });
}

function tinhDiemDoiHangDaChon_(payload, maTuan) {
  const fields = getSanPhamKeysByLoai_('HangDoi');
  return fields.reduce(function(sum, k) {
    return sum + Number(payload['HangDoi_' + k] || 0);
  }, 0);
}


/** ===== Lịch sử / Tra cứu / Sửa / Xóa giao dịch ===== */

function getGiaoDich(payload) {
  payload = payload || {};

  const sheet = getSheet(getDataSpreadsheet(), CONFIG.SHEETS.GIAO_DICH);
  let rows = getRowsObjectWithRow_(sheet);

  const keyword = normalizeSearchText_(payload.keyword || payload.tuKhoa || '');
  const maKhuVuc = String(payload.maKhuVuc || payload.MaKhuVuc || '').trim();
  const maTuan = String(payload.maTuan || payload.MaTuan || '').trim();
  const limit = Number(payload.limit || 20);
  const offset = Math.max(0, Number(payload.offset || 0));

  if (maKhuVuc) {
    rows = rows.filter(r => String(r.MaKhuVuc || '').trim() === maKhuVuc);
  }

  if (maTuan) {
    rows = rows.filter(r => String(r.MaTuan || '').trim() === maTuan);
  }

  if (keyword) {
    rows = rows.filter(r => {
      const haystack = [
        r.MaGiaoDich,
        r.SoDienThoai,
        r.EmailTNV,
        r.HoTenNguoiUngHo,
        r.TenKhuVuc,
        r.MaKhuVuc
      ].map(normalizeSearchText_).join(' ');
      return haystack.indexOf(keyword) !== -1;
    });
  }

  rows.sort((a, b) => new Date(b.ThoiGianNhap || 0) - new Date(a.ThoiGianNhap || 0));

  return sendSuccess({
    total: rows.length,
    limit: limit,
    offset: offset,
    rows: rows.slice(offset, offset + limit).map(formatGiaoDichRow_)
  });
}

function updateGiaoDich(payload) {
  payload = payload || {};

  const maGiaoDich = String(payload.MaGiaoDich || payload.maGiaoDich || '').trim();
  if (!maGiaoDich) return sendError('Thiếu mã giao dịch cần điều chỉnh');

  const sheet = getSheet(getDataSpreadsheet(), CONFIG.SHEETS.GIAO_DICH);
  const found = findRowByMaGiaoDich_(sheet, maGiaoDich);
  if (!found) return sendError('Không tìm thấy giao dịch: ' + maGiaoDich);

  const old = found.obj;
  const merged = {};
  Object.keys(old).forEach(k => merged[k] = old[k]);
  Object.keys(payload).forEach(k => merged[k] = payload[k]);

  const maTuan = String(merged.MaTuan || getCurrentMaTuan_() || '').trim();
  const diem = tinhDiemGoi(merged, maTuan);
  const tongDiemDoiHang = tinhDiemDoiHangDaChon_(merged, maTuan);

  merged.DiemGoi_A = diem.diemA;
  merged.DiemGoi_B = diem.diemB;
  merged.DiemGoi_C = diem.diemC;
  merged.DiemGoi_D = diem.diemD;
  merged.TongDiemGoi = diem.tongDiem;
  merged.TongDiemDoiHang = tongDiemDoiHang;
  merged.TrangThai = merged.TrangThai || 'Hop le';

  writeObjectToRow_(sheet, found.rowIndex, merged);

  return sendSuccess({
    maGiaoDich: maGiaoDich,
    row: formatGiaoDichRow_(merged)
  });
}

function deleteGiaoDich(payload) {
  payload = payload || {};

  const maGiaoDich = String(payload.MaGiaoDich || payload.maGiaoDich || '').trim();
  if (!maGiaoDich) return sendError('Thiếu mã giao dịch cần xóa');

  const sheet = getSheet(getDataSpreadsheet(), CONFIG.SHEETS.GIAO_DICH);
  const found = findRowByMaGiaoDich_(sheet, maGiaoDich);
  if (!found) return sendError('Không tìm thấy giao dịch: ' + maGiaoDich);

  const oldStatus = String(found.obj.TrangThai || '').trim().toLowerCase();
  if (oldStatus === 'daxoa' || oldStatus === 'da xoa' || oldStatus === 'đã xóa') {
    return sendSuccess({
      maGiaoDich: maGiaoDich,
      daXoaTruocDo: true,
      message: 'Giao dịch này đã được đánh dấu xóa trước đó.'
    });
  }

  // Không xóa dòng vật lý để vẫn giữ lịch sử đối chiếu.
  // Tồn kho sẽ tự hoàn lại vì Kho.gs bỏ qua các giao dịch TrangThai = DaXoa.
  const updated = {};
  Object.keys(found.obj).forEach(k => updated[k] = found.obj[k]);
  updated.TrangThai = 'DaXoa';

  const nguoiXoa = payload.EmailAdmin || payload.emailAdmin || payload.NguoiXoa || '';
  const note = 'Đã xóa giao dịch lúc ' + new Date().toLocaleString('vi-VN') + (nguoiXoa ? ' bởi ' + nguoiXoa : '');
  updated.GhiChu = [String(updated.GhiChu || '').trim(), note].filter(Boolean).join(' | ');

  writeObjectToRow_(sheet, found.rowIndex, updated);

  return sendSuccess({
    maGiaoDich: maGiaoDich,
    restoredInventory: true,
    message: 'Đã đánh dấu xóa. Hàng đã đổi của giao dịch này sẽ được hoàn lại vào tồn kho tự động.'
  });
}


function buildDuplicateSignatureFromPayload_(payload) {
  const keys = [
    'MaKhuVuc','TenKhuVuc','NgayToChuc','BuoiToChuc','HoTenNguoiUngHo','SoDienThoai','EmailTNV','MaTuan',
    'NhomA_KG','NhomB_KG','NhomC_CapTui','NhomC_BoDungCu','NhomC_QuanAo_KG','NhomC_DoChoi_Cai','NhomC_TapVo_Quyen',
    'NhomD_GiayBao_KG','NhomD_Carton_KG','NhomD_VoSua_Cai','NhomD_Nhua_Cai','NhomD_Nhua_KG','NhomD_VoLon_Cai',
    'HangDoi_OngHutTre','HangDoi_OngHutCoBang','HangDoi_OngHutCoSay','HangDoi_OngHutGao','HangDoi_ButBi','HangDoi_SenDa','HangDoi_MassageTay','HangDoi_GiacHoi','HangDoi_Fuwa3e','HangDoi_MocKhoaTreViet','HangDoi_CoRuaOngHut','HangDoi_BanChai'
  ];
  // dynamic duplicate HangDoi
  getSanPhamKeysByLoai_('HangDoi').forEach(function(k) {
    const field = 'HangDoi_' + k;
    if (keys.indexOf(field) === -1) keys.push(field);
  });

  return keys.map(k => {
    const raw = payload[k] !== undefined ? payload[k] : '';
    const isNumberField = /^(Nhom|HangDoi_)/.test(k);
    return k + '=' + (isNumberField ? Number(raw || 0) : normalizeSearchText_(raw));
  }).join('|');
}

function buildDuplicateSignatureFromRow_(row) {
  const p = {};
  Object.keys(row || {}).forEach(k => p[k] = row[k]);
  return buildDuplicateSignatureFromPayload_(p);
}

function findRecentDuplicateGiaoDich_(sheet, payload, secondsWindow) {
  const sig = buildDuplicateSignatureFromPayload_(payload);
  const now = new Date();
  const rows = getRowsObjectWithRow_(sheet);

  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (isDeletedGiaoDichStatus_(r)) continue;

    const rowTime = parseGiaoDichDate_(r.ThoiGianNhap || '');
    if (!rowTime) continue;

    const diffSeconds = Math.abs(now.getTime() - rowTime.getTime()) / 1000;
    if (diffSeconds > Number(secondsWindow || 30)) continue;

    if (buildDuplicateSignatureFromRow_(r) === sig) {
      return r;
    }
  }

  return null;
}

function isDeletedGiaoDichStatus_(row) {
  const s = String(row.TrangThai || '').trim().toLowerCase();
  return s === 'daxoa' || s === 'da xoa' || s === 'đã xóa';
}

function parseGiaoDichDate_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) return value;

  const d = new Date(value);
  if (!isNaN(d.getTime())) return d;

  const s = String(value || '').trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (m) {
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
  }

  return null;
}

function getRowsObjectWithRow_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(cleanHeader);

  return values.slice(1)
    .map((row, idx) => {
      const obj = { _rowIndex: idx + 2 };
      headers.forEach((h, i) => {
        if (h) obj[h] = row[i];
      });
      return obj;
    })
    .filter(obj => Object.keys(obj).some(k => k !== '_rowIndex' && obj[k] !== '' && obj[k] !== null));
}

function findRowByMaGiaoDich_(sheet, maGiaoDich) {
  const rows = getRowsObjectWithRow_(sheet);
  const found = rows.find(r => String(r.MaGiaoDich || '').trim() === maGiaoDich);
  return found ? { rowIndex: found._rowIndex, obj: found } : null;
}

function writeObjectToRow_(sheet, rowIndex, obj) {
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(cleanHeader);

  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
}

function normalizeSearchText_(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

function formatGiaoDichRow_(r) {
  const out = {
    MaGiaoDich: r.MaGiaoDich || '',
    ThoiGianNhap: r.ThoiGianNhap || '',
    MaKhuVuc: r.MaKhuVuc || '',
    TenKhuVuc: r.TenKhuVuc || '',
    NgayToChuc: r.NgayToChuc || '',
    BuoiToChuc: r.BuoiToChuc || '',
    HoTenNguoiUngHo: r.HoTenNguoiUngHo || '',
    SoDienThoai: r.SoDienThoai || '',
    EmailTNV: r.EmailTNV || '',
    MaTuan: r.MaTuan || '',
    NhomA_KG: Number(r.NhomA_KG || 0),
    NhomB_KG: Number(r.NhomB_KG || 0),
    NhomC_CapTui: Number(r.NhomC_CapTui || 0),
    NhomC_BoDungCu: Number(r.NhomC_BoDungCu || 0),
    NhomC_QuanAo_KG: Number(r.NhomC_QuanAo_KG || 0),
    NhomC_DoChoi_Cai: Number(r.NhomC_DoChoi_Cai || 0),
    NhomC_TapVo_Quyen: Number(r.NhomC_TapVo_Quyen || 0),
    NhomD_GiayBao_KG: Number(r.NhomD_GiayBao_KG || 0),
    NhomD_Carton_KG: Number(r.NhomD_Carton_KG || 0),
    NhomD_VoSua_Cai: Number(r.NhomD_VoSua_Cai || 0),
    NhomD_Nhua_Cai: Number(r.NhomD_Nhua_Cai || 0),
    NhomD_VoLon_Cai: Number(r.NhomD_VoLon_Cai || 0),
    HangDoi_OngHutTre: Number(r.HangDoi_OngHutTre || 0),
    HangDoi_OngHutCoBang: Number(r.HangDoi_OngHutCoBang || 0),
    HangDoi_OngHutCoSay: Number(r.HangDoi_OngHutCoSay || 0),
    HangDoi_OngHutGao: Number(r.HangDoi_OngHutGao || 0),
    HangDoi_ButBi: Number(r.HangDoi_ButBi || 0),
    HangDoi_SenDa: Number(r.HangDoi_SenDa || 0),
    HangDoi_MassageTay: Number(r.HangDoi_MassageTay || 0),
    HangDoi_GiacHoi: Number(r.HangDoi_GiacHoi || 0),
    HangDoi_Fuwa3e: Number(r.HangDoi_Fuwa3e || 0),
    HangDoi_MocKhoaTreViet: Number(r.HangDoi_MocKhoaTreViet || 0),
    HangDoi_CoRuaOngHut: Number(r.HangDoi_CoRuaOngHut || 0),
    HangDoi_BanChai: Number(r.HangDoi_BanChai || 0),
    DiemGoi_A: Number(r.DiemGoi_A || 0),
    DiemGoi_B: Number(r.DiemGoi_B || 0),
    DiemGoi_C: Number(r.DiemGoi_C || 0),
    DiemGoi_D: Number(r.DiemGoi_D || 0),
    TongDiemGoi: Number(r.TongDiemGoi || 0),
    TongDiemDoiHang: Number(r.TongDiemDoiHang || 0),
    TrangThai: r.TrangThai || '',
    GhiChu: r.GhiChu || ''
  };
  // dynamic format HangDoi
  getSanPhamKeysByLoai_('HangDoi').forEach(function(k) {
    out['HangDoi_' + k] = Number(r['HangDoi_' + k] || 0);
  });
  return out;
}



function getBangQuyDoi(maTuan) {
  const sheet = getSheet(getDataSpreadsheet(), CONFIG.SHEETS.BANG_QUY_DOI);
  let rows = getRowsObject(sheet);

  if (maTuan) {
    rows = rows.filter(r =>
      String(r.MaTuan || '').trim() === String(maTuan).trim()
    );
  }

  return sendSuccess({
    maTuan: maTuan || '',
    rows
  });
}

function getDeXuatDoiHang(payload) {
  payload = payload || {};

  const maTuan = String(
    payload.MaTuan ||
    payload.maTuan ||
    getCurrentMaTuan_() ||
    ''
  ).trim();

  if (!maTuan) {
    return sendError('Chưa có tuần quy đổi');
  }

  const diem = tinhDiemGoi(payload, maTuan);

  const hangDoi = getHangDoiRules_(maTuan);

  const tonKho = payload.tonKho || {};

  const suggestions = generateSuggestions_(
    diem.tongDiem,
    hangDoi,
    tonKho,
    3
  );

  return sendSuccess({
    maTuan,
    diem,
    suggestions
  });
}

function tinhDiemGoi(payload, maTuan) {
  payload = payload || {};

  const rules = getDiemRules_(maTuan);

  const inputMap = getInputMap_(payload);

  const detail = [];

  const diemTheoNhom = {
    A: 0,
    B: 0,
    C: 0,
    D: 0
  };

  rules.forEach(rule => {

    const key = getInputKeyForRule_(rule);

    const qty = Number(inputMap[key] || 0);

    const soLuongTrao = Number(rule.SoLuongTrao || 0);

    const diemGoi = Number(rule.DiemGoi || 0);

    if (!key || !soLuongTrao || !diemGoi || qty <= 0) return;

    const soLan = Math.floor(qty / soLuongTrao);

    const diem = soLan * diemGoi;

    if (diem <= 0) return;

    const nhom = String(rule.TenNhom || '')
      .trim()
      .toUpperCase();

    if (diemTheoNhom[nhom] !== undefined) {
      diemTheoNhom[nhom] += diem;
    }

    detail.push({
      tenNhom: nhom,
      loaiHang: rule.LoaiHang || '',
      donVi: rule.DonVi || '',
      soLuongNhap: qty,
      soLuongTrao,
      diemGoi,
      soLanQuyDoi: soLan,
      diem,
      du: qty - soLan * soLuongTrao
    });
  });

  return {
    diemA: diemTheoNhom.A,
    diemB: diemTheoNhom.B,
    diemC: diemTheoNhom.C,
    diemD: diemTheoNhom.D,
    tongDiem:
      diemTheoNhom.A +
      diemTheoNhom.B +
      diemTheoNhom.C +
      diemTheoNhom.D,
    detail
  };
}

function getDiemRules_(maTuan) {

  const sheet = getSheet(
    getDataSpreadsheet(),
    CONFIG.SHEETS.BANG_QUY_DOI
  );

  const rows = getRowsObject(sheet);

  const unique = {};

  rows
    .filter(r =>
      String(r.MaTuan || '').trim() === String(maTuan).trim()
    )
    .forEach(r => {

      const key = [
        String(r.TenNhom || '').trim(),
        normalizeForRule_(r.LoaiHang),
        String(r.DonVi || '').trim(),
        String(r.SoLuongTrao || '').trim(),
        String(r.DiemGoi || '').trim()
      ].join('|');

      if (!unique[key]) {
        unique[key] = r;
      }
    });

  return Object.keys(unique).map(k => unique[k]);
}

function getHangDoiRules_(maTuan) {
  const sheet = getSheet(
    getDataSpreadsheet(),
    CONFIG.SHEETS.BANG_QUY_DOI
  );

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  // Đọc A:K để lấy thêm cột UuTien nếu có
  const readCols = Math.max(11, sheet.getLastColumn());
  const values = sheet
    .getRange(2, 1, lastRow - 1, readCols)
    .getDisplayValues();

  const map = {};

  values.forEach(row => {
    const rowMaTuan = String(row[0] || '').trim();     // A
    const tenHangDoi = String(row[6] || '').trim();    // G
    const diemCanDoi = Number(row[7] || 0);            // H
    const soLuongDoi = Number(row[8] || 1);            // I
    const uuTien = Number(row[10] || 0);               // K = UuTien

    if (rowMaTuan !== String(maTuan).trim()) return;
    if (!tenHangDoi || !diemCanDoi || !soLuongDoi) return;

    const key = getHangDoiKeyFromName_(tenHangDoi);

    map[key] = {
      key: key,
      tenHangDoi: tenHangDoi,
      diemCanDoi: diemCanDoi,
      soLuongDoi: soLuongDoi,
      uuTien: uuTien
    };
  });

  return Object.keys(map).map(k => map[k]);
}

function generateSuggestions_(
  tongDiem,
  items,
  tonKho,
  limit
) {

  tongDiem = Number(tongDiem || 0);

  if (tongDiem <= 0 || !items.length) {
    return [];
  }

  const expanded = items
    .map(item => ({
      key: item.key,
      tenHangDoi: item.tenHangDoi,
      diemCanDoi: Number(item.diemCanDoi || 0),
      soLuongDoi: Number(item.soLuongDoi || 1),
      uuTien: Number(item.uuTien || 0),

      ton: Number(
        tonKho[item.key] === undefined
          ? 999999
          : tonKho[item.key]
      )
    }))

    .filter(item => item.diemCanDoi > 0)

    .sort((a, b) => b.diemCanDoi - a.diemCanDoi);

  const candidates = [];

  function backtrack(index, remaining, combo) {

    if (index >= expanded.length) {

      const used = tongDiem - remaining;

      if (used > 0) {
        candidates.push({
          used,
          remain: remaining,
          combo: combo.filter(x => x.soLuong > 0)
        });
      }

      return;
    }

    const item = expanded[index];

    const maxByPoint =
      Math.floor(remaining / item.diemCanDoi)
      * item.soLuongDoi;

    const maxByStock =
      item.ton <= 0
        ? maxByPoint
        : item.ton;

    const maxQty = Math.min(
      maxByPoint,
      maxByStock
    );

    for (
      let qty = maxQty;
      qty >= 0;
      qty -= item.soLuongDoi
    ) {

      const cost =
        Math.ceil(qty / item.soLuongDoi)
        * item.diemCanDoi;

      combo.push({
        key: item.key,
        tenHangDoi: item.tenHangDoi,
        soLuong: qty,
        diemDung: cost,
        uuTien: Number(item.uuTien || 0)
      });

      backtrack(
        index + 1,
        remaining - cost,
        combo
      );

      combo.pop();
    }
  }

  backtrack(0, tongDiem, []);

  candidates.sort((a, b) => {

    if (b.used !== a.used) {
      return b.used - a.used;
    }

    if (a.remain !== b.remain) {
      return a.remain - b.remain;
    }

    const pa = (a.combo || []).reduce((s, x) => s + Number(x.uuTien || 0), 0);
    const pb = (b.combo || []).reduce((s, x) => s + Number(x.uuTien || 0), 0);
    if (pb !== pa) {
      return pb - pa;
    }

    return b.combo.length - a.combo.length;
  });

  const result = [];

  const seen = {};

  candidates.forEach(c => {

    if (result.length >= limit) return;

    const combo = c.combo.filter(
      x => x.soLuong > 0
    );

    if (!combo.length) return;

    const sig = combo
      .map(x => x.key + ':' + x.soLuong)
      .sort()
      .join('|');

    if (seen[sig]) return;

    seen[sig] = true;

    result.push({
      tongDiem,
      diemDung: c.used,
      diemDu: c.remain,
      items: combo
    });
  });

  return result;
}

function getInputMap_(payload) {
  payload = payload || {};

  function n() {
    for (var i = 0; i < arguments.length; i++) {
      var key = arguments[i];
      if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') {
        var value = Number(String(payload[key]).replace(',', '.'));
        return Number.isFinite(value) ? value : 0;
      }
    }
    return 0;
  }

  // Gom toàn bộ alias cũ/mới để dù frontend đặt tên hơi khác vẫn nhận đúng.
  return {
    NhomA_KG: n('NhomA_KG','nhomA_KG','NhomA','nhomA','A'),
    NhomB_KG: n('NhomB_KG','nhomB_KG','NhomB','nhomB','B'),

    // Nhóm C
    NhomC_CapTui: n('NhomC_CapTui','nhomC_CapTui','NhomC_CapHocSinh','NhomC_Cap','CapHocSinh'),
    NhomC_BoDungCu: n('NhomC_BoDungCu','nhomC_BoDungCu','NhomC_VoMoi_DoDungHocTap','NhomC_DoDungHocTap','NhomC_VoMoi','BoDungCu'),
    NhomC_QuanAo_KG: n('NhomC_QuanAo_KG','nhomC_QuanAo_KG','NhomC_QuanAo','QuanAo'),
    NhomC_DoChoi_Cai: n('NhomC_DoChoi_Cai','nhomC_DoChoi_Cai','NhomC_DoChoi','NhomC_GauBong','DoChoi'),
    NhomC_TapVo_Quyen: n('NhomC_TapVo_Quyen','nhomC_TapVo_Quyen','NhomC_TapVo','TapVo'),

    // Nhóm D
    NhomD_GiayBao_KG: n('NhomD_GiayBao_KG','nhomD_GiayBao_KG','NhomD_GiayVuonVoCu_KG','NhomD_GiayVunVoCu_KG','NhomD_GiayCacLoai_KG','NhomD_GiayBao','GiayBao'),
    NhomD_Carton_KG: n('NhomD_Carton_KG','nhomD_Carton_KG','NhomD_GiayBia_KG','NhomD_ThungCarton_KG','Carton'),
    NhomD_VoSua_Cai: n('NhomD_VoSua_Cai','nhomD_VoSua_Cai','NhomD_VoHopSua','VoSua'),
    NhomD_Nhua_Cai: n('NhomD_Nhua_Cai','nhomD_Nhua_Cai','NhomD_ChaiNhua_Cai','NhomD_HuNhua_Cai','NhomD_LoNhua_Cai','NhomD_Nhua_KG','nhomD_Nhua_KG','Nhua'),
    NhomD_VoLon_Cai: n('NhomD_VoLon_Cai','nhomD_VoLon_Cai','NhomD_ChaiNhuaVoLon_Cai','NhomD_ChaiNhua_VoLon','VoLon')
  };
}

function getInputKeyForRule_(rule) {
  return getInputKeyForBangQuyDoiRow_(rule);
}

function getInputKeyForBangQuyDoiRow_(row) {
  row = row || {};

  const nhom = String(row.TenNhom || row.Nhom || '')
    .trim()
    .toUpperCase();

  const loai = normalizeForRule_(row.LoaiHang || row.TenLoai || row.SanPham || '');
  const donVi = normalizeForRule_(row.DonVi || '');
  const text = nhom + '|' + loai + '|' + donVi;

  if (nhom === 'A') return 'NhomA_KG';
  if (nhom === 'B') return 'NhomB_KG';

  if (nhom === 'C') {
    // Cặp học sinh
    if (hasAny_(text, ['caphocsinh','captui','cap'])) return 'NhomC_CapTui';

    // Vở mới/Đồ dùng học tập: phải bắt trước chữ "vở" chung để không rơi nhầm vào Tập vở.
    if (hasAny_(text, ['vomoi','dodunghoctap','dungcuhoctap','dohoc','bohoc','bosach','cuonsp'])) {
      return 'NhomC_BoDungCu';
    }

    // Quần áo cũ/mới còn sử dụng được
    if (hasAny_(text, ['quanao','aocu','aomoi','consudungduoc'])) return 'NhomC_QuanAo_KG';

    // Đồ chơi, gấu bông
    if (hasAny_(text, ['dochoi','gaubong','gau'])) return 'NhomC_DoChoi_Cai';

    // Tập vở
    if (hasAny_(text, ['tapvo','tap','vo'])) return 'NhomC_TapVo_Quyen';
  }

  if (nhom === 'D') {
    // Giấy các loại: giấy vụn, giấy vở đã sử dụng, giấy photo, sách bài tập cũ, báo, tạp chí...
    // Dòng này cần bắt rất rộng vì tên trong sheet thường bị nhập khác nhau theo tuần.
    if (hasAny_(text, [
      'giaycacloai','giaybao','giayvun','giayvo','vosudung','vodasudung',
      'sachbaitap','baitapcu','giayphoto','baotapchi','tapchi','bao','giayvunvo'
    ])) return 'NhomD_GiayBao_KG';

    // Giấy bìa/thùng carton
    if (hasAny_(text, ['carton','thungcarton','giaybia','bia'])) return 'NhomD_Carton_KG';

    // Vỏ hộp sữa
    if (hasAny_(text, ['vohopsua','hopsua','vosua','sua'])) return 'NhomD_VoSua_Cai';

    // Chai/hũ/lọ nhựa
    if (hasAny_(text, ['chainhua','hunhua','hũnhua','lonhua','nhua','chai','hu','lo'])) return 'NhomD_Nhua_Cai';

    // Vỏ lon
    if (hasAny_(text, ['volon','lon'])) return 'NhomD_VoLon_Cai';
  }

  return '';
}

function hasAny_(text, needles) {
  text = String(text || '');
  return needles.some(function(k) {
    return text.indexOf(normalizeForRule_(k)) !== -1;
  });
}

function getHangDoiKeyFromName_(name) {

  const raw = String(name || '').trim();

  // internal key
  const exactMap = {
    'OngHutTre': 'OngHutTre',
    'OngHutCoBang': 'OngHutCoBang',
    'OngHutCoSay': 'OngHutCoSay',
    'OngHutGao': 'OngHutGao',
    'ButBi': 'ButBi',
    'SenDa': 'SenDa',
    'MassageTay': 'MassageTay',
    'GiacHoi': 'GiacHoi',
    'Fuwa3e': 'Fuwa3e',
    'MocKhoaTreViet': 'MocKhoaTreViet',
    'BanChai':'BanChai'

  };

  if (exactMap[raw]) {
    return exactMap[raw];
  }

  const n = normalizeForRule_(raw);

  // Ống hút tre
  if (
    n.includes('onghuttre') ||
    n.includes('huttre')
  ) {
    return 'OngHutTre';
  }

  // Ống hút cỏ bàng
  if (
    n.includes('onghutcobang') ||
    n.includes('cobang')
  ) {
    return 'OngHutCoBang';
  }

  // Ống hút cỏ sậy
  if (
    n.includes('onghutcosay') ||
    n.includes('cosay')
  ) {
    return 'OngHutCoSay';
  }

  // Ống hút gạo/ngũ cốc
  if (
    n.includes('onghutgao') ||
    n.includes('ngucoc') ||
    n.includes('gao')
  ) {
    return 'OngHutGao';
  }

  // Bút bi nhựa tái chế
  if (
    n.includes('butbi') ||
    n.includes('but')
  ) {
    return 'ButBi';
  }

  // Sen đá
  if (
    n.includes('senda') ||
    n.includes('sen')
  ) {
    return 'SenDa';
  }

  // Massage tay nhựa tái chế
  if (
    n.includes('massagetay') ||
    n.includes('massage')
  ) {
    return 'MassageTay';
  }

  // Bộ giác hơi nhựa tái chế
  if (
    n.includes('giachoi') ||
    n.includes('giac')
  ) {
    return 'GiacHoi';
  }

  if (n.indexOf('fuwa3e') !== -1 || n.indexOf('nuocruachen') !== -1 || n.indexOf('lausang') !== -1 || n.indexOf('giat') !== -1 || n.indexOf('vesinhboncau') !== -1) return 'Fuwa3e';

  // Bút bi nhựa tái chế
  if (
    n.includes('treviet') ||
    n.includes('mockhoa')
  ) {
    return 'MocKhoaTreViet';
  }
  // dynamic product name mapping
  const catalog = getCatalogSanPham_();
  const matched = catalog.hangDoi.find(function(item) {
    return normalizeForRule_(item.key) === n || normalizeForRule_(item.label) === n;
  });
  if (matched) return matched.key;

  return raw;
}

function normalizeForRule_(value) {

  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

function getCurrentMaTuan_() {

  const sheet = getSheet(
    getDataSpreadsheet(),
    CONFIG.SHEETS.CAU_HINH_TUAN
  );

  const rows = getRowsObject(sheet);

  const found = rows.find(r => {

    const status = String(r.TrangThai || '')
      .trim()
      .toLowerCase();

    return (
      status === 'active' ||
      status === 'hoạt động'
    );
  });

  return found ? found.MaTuan : '';
}

function testDeXuatDoiHang() {
  const result = getDeXuatDoiHang({
    MaTuan: 'T1',
    NhomA_KG: 5,
    NhomD_GiayBao_KG: 2,
    tonKho: {
      OngHutTre: 49,
      ButBi: 59,
      SenDa: 9
    }
  });

  Logger.log(JSON.stringify(result, null, 2));
}

function testHangDoiRules() {
  const rules = getHangDoiRules_('T1');
  Logger.log(JSON.stringify(rules, null, 2));
}

function debugBangQuyDoi() {
  const sheet = getSheet(
    getDataSpreadsheet(),
    CONFIG.SHEETS.BANG_QUY_DOI
  );

  const values = sheet.getDataRange().getDisplayValues();

  Logger.log('Tên sheet: ' + sheet.getName());
  Logger.log('Số dòng: ' + sheet.getLastRow());
  Logger.log('Số cột: ' + sheet.getLastColumn());
  Logger.log('Header: ' + JSON.stringify(values[0]));
  Logger.log('Dòng 2: ' + JSON.stringify(values[1]));
}

function testHangDoiRules() {
  const rules = getHangDoiRules_('T1');
  Logger.log(JSON.stringify(rules, null, 2));
}

/** =========================
 *  DSL C 2026 - AI quy đổi đọc trực tiếp từ sheet BangQuyDoi
 *  Không hard-code bảng tuần trong code.
 *  Mỗi tuần chỉ cần cập nhật sheet BangQuyDoi theo MaTuan.
 *  AI chọn mốc cao nhất phù hợp cho từng loại hàng, sau đó nhân số suất.
 *  Ví dụ: 5kg nhóm B, dòng sheet SoLuongDoi = 20 thì AI trả 20 ống hút gạo/ngũ cốc.
 *  ========================= */

function getDeXuatDoiHang(payload) {
  payload = payload || {};

  const maTuan = String(
    payload.MaTuan ||
    payload.maTuan ||
    getCurrentMaTuan_() ||
    ''
  ).trim();

  if (!maTuan) return sendError('Chưa có tuần quy đổi');

  const diem = tinhDiemGoi(payload, maTuan);
  const tonKho = payload.tonKho || {};
  const suggestions = generateSuggestionsTheoBang_(payload, maTuan, tonKho, 3);

  return sendSuccess({
    maTuan: maTuan,
    diem: diem,
    suggestions: suggestions
  });
}

function tinhDiemGoi(payload, maTuan) {
  payload = payload || {};

  const detail = [];
  const diemTheoNhom = { A: 0, B: 0, C: 0, D: 0 };
  const applicableRules = getApplicableBestRulesFromSheet_(payload, maTuan);

  applicableRules.forEach(item => {
    const rule = item.rule;
    const qty = item.qty;
    const soLuongTrao = Number(rule.soLuongTrao || 0);
    const suat = soLuongTrao > 0 ? Math.floor(qty / soLuongTrao) : 0;

    if (!suat) return;

    const nhom = String(rule.nhom || '').trim().toUpperCase();
    if (diemTheoNhom[nhom] !== undefined) diemTheoNhom[nhom] += suat;

    detail.push({
      tenNhom: nhom,
      loaiHang: rule.loaiHang,
      donVi: rule.donVi,
      soLuongNhap: qty,
      soLuongTrao: soLuongTrao,
      diemGoi: 1,
      soLanQuyDoi: suat,
      diem: suat,
      du: qty - suat * soLuongTrao,
      ghiChu: 'Đọc từ sheet BangQuyDoi; lấy mốc cao nhất phù hợp cho từng loại hàng, không cộng chồng mốc nhỏ hơn'
    });
  });

  return {
    diemA: diemTheoNhom.A,
    diemB: diemTheoNhom.B,
    diemC: diemTheoNhom.C,
    diemD: diemTheoNhom.D,
    tongDiem: diemTheoNhom.A + diemTheoNhom.B + diemTheoNhom.C + diemTheoNhom.D,
    detail: detail,
    mode: 'BANG_QUY_DOI_DOC_TU_SHEET_KHONG_HARDCODE'
  };
}

function generateSuggestionsTheoBang_(payload, maTuan, tonKho, limit) {
  const groups = buildEligibleExchangeGroupsFromSheet_(payload, maTuan, tonKho || {});
  if (!groups.length) return [];

  let combos = [{
    items: {},
    usedLabels: [],
    totalPriority: 0,
    totalValue: 0,
    totalUsedQty: 0,
    groupCount: 0
  }];

  groups.forEach(group => {
    const next = [];

    combos.forEach(base => {
      group.options.forEach(opt => {
        const merged = JSON.parse(JSON.stringify(base));

        opt.items.forEach(it => {
          merged.items[it.key] = merged.items[it.key] || {
            key: it.key,
            tenHangDoi: it.tenHangDoi,
            soLuong: 0,
            donViHienThi: it.donViHienThi || ''
          };
          merged.items[it.key].soLuong += Number(it.soLuong || 0);
        });

        merged.usedLabels.push(group.label + ': ' + opt.label);
        merged.totalPriority += Number(opt.priority || 0);
        merged.totalValue += Number(opt.value || 0);
        merged.totalUsedQty += Number(group.usedQty || 0);
        merged.groupCount += 1;

        if (isComboWithinStock_(merged.items, tonKho)) next.push(merged);
      });
    });

    combos = next;
  });

  const seen = {};
  const normalized = combos.map(c => {
    const items = Object.keys(c.items)
      .map(k => c.items[k])
      .filter(x => Number(x.soLuong || 0) > 0)
      .sort((a, b) => String(a.tenHangDoi).localeCompare(String(b.tenHangDoi), 'vi'));

    return {
      diemDung: c.totalUsedQty,
      diemDu: 0,
      tongDiem: c.totalUsedQty,
      items: items,
      note: c.usedLabels.join(' · '),
      _score: c.groupCount * 100000000 + c.totalPriority * 100000 + c.totalValue * 10 + c.totalUsedQty
    };
  }).filter(c => c.items.length);

  normalized.sort((a, b) => b._score - a._score);

  const result = [];
  normalized.forEach(c => {
    if (result.length >= (limit || 3)) return;
    const sig = c.items.map(i => i.key + ':' + i.soLuong).join('|');
    if (seen[sig]) return;
    seen[sig] = true;
    delete c._score;
    result.push(c);
  });

  return result;
}

function buildEligibleExchangeGroupsFromSheet_(payload, maTuan, tonKho) {
  const applicableRules = getApplicableBestRulesFromSheet_(payload, maTuan, tonKho || {});
  const groups = [];

  applicableRules.forEach(item => {
    const rule = item.rule;
    const qty = item.qty;
    const soLuongTrao = Number(rule.soLuongTrao || 0);
    const multiplier = soLuongTrao > 0 ? Math.floor(qty / soLuongTrao) : 0;
    if (!multiplier) return;

    const options = rule.options.map(opt => {
      const items = opt.items.map(it => ({
        key: it.key,
        tenHangDoi: it.tenHangDoi,
        soLuong: Number(it.soLuongDoi || 0) * multiplier,
        donViHienThi: it.donViHienThi || ''
      })).filter(it => Number(it.soLuong || 0) > 0);

      return {
        label: opt.label,
        priority: Number(opt.priority || 0),
        value: items.reduce((s, it) => s + Number(it.soLuong || 0), 0),
        items: items
      };
    }).filter(opt => opt.items.length && isOptionWithinStock_(opt.items, tonKho));

    if (options.length) {
      groups.push({
        label: rule.label,
        usedQty: soLuongTrao * multiplier,
        options: options
      });
    }
  });

  return groups;
}

function getApplicableBestRulesFromSheet_(payload, maTuan, tonKho) {
  payload = payload || {};
  tonKho = tonKho || null;

  const inputMap = getInputMap_(payload);
  const allRules = getBangQuyDoiRulesFromSheet_(maTuan);
  const bestByField = {};

  allRules.forEach(rule => {
    const qty = Number(inputMap[rule.field] || 0);
    const soLuongTrao = Number(rule.soLuongTrao || 0);
    if (!rule.field || !soLuongTrao || qty < soLuongTrao) return;

    const multiplier = Math.floor(qty / soLuongTrao);
    if (!multiplier) return;

    // Nếu có truyền tồn kho khi AI đề xuất, chỉ xét mốc còn ít nhất 1 phương án khả dụng.
    // Đây là lỗi cũ: 10kg giấy có mốc Fuwa3e nhưng tồn Fuwa3e = 0, code vẫn chọn mốc 10
    // rồi loại hết option, nên nhóm D biến mất. Bản này sẽ tự lùi về mốc 5kg x 2 suất.
    let viableOptions = rule.options || [];
    if (tonKho) {
      viableOptions = viableOptions.filter(opt => {
        const items = (opt.items || []).map(it => ({
          key: it.key,
          tenHangDoi: it.tenHangDoi,
          soLuong: Number(it.soLuongDoi || 0) * multiplier
        })).filter(it => Number(it.soLuong || 0) > 0);
        return items.length && isOptionWithinStock_(items, tonKho);
      });
      if (!viableOptions.length) return;
    }

    const optionPriority = viableOptions.reduce((max, opt) => {
      return Math.max(max, Number(opt.priority || 0));
    }, 0);

    const candidate = {
      rule: rule,
      qty: qty,
      multiplier: multiplier,
      usedQty: soLuongTrao * multiplier,
      optionPriority: optionPriority
    };

    const current = bestByField[rule.field];

    // Ưu tiên dùng được nhiều số lượng nhất. Nếu bằng nhau, ưu tiên mốc lớn hơn,
    // rồi ưu tiên nhóm quà có priority cao hơn.
    if (
      !current ||
      candidate.usedQty > current.usedQty ||
      (candidate.usedQty === current.usedQty && soLuongTrao > Number(current.rule.soLuongTrao || 0)) ||
      (candidate.usedQty === current.usedQty && soLuongTrao === Number(current.rule.soLuongTrao || 0) && candidate.optionPriority > current.optionPriority)
    ) {
      bestByField[rule.field] = candidate;
    }
  });

  return Object.keys(bestByField).map(k => ({
    rule: bestByField[k].rule,
    qty: bestByField[k].qty
  }));
}

function getBangQuyDoiRulesFromSheet_(maTuan) {
  const sheet = getSheet(getDataSpreadsheet(), CONFIG.SHEETS.BANG_QUY_DOI);
  const rows = getRowsObject(sheet);
  const map = {};

  rows
    .filter(r => String(r.MaTuan || '').trim() === String(maTuan || '').trim())
    .forEach(r => {
      const nhom = String(r.TenNhom || '').trim().toUpperCase();
      const field = getInputKeyForRule_(r);
      const soLuongTrao = Number(String(r.SoLuongTrao || '').replace(',', '.'));
      const tenHangDoi = String(r.TenHangDoi || '').trim();
      const soLuongDoi = Number(String(r.SoLuongDoi || '').replace(',', '.'));
      const uuTienRaw = r.UuTien !== undefined ? r.UuTien : (r.uuTien !== undefined ? r.uuTien : r['Ưu tiên']);
      const uuTien = Number(String(uuTienRaw || '').replace(',', '.'));

      if (!nhom || !field || !soLuongTrao || !tenHangDoi || !soLuongDoi) return;

      const key = [
        nhom,
        field,
        normalizeForRule_(r.LoaiHang),
        String(r.DonVi || '').trim(),
        soLuongTrao
      ].join('|');

      if (!map[key]) {
        map[key] = {
          nhom: nhom,
          field: field,
          loaiHang: String(r.LoaiHang || '').trim(),
          label: buildRuleLabelFromRow_(r, soLuongTrao),
          donVi: String(r.DonVi || '').trim(),
          soLuongTrao: soLuongTrao,
          options: []
        };
      }

      const hangKey = getHangDoiKeyFromName_(tenHangDoi);
      map[key].options.push({
        label: tenHangDoi,
        priority: Number.isFinite(uuTien) && uuTien > 0 ? uuTien : getHangDoiPriority_(hangKey, tenHangDoi),
        items: [{
          key: hangKey,
          tenHangDoi: tenHangDoi,
          soLuongDoi: soLuongDoi,
          donViHienThi: String(r.DonViHangDoi || '').trim()
        }]
      });
    });

  return Object.keys(map).map(k => {
    map[k].options.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
    return map[k];
  });
}

function buildRuleLabelFromRow_(row, soLuongTrao) {
  const nhom = String(row.TenNhom || '').trim().toUpperCase();
  const loaiHang = String(row.LoaiHang || '').trim();
  const donVi = String(row.DonVi || '').trim();
  return 'Nhóm ' + nhom + ' - ' + loaiHang + ' đủ ' + soLuongTrao + (donVi ? donVi : '');
}

function getHangDoiPriority_(key, name) {
  const priority = {
    SenDa: 100,
    ButBi: 90,
    MocKhoaTreViet: 110,
    Fuwa3e: 80,
    OngHutGao: 70,
    OngHutTre: 60,
    OngHutCoBang: 55,
    OngHutCoSay: 50,
    MassageTay: 40,
    GiacHoi: 35
  };
  return priority[key] || 10;
}

function isOptionWithinStock_(items, tonKho) {
  const tmp = {};
  items.forEach(it => {
    tmp[it.key] = (tmp[it.key] || 0) + Number(it.soLuong || 0);
  });
  return isComboWithinStock_(tmp, tonKho);
}

function isComboWithinStock_(itemsMap, tonKho) {
  return Object.keys(itemsMap).every(key => {
    if (tonKho[key] === undefined || tonKho[key] === '' || tonKho[key] === null) return true;
    return Number(itemsMap[key].soLuong || itemsMap[key] || 0) <= Number(tonKho[key] || 0);
  });
}

function getHangDoiDisplayName_(key) {
  const map = {
    OngHutTre: 'Ống hút tre',
    OngHutCoBang: 'Ống hút cỏ bàng',
    OngHutCoSay: 'Ống hút cỏ sậy',
    OngHutGao: 'Ống hút gạo/ngũ cốc',
    ButBi: 'Bút bi tái chế Midatek',
    SenDa: 'Cây sen đá/Xương rồng',
    MassageTay: 'Massage tay nhựa tái chế',
    GiacHoi: 'Bộ giác hơi nhựa tái chế',
    Fuwa3e: 'Fuwa3e',
    MocKhoaTreViet: 'Móc khóa nón lá Tre Việt'
  };
  return map[key] || key;
}

function tinhDiemDoiHangDaChon_(payload, maTuan) {
  // Không còn chặn theo điểm gói. Giữ hàm để submitGiaoDich cũ không lỗi.
  return 0;
}

function debugBangQuyDoiDocSheet(maTuan) {
  maTuan = maTuan || 'T1';
  const rules = getBangQuyDoiRulesFromSheet_(maTuan);
  Logger.log(JSON.stringify(rules, null, 2));
}

function testDeXuatDocSheet_5A_5B_10D() {
  const result = getDeXuatDoiHang({
    MaTuan: 'T1',
    NhomA_KG: 5,
    NhomB_KG: 5,
    NhomD_GiayBao_KG: 10,
    tonKho: {
      OngHutTre: 999,
      OngHutCoBang: 999,
      OngHutCoSay: 999,
      OngHutGao: 999,
      ButBi: 999,
      SenDa: 999,
      Fuwa3e: 999
    }
  });

  Logger.log(JSON.stringify(result, null, 2));
}


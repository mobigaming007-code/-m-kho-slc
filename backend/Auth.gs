function loginAdmin(payload) {
  payload = payload || {};

  const emailInput = String(payload.email || '').trim().toLowerCase();
  const passwordInput = String(payload.matKhau || payload.password || '').trim();

  if (!emailInput || !passwordInput) {
    return sendError('Thiếu email hoặc mật khẩu');
  }

  const sheet = getSheetRequired(
    getConfigSpreadsheet(),
    CONFIG.SHEETS.PHAN_QUYEN
  );

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return sendError('Sheet PhanQuyen_Admin chưa có dữ liệu admin');
  }

  // Đọc A:F
  // A = Email
  // C = CapQuyen
  // E = TrangThai
  // F = MatKhau
  const values = sheet.getRange(2, 1, lastRow - 1, 6).getDisplayValues();

  let foundUser = null;

  values.forEach(row => {
    const email = String(row[0] || '').trim().toLowerCase();     // A
    const capQuyen = String(row[2] || '').trim();                // C
    const trangThai = String(row[4] || '').trim().toLowerCase(); // E
    const matKhau = String(row[5] || '').trim();                 // F

    if (email === emailInput) {
      foundUser = {
        email: email,
        capQuyen: capQuyen,
        trangThai: trangThai,
        matKhau: matKhau
      };
    }
  });

  if (!foundUser) {
    return sendError('Không tìm thấy email trong PhanQuyen_Admin');
  }

  if (foundUser.trangThai !== 'hoạt động') {
    return sendError('Tài khoản chưa ở trạng thái Hoạt động');
  }

  const passwordOk =
    foundUser.matKhau === passwordInput ||
    foundUser.matKhau === hashText(passwordInput);

  if (!passwordOk) {
    return sendError('Sai mật khẩu');
  }

  const token = createSessionToken(foundUser.email);

  const sessionData = {
    email: foundUser.email,
    hoTen: foundUser.email,
    capQuyen: foundUser.capQuyen,
    phamViKhuVuc: '',
    createdAt: new Date().toISOString()
  };

  CacheService
    .getScriptCache()
    .put(
      token,
      JSON.stringify(sessionData),
      CONFIG.SESSION_EXPIRE_HOURS * 3600
    );

  return sendSuccess({
    token: token,
    user: sessionData
  });
}

function verifySession(payload) {
  payload = payload || {};

  const token = payload.token;

  if (!token) {
    return sendError('Thiếu token');
  }

  const raw = CacheService.getScriptCache().get(token);

  if (!raw) {
    return sendError('Phiên đăng nhập hết hạn');
  }

  return sendSuccess(JSON.parse(raw));
}

function testLoginAdmin() {
  const result = loginAdmin({
    email: 'NHAP_EMAIL_ADMIN_O_DAY',
    matKhau: 'NHAP_MAT_KHAU_O_DAY'
  });

  Logger.log(JSON.stringify(result, null, 2));
}
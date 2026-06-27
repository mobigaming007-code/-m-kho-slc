function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const action = data.action || '';
    const payload = data.payload || {};
    let response;

    switch (action) {
      case 'getConfig': response = getConfig(); break;
      case 'login': response = loginAdmin(payload); break;
      case 'verifySession': response = verifySession(payload); break;
      case 'getBangQuyDoi': response = getBangQuyDoi(payload.maTuan); break;
      case 'getDeXuatDoiHang': response = getDeXuatDoiHang(payload); break;
      case 'submitGiaoDich': response = submitGiaoDich(payload); break;
      case 'submitKiemKho': response = submitKiemKho(payload); break;
      case 'getKiemKho': response = getKiemKho(payload); break;
      case 'getThongKe': response = getThongKe(payload); break;
      case 'xuatNhapKho': response = xuatNhapKho(payload); break;
      case 'getTonKho': response = getTonKho(payload); break;
      case 'getGiaoDich': response = getGiaoDich(payload); break;
      case 'updateGiaoDich': response = updateGiaoDich(payload); break;
      case 'deleteGiaoDich': response = deleteGiaoDich(payload); break;
      case 'addSanPham': response = addSanPham(payload); break;
      case 'deleteSanPham': response = deleteSanPham(payload); break;
      default: response = sendError('Unknown action: ' + action);
    }

    return output(response);
  } catch (err) {
    return output(sendError(err.message));
  }
}


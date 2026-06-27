function getThongKe(payload) {
  const sheet = getSheet(
    getDataSpreadsheet(),
    CONFIG.SHEETS.GIAO_DICH
  );

  let rows = getRowsObject(sheet)
    .filter(r => {
      const trangThai = String(r.TrangThai || '').trim().toLowerCase();
      return !(trangThai === 'daxoa' || trangThai === 'da xoa' || trangThai === 'đã xóa' || trangThai === 'loi' || trangThai === 'lỗi');
    });

  if (payload.maKhuVuc) {
    rows = rows.filter(r => r.MaKhuVuc == payload.maKhuVuc);
  }

  const tongGiaoDich = rows.length;

  const tongDiemGoi = rows.reduce((s, r) =>
    s + Number(r.TongDiemGoi || 0), 0);

  const tongDiemDoiHang = rows.reduce((s, r) =>
    s + Number(r.TongDiemDoiHang || 0), 0);

  const topMap = {};

  rows.forEach(r => {
    const kv = r.MaKhuVuc || 'Khác';
    topMap[kv] = (topMap[kv] || 0) + 1;
  });

  const topKhuVuc = Object.keys(topMap)
    .map(k => ({ key: k, count: topMap[k] }))
    .sort((a,b) => b.count - a.count)
    .slice(0, 5);

  return sendSuccess({
    tongGiaoDich: tongGiaoDich,
    tongDiemGoi: tongDiemGoi,
    tongDiemDoiHang: tongDiemDoiHang,
    soPhieuKiemKhoBatThuong: 0,
    topKhuVuc: topKhuVuc,
    theoNgay: []
  });
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, Field, SelectInput, TextArea, TextInput } from "@/components/FormBits";
import { SmartSelect } from "@/components/SmartSelect";
import { useFeedback } from "@/components/Feedback";
import { Api, type AdminUser, type CatalogItem, type DashboardData, type GiaoDichRow, type KiemKhoRow, type KhuVuc } from "@/lib/api";
import { APP_CONFIG } from "@/lib/config";
import { formatDateTime, formatNumber, todayInputValue } from "@/lib/format";
import { readLocal, removeLocal, saveLocal } from "@/lib/storage";

type KhoForm = Record<string, string | number>;
type AdminTab = "overview" | "stock" | "inventory" | "stats" | "history";

const PAGE_SIZE = 20;
const HISTORY_TOTAL_FALLBACK_LIMIT = 50000;

const ADMIN_TABS: { key: AdminTab; label: string }[] = [
  { key: "overview", label: "Tổng quan" },
  { key: "stock", label: "Lập phiếu xuất/nhập kho" },
  { key: "inventory", label: "Phiếu kiểm kho" },
  { key: "stats", label: "Thống kê dữ liệu" },
  { key: "history", label: "Lịch sử giao dịch" },
];

export default function AdminPage() {
  const { toast, setLoading, feedback } = useFeedback();
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [khuVuc, setKhuVuc] = useState<KhuVuc[]>([]);
  const [hangDoi, setHangDoi] = useState<CatalogItem[]>(APP_CONFIG.HANG_DOI);
  const [hangTrungBay, setHangTrungBay] = useState<CatalogItem[]>(APP_CONFIG.HANG_TRUNG_BAY);
  const [filter, setFilter] = useState({ maKhuVuc: "", tenKhuVuc: "", search: "", fromDate: "", toDate: todayInputValue() });
  const [keyword, setKeyword] = useState("");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [giaoDichRows, setGiaoDichRows] = useState<GiaoDichRow[]>([]);
  const [giaoDichPage, setGiaoDichPage] = useState(1);
  const [giaoDichTotal, setGiaoDichTotal] = useState(0);
  const [giaoDichHasMore, setGiaoDichHasMore] = useState(false);
  const [historyAllMode, setHistoryAllMode] = useState(true);
  const [kiemKhoRows, setKiemKhoRows] = useState<KiemKhoRow[]>([]);
  const [khoForm, setKhoForm] = useState<KhoForm>({
    LoaiPhieu: "NhapKho",
    NgayPhieu: todayInputValue(),
    TuKhuVuc: "",
    TuKhuVucSearch: "",
    DenKhuVuc: "",
    DenKhuVucSearch: "",
    GhiChu: "",
  });
  const [productForm, setProductForm] = useState({ key: "", label: "", loaiSanPham: "HangDoi" });

  const khoList = useMemo(() => [{ maKhuVuc: "Kho tổng", tenKhuVuc: "Kho tổng" }, ...khuVuc], [khuVuc]);
  const allKhoItems = useMemo(() => [...hangDoi, ...hangTrungBay], [hangDoi, hangTrungBay]);

  useEffect(() => {
    void boot();
  }, []);

  async function boot() {
    try {
      setLoading(true, "Đang kiểm tra phiên...");
      await refreshConfig();

      const saved = readLocal<{ token?: string; user?: AdminUser } | null>(APP_CONFIG.STORAGE_KEYS.SESSION, null);
      if (!saved?.token) return;

      const session = await Api.verifySession(saved.token);
      if (!session.success) {
        removeLocal(APP_CONFIG.STORAGE_KEYS.SESSION);
        return;
      }

      setToken(saved.token);
      setUser(session.data);
      await Promise.all([loadDashboard(saved.token), loadGiaoDichList(saved.token, true, 1)]);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không kiểm tra được phiên.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function refreshConfig() {
    const res = await Api.getConfig();
    if (!res.success) throw new Error(res.error);
    setKhuVuc(res.data.khuVuc || []);
    setHangDoi((res.data.hangDoi?.length ? res.data.hangDoi : APP_CONFIG.HANG_DOI) as CatalogItem[]);
    setHangTrungBay((res.data.hangTrungBay?.length ? res.data.hangTrungBay : APP_CONFIG.HANG_TRUNG_BAY) as CatalogItem[]);
  }

  async function loginAdmin() {
    if (!loginEmail || !loginPassword) {
      toast("Vui lòng nhập email và mật khẩu.", "warning");
      return;
    }

    try {
      setLoading(true, "Đang đăng nhập...");
      const res = await Api.login(loginEmail, loginPassword);
      if (!res.success) throw new Error(res.error);
      setToken(res.data.token);
      setUser(res.data.user);
      saveLocal(APP_CONFIG.STORAGE_KEYS.SESSION, res.data);
      toast("Đăng nhập thành công.", "success");
      await Promise.all([loadDashboard(res.data.token), loadGiaoDichList(res.data.token, true, 1)]);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Đăng nhập thất bại.", "error");
    } finally {
      setLoading(false);
    }
  }

  function logoutAdmin() {
    removeLocal(APP_CONFIG.STORAGE_KEYS.SESSION);
    setToken("");
    setUser(null);
    toast("Đã đăng xuất.", "success");
  }

  function filterPayload(sessionToken = token) {
    return {
      token: sessionToken,
      maKhuVuc: filter.maKhuVuc,
      fromDate: filter.fromDate,
      toDate: filter.toDate,
    };
  }

  async function loadDashboard(sessionToken = token) {
    if (!sessionToken) return;
    try {
      setLoading(true, "Đang tải dashboard...");
      const res = await Api.getThongKe(filterPayload(sessionToken));
      if (!res.success) throw new Error(res.error);
      setDashboard(res.data);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không tải được dashboard.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadKiemKhoList() {
    try {
      setLoading(true, "Đang tải phiếu...");
      const res = await Api.getKiemKho({ maKhuVuc: filter.maKhuVuc, ngayToChuc: filter.toDate });
      if (!res.success) throw new Error(res.error);
      setKiemKhoRows(res.data || []);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không tải được phiếu kiểm kho.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadGiaoDichList(sessionToken = token, newest = false, page = giaoDichPage) {
    try {
      setLoading(true, "Đang tải lịch sử giao dịch...");
      const currentPage = Math.max(1, page);
      setHistoryAllMode(newest);
      const res = await Api.getGiaoDich({
        keyword: newest ? "" : keyword,
        maKhuVuc: filter.maKhuVuc,
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
      });
      if (!res.success) throw new Error(res.error);
      const rows = res.data.rows || [];
      const total = Number(res.data.total || 0) || (await loadGiaoDichTotalFallback(newest));
      setGiaoDichRows(rows);
      setGiaoDichTotal(total || (currentPage - 1) * PAGE_SIZE + rows.length);
      setGiaoDichHasMore(!total && rows.length === PAGE_SIZE);
      setGiaoDichPage(currentPage);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không tải được lịch sử giao dịch.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadGiaoDichTotalFallback(newest: boolean) {
    const res = await Api.getGiaoDich({
      keyword: newest ? "" : keyword,
      maKhuVuc: filter.maKhuVuc,
      limit: HISTORY_TOTAL_FALLBACK_LIMIT,
      offset: 0,
    });
    if (!res.success) return 0;
    return Number(res.data.total || res.data.rows?.length || 0);
  }

  async function editGiaoDich(row: GiaoDichRow) {
    const raw = window.prompt(`Điều chỉnh giao dịch ${row.MaGiaoDich}\nDán JSON cần sửa.`, JSON.stringify(row, null, 2));
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as Record<string, unknown>;
      payload.MaGiaoDich = row.MaGiaoDich;
      if (!window.confirm(`Xác nhận điều chỉnh giao dịch ${row.MaGiaoDich}?`)) return;
      setLoading(true, "Đang điều chỉnh giao dịch...");
      const res = await Api.updateGiaoDich(payload);
      if (!res.success) throw new Error(res.error);
      toast("Đã điều chỉnh giao dịch.", "success");
      await Promise.all([loadGiaoDichList(token, historyAllMode, giaoDichPage), loadDashboard(token)]);
    } catch (error) {
      toast(error instanceof Error ? error.message : "JSON không hợp lệ hoặc không sửa được giao dịch.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function deleteGiaoDich(maGiaoDich: string) {
    if (!maGiaoDich || !window.confirm(`Đánh dấu xóa giao dịch ${maGiaoDich} và hoàn lại hàng đã trừ vào tồn kho?`)) return;
    try {
      setLoading(true, "Đang xóa giao dịch...");
      const res = await Api.deleteGiaoDich({ MaGiaoDich: maGiaoDich, EmailAdmin: user?.email || "" });
      if (!res.success) throw new Error(res.error);
      toast(res.data.message || "Đã xóa giao dịch và hoàn lại tồn kho.", "success");
      await Promise.all([loadGiaoDichList(token, historyAllMode, giaoDichPage), loadDashboard(token)]);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không xóa được giao dịch.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function submitPhieuKho() {
    if (!khoForm.TuKhuVuc || !khoForm.DenKhuVuc) {
      toast("Vui lòng chọn Từ khu vực và Đến khu vực.", "warning");
      return;
    }
    if (!window.confirm("Lưu phiếu kho?")) return;

    const payload: Record<string, string | number> = {
      token,
      LoaiPhieu: String(khoForm.LoaiPhieu || ""),
      NgayPhieu: String(khoForm.NgayPhieu || ""),
      TuKhuVuc: String(khoForm.TuKhuVuc || ""),
      DenKhuVuc: String(khoForm.DenKhuVuc || ""),
      GhiChu: String(khoForm.GhiChu || ""),
      NguoiLap: user?.email || "",
    };
    allKhoItems.forEach((item) => (payload[item.key] = Number(khoForm[`Kho_${item.key}`] || 0)));

    try {
      setLoading(true, "Đang lưu...");
      const res = await Api.xuatNhapKho(payload);
      if (!res.success) throw new Error(res.error);
      toast(`Đã lưu: ${res.data.maPhieu}`, "success");
      resetPhieuKho(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không lưu được phiếu kho.", "error");
    } finally {
      setLoading(false);
    }
  }

  function resetPhieuKho(ask = true) {
    if (ask && !window.confirm("Xóa phiếu?")) return;
    const next: KhoForm = {
      LoaiPhieu: "NhapKho",
      NgayPhieu: todayInputValue(),
      TuKhuVuc: "",
      TuKhuVucSearch: "",
      DenKhuVuc: "",
      DenKhuVucSearch: "",
      GhiChu: "",
    };
    allKhoItems.forEach((item) => (next[`Kho_${item.key}`] = 0));
    setKhoForm(next);
  }

  async function addSanPham() {
    if (!productForm.key || !productForm.label) {
      toast("Vui lòng nhập mã và tên sản phẩm.", "warning");
      return;
    }

    try {
      setLoading(true, "Đang thêm sản phẩm...");
      const res = await Api.addSanPham({
        token,
        maSanPham: productForm.key,
        tenSanPham: productForm.label,
        loaiSanPham: productForm.loaiSanPham,
      });
      if (!res.success) throw new Error(res.error);
      toast("Đã thêm sản phẩm và đồng bộ cột Google Sheet.", "success");
      setProductForm({ key: "", label: "", loaiSanPham: "HangDoi" });
      await refreshConfig();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không thêm được sản phẩm.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSanPham(item: CatalogItem) {
    if (!window.confirm(`Xóa sản phẩm ${item.label}? Backend sẽ xóa các cột liên quan trong Google Sheet.`)) return;
    try {
      setLoading(true, "Đang xóa sản phẩm...");
      const res = await Api.deleteSanPham({ token, maSanPham: item.key });
      if (!res.success) throw new Error(res.error);
      toast("Đã xóa sản phẩm và đồng bộ cột Google Sheet.", "success");
      await refreshConfig();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không xóa được sản phẩm.", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!token || !user) {
    return (
      <AppShell icon="🛠" subtitle="Trang quản trị" heroTitle="Quản trị & thống kê" heroText="Đăng nhập để xem dashboard, phiếu kiểm kho và lập phiếu kho.">
        <main className="grid">
          <Card span={6}>
            <h3>Đăng nhập Admin</h3>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void loginAdmin();
              }}
            >
            <div className="form-grid">
              <Field label="Email">
                <TextInput type="email" placeholder="Nhập email admin" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} />
              </Field>
              <Field label="Mật khẩu">
                <TextInput type="password" placeholder="Nhập mật khẩu" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} />
              </Field>
            </div>
            <div className="actions">
              <button className="btn-primary" type="submit">
                Đăng nhập
              </button>
            </div>
            </form>
          </Card>
        </main>
        {feedback}
      </AppShell>
    );
  }

  return (
    <AppShell icon="🛠" subtitle="Trang quản trị" heroTitle="Quản trị & thống kê" heroText="Xem dashboard, tra cứu giao dịch, kiểm kho và lập phiếu kho.">
      <main className="grid">
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <h3>Xin chào, {user.hoTen || user.email || "Admin"}</h3>
              <p className="section-note">
                Quyền: <strong>{user.capQuyen || ""}</strong>
              </p>
            </div>
            <button className="btn-ghost" type="button" onClick={logoutAdmin}>
              Đăng xuất
            </button>
          </div>
        </Card>

        <Card>
          <div className="tabbar" role="tablist" aria-label="Admin sections">
            {ADMIN_TABS.map((tab) => (
              <button key={tab.key} type="button" className={activeTab === tab.key ? "tab-button active" : "tab-button"} onClick={() => setActiveTab(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>
        </Card>

        {activeTab !== "stock" && (
          <FilterCard
            filter={filter}
            khuVuc={khuVuc}
            setFilter={setFilter}
            loadDashboard={() => loadDashboard()}
            loadKiemKhoList={loadKiemKhoList}
          />
        )}

        {activeTab === "overview" && (
          <>
            <Card span={6}>
              <h3>Dashboard</h3>
              <DashboardCards data={dashboard} />
            </Card>
            <Card span={6}>
              <h3>Top khu vực</h3>
              <SimpleTable headers={["Khu vực", "Số giao dịch"]} rows={(dashboard?.topKhuVuc || []).map((row) => [row.key, formatNumber(row.count)])} />
            </Card>
          </>
        )}

        {activeTab === "stock" && (
          <>
            <StockVoucherCard
              khoForm={khoForm}
              setKhoForm={setKhoForm}
              khoList={khoList}
              allKhoItems={allKhoItems}
              submitPhieuKho={submitPhieuKho}
              resetPhieuKho={resetPhieuKho}
            />
            <ProductManagerCard
              hangDoi={hangDoi}
              hangTrungBay={hangTrungBay}
              productForm={productForm}
              setProductForm={setProductForm}
              addSanPham={addSanPham}
              deleteSanPham={deleteSanPham}
            />
          </>
        )}

        {activeTab === "inventory" && (
          <Card>
            <h3>Phiếu kiểm kho</h3>
            <KiemKhoTable rows={kiemKhoRows} />
          </Card>
        )}

        {activeTab === "stats" && (
          <Card>
            <h3>Thống kê theo ngày</h3>
            <SimpleTable
              headers={["Ngày", "Nhóm A kg", "Nhóm B kg", "Tổng điểm"]}
              rows={(dashboard?.theoNgay || []).map((row) => [String(row.key || ""), formatNumber(row.NhomA_KG), formatNumber(row.NhomB_KG), formatNumber(row.TongDiemGoi)])}
            />
          </Card>
        )}

        {activeTab === "history" && (
          <Card>
            <h3>Lịch sử giao dịch</h3>
            <p className="section-note">Hiển thị 20 giao dịch mỗi trang, theo thứ tự dòng mới nhất đến dòng đầu tiên.</p>
            <div className="form-grid">
              <Field label="Từ khóa tra cứu">
                <TextInput placeholder="Nhập mã giao dịch / SĐT người ủng hộ / mã TNV / SĐT TNV" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
              </Field>
            </div>
            <div className="actions">
              <button className="btn-primary" type="button" onClick={() => loadGiaoDichList(token, false, 1)}>
                Tra cứu thông tin
              </button>
              <button className="btn-secondary" type="button" onClick={() => loadGiaoDichList(token, true, 1)}>
                Tải toàn bộ lịch sử
              </button>
            </div>
            <p className="section-note" style={{ marginTop: 12 }}>
              Đang hiển thị {formatNumber(giaoDichRows.length)}
              {giaoDichTotal ? ` / ${formatNumber(giaoDichTotal)}` : ""} giao dịch, trang {formatNumber(giaoDichPage)}.
            </p>
            <GiaoDichTable rows={giaoDichRows} products={hangDoi} onEdit={editGiaoDich} onDelete={deleteGiaoDich} />
            <Pagination page={giaoDichPage} total={giaoDichTotal} pageSize={PAGE_SIZE} hasMore={giaoDichHasMore} onPageChange={(page) => loadGiaoDichList(token, historyAllMode, page)} />
          </Card>
        )}
      </main>
      {feedback}
    </AppShell>
  );
}

function FilterCard({
  filter,
  khuVuc,
  setFilter,
  loadDashboard,
  loadKiemKhoList,
}: {
  filter: { maKhuVuc: string; tenKhuVuc: string; search: string; fromDate: string; toDate: string };
  khuVuc: KhuVuc[];
  setFilter: React.Dispatch<React.SetStateAction<{ maKhuVuc: string; tenKhuVuc: string; search: string; fromDate: string; toDate: string }>>;
  loadDashboard: () => void;
  loadKiemKhoList: () => void;
}) {
  return (
    <Card>
      <h3>Bộ lọc</h3>
      <div className="form-grid">
        <Field label="Khu vực" size="third">
          <SmartSelect
            value={filter.search}
            placeholder="Tất cả khu vực"
            options={khuVuc}
            allowAll
            onChange={(option) => setFilter((current) => ({ ...current, maKhuVuc: option.maKhuVuc, tenKhuVuc: option.tenKhuVuc, search: option.maKhuVuc ? option.tenKhuVuc : "" }))}
          />
        </Field>
        <Field label="Từ ngày" size="third">
          <TextInput type="date" value={filter.fromDate} onChange={(event) => setFilter((current) => ({ ...current, fromDate: event.target.value }))} />
        </Field>
        <Field label="Đến ngày" size="third">
          <TextInput type="date" value={filter.toDate} onChange={(event) => setFilter((current) => ({ ...current, toDate: event.target.value }))} />
        </Field>
      </div>
      <div className="actions">
        <button className="btn-primary" type="button" onClick={loadDashboard}>
          Tải dashboard
        </button>
        <button className="btn-secondary" type="button" onClick={loadKiemKhoList}>
          Tải phiếu kiểm kho
        </button>
        <button className="btn-ghost" type="button" onClick={() => setFilter((current) => ({ ...current, maKhuVuc: "", tenKhuVuc: "", search: "" }))}>
          Tất cả khu vực
        </button>
      </div>
    </Card>
  );
}

function StockVoucherCard({
  khoForm,
  setKhoForm,
  khoList,
  allKhoItems,
  submitPhieuKho,
  resetPhieuKho,
}: {
  khoForm: KhoForm;
  setKhoForm: React.Dispatch<React.SetStateAction<KhoForm>>;
  khoList: KhuVuc[];
  allKhoItems: CatalogItem[];
  submitPhieuKho: () => void;
  resetPhieuKho: (ask?: boolean) => void;
}) {
  return (
    <Card>
      <h3>Lập phiếu xuất/nhập kho</h3>
      <div className="form-grid">
        <Field label="Loại phiếu" size="third">
          <SelectInput value={String(khoForm.LoaiPhieu || "NhapKho")} onChange={(event) => setKhoForm((current) => ({ ...current, LoaiPhieu: event.target.value }))}>
            <option value="NhapKho">Nhập kho</option>
            <option value="XuatDiem">Xuất đến điểm</option>
            <option value="HoanKho">Hoàn kho</option>
            <option value="ChuyenDiem">Chuyển điểm</option>
          </SelectInput>
        </Field>
        <Field label="Ngày phiếu" size="third">
          <TextInput type="date" value={String(khoForm.NgayPhieu || "")} onChange={(event) => setKhoForm((current) => ({ ...current, NgayPhieu: event.target.value }))} />
        </Field>
        <Field label="Từ khu vực" size="third">
          <SmartSelect
            value={String(khoForm.TuKhuVucSearch || "")}
            placeholder="Chọn nơi gửi / Kho tổng"
            options={khoList}
            onChange={(option) => setKhoForm((current) => ({ ...current, TuKhuVuc: option.maKhuVuc || option.tenKhuVuc, TuKhuVucSearch: option.tenKhuVuc }))}
          />
        </Field>
        <Field label="Đến khu vực" size="third">
          <SmartSelect
            value={String(khoForm.DenKhuVucSearch || "")}
            placeholder="Chọn nơi nhận"
            options={khoList}
            onChange={(option) => setKhoForm((current) => ({ ...current, DenKhuVuc: option.maKhuVuc || option.tenKhuVuc, DenKhuVucSearch: option.tenKhuVuc }))}
          />
        </Field>
        <Field label="Ghi chú">
          <TextArea rows={3} placeholder="Ghi chú phiếu kho nếu có" value={String(khoForm.GhiChu || "")} onChange={(event) => setKhoForm((current) => ({ ...current, GhiChu: event.target.value }))} />
        </Field>
      </div>
      <h3 style={{ marginTop: 18 }}>Mặt hàng</h3>
      <div className="form-grid">
        {allKhoItems.map((item) => (
          <Field key={item.key} label={item.label} size="third">
            <TextInput type="number" min="0" step="1" value={Number(khoForm[`Kho_${item.key}`] || 0)} onChange={(event) => setKhoForm((current) => ({ ...current, [`Kho_${item.key}`]: Number(event.target.value || 0) }))} />
          </Field>
        ))}
      </div>
      <div className="actions">
        <button className="btn-primary" type="button" onClick={submitPhieuKho}>
          Lưu phiếu kho
        </button>
        <button className="btn-ghost" type="button" onClick={() => resetPhieuKho()}>
          Xóa phiếu
        </button>
      </div>
    </Card>
  );
}

function ProductManagerCard({
  hangDoi,
  hangTrungBay,
  productForm,
  setProductForm,
  addSanPham,
  deleteSanPham,
}: {
  hangDoi: CatalogItem[];
  hangTrungBay: CatalogItem[];
  productForm: { key: string; label: string; loaiSanPham: string };
  setProductForm: React.Dispatch<React.SetStateAction<{ key: string; label: string; loaiSanPham: string }>>;
  addSanPham: () => void;
  deleteSanPham: (item: CatalogItem) => void;
}) {
  return (
    <Card>
      <h3>Thêm sản phẩm</h3>
      <p className="section-note">Khi lưu, backend sẽ thêm sản phẩm vào sheet cấu hình và đồng bộ các cột cần thiết cho giao dịch, kiểm kho, xuất/nhập kho.</p>
      <div className="form-grid">
        <Field label="Mã sản phẩm" size="third">
          <TextInput placeholder="Vi du: BinhGiuNhiet" value={productForm.key} onChange={(event) => setProductForm((current) => ({ ...current, key: event.target.value }))} />
        </Field>
        <Field label="Tên sản phẩm" size="third">
          <TextInput placeholder="Bình giữ nhiệt" value={productForm.label} onChange={(event) => setProductForm((current) => ({ ...current, label: event.target.value }))} />
        </Field>
        <Field label="Loại sản phẩm" size="third">
          <SelectInput value={productForm.loaiSanPham} onChange={(event) => setProductForm((current) => ({ ...current, loaiSanPham: event.target.value }))}>
            <option value="HangDoi">Hàng đổi</option>
            <option value="HangTrungBay">Hàng trưng bày/CSVC</option>
          </SelectInput>
        </Field>
      </div>
      <div className="actions">
        <button className="btn-primary" type="button" onClick={addSanPham}>
          Thêm sản phẩm
        </button>
      </div>
      <ProductList title="Hàng đổi" items={hangDoi} onDelete={deleteSanPham} />
      <ProductList title="Hàng trưng bày/CSVC" items={hangTrungBay} onDelete={deleteSanPham} />
    </Card>
  );
}

function ProductList({ title, items, onDelete }: { title: string; items: CatalogItem[]; onDelete: (item: CatalogItem) => void }) {
  return (
    <>
      <h3 style={{ marginTop: 18 }}>{title}</h3>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.key}>
                <td>{item.key}</td>
                <td>{item.label}</td>
                <td>
                  <button className="btn-danger btn-small" type="button" onClick={() => onDelete(item)}>
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DashboardCards({ data }: { data: DashboardData | null }) {
  const stats = [
    ["Tổng giao dịch", data?.tongGiaoDich],
    ["Tổng điểm gói", data?.tongDiemGoi],
    ["Điểm đã đổi", data?.tongDiemDoiHang],
    ["Phiếu bất thường", data?.soPhieuKiemKhoBatThuong],
  ];
  return (
    <div className="admin-stat-grid">
      {stats.map(([label, value]) => (
        <div className="stat-card" key={String(label)}>
          <div className="label">{label}</div>
          <div className="value">{formatNumber(value)}</div>
        </div>
      ))}
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (!rows.length) return <p className="section-note">Chưa có dữ liệu.</p>;
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>{row.map((cell, idx) => <td key={`${cell}-${idx}`}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KiemKhoTable({ rows }: { rows: KiemKhoRow[] }) {
  if (!rows.length) return <p className="section-note">Không có phiếu.</p>;
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Mã</th>
            <th>Ngày</th>
            <th>Buổi</th>
            <th>Khu vực</th>
            <th>Loại</th>
            <th>Trạng thái</th>
            <th>Ảnh</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.MaKiemKho)} className={row.TrangThaiXacNhan === "CoBatThuong" ? "row-warning" : ""}>
              <td>{String(row.MaKiemKho || "")}</td>
              <td>{String(row.NgayToChuc || "")}</td>
              <td>{String(row.BuoiToChuc || "")}</td>
              <td>{String(row.MaKhuVuc || row.TenKhuVuc || "")}</td>
              <td>{String(row.LoaiKiem || "")}</td>
              <td>
                <span className={`pill ${row.TrangThaiXacNhan === "CoBatThuong" ? "bad" : "warn"}`}>{String(row.TrangThaiXacNhan || "")}</span>
              </td>
              <td>{row.AnhMinhChung_URL ? <a href={String(row.AnhMinhChung_URL)} target="_blank">Xem</a> : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GiaoDichTable({
  rows,
  products,
  onEdit,
  onDelete,
}: {
  rows: GiaoDichRow[];
  products: CatalogItem[];
  onEdit: (row: GiaoDichRow) => void;
  onDelete: (maGiaoDich: string) => void;
}) {
  if (!rows.length) return <p className="section-note">Không tìm thấy giao dịch phù hợp.</p>;
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Mã giao dịch</th>
            <th>Địa điểm</th>
            <th>Thông tin người ủng hộ</th>
            <th>Số sản phẩm đem tới đổi</th>
            <th>Số hàng đã đổi</th>
            <th>Mã TNV/SĐT thực hiện</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const deleted = String(row.TrangThai || "").toLowerCase().includes("xoa");
            return (
              <tr key={String(row.MaGiaoDich)}>
                <td>
                  <strong>{String(row.MaGiaoDich || "")}</strong>
                  <br />
                  <small>{formatDateTime(row.ThoiGianNhap)}</small>
                </td>
                <td>
                  {String(row.TenKhuVuc || row.MaKhuVuc || "")}
                  <br />
                  <small>
                    {String(row.NgayToChuc || "")} {String(row.BuoiToChuc || "")}
                  </small>
                </td>
                <td>
                  {String(row.HoTenNguoiUngHo || "")}
                  <br />
                  <small>{String(row.SoDienThoai || "")}</small>
                </td>
                <td>{renderHangMangToiText(row)}</td>
                <td>{renderHangDoiText(row, products)}</td>
                <td>{String(row.EmailTNV || "")}</td>
                <td>
                  <span className={`pill ${deleted ? "bad" : "good"}`}>{String(row.TrangThai || "Hop le")}</span>
                </td>
                <td>
                  <button className="btn-ghost btn-small" type="button" onClick={() => onEdit(row)}>
                    Điều chỉnh
                  </button>
                  {!deleted && (
                    <button className="btn-danger btn-small" type="button" onClick={() => onDelete(String(row.MaGiaoDich || ""))}>
                      Xóa/hoàn tồn
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({
  page,
  total,
  pageSize,
  hasMore,
  onPageChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}) {
  const totalPages = total ? Math.max(1, Math.ceil(total / pageSize)) : page + (hasMore ? 1 : 0);
  if (totalPages <= 1) return null;
  const pages = getPaginationItems(page, totalPages);

  return (
    <div className="pagination">
      <button className="btn-ghost btn-small" type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Trước
      </button>
      {pages.map((p, index) => (
        typeof p === "number" ? (
          <button key={`${p}-${index}`} className={p === page ? "btn-primary btn-small" : "btn-ghost btn-small"} type="button" onClick={() => onPageChange(p)}>
            {p}
          </button>
        ) : (
          <span key={`${p}-${index}`} className="pagination-ellipsis">
            ...
          </span>
        )
      ))}
      <button className="btn-ghost btn-small" type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Sau
      </button>
    </div>
  );
}

function getPaginationItems(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (page <= 4) return [1, 2, 3, 4, "ellipsis", totalPages];
  if (page >= totalPages - 3) return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages];
}

function renderHangMangToiText(row: GiaoDichRow) {
  const list = [
    ["A", row.NhomA_KG, "kg"],
    ["B", row.NhomB_KG, "kg"],
    ["Cặp", row.NhomC_CapTui, "cái"],
    ["Bộ dụng cụ", row.NhomC_BoDungCu, "bộ"],
    ["Quần áo", row.NhomC_QuanAo_KG, "kg"],
    ["Đồ chơi/gấu bông", row.NhomC_DoChoi_Cai, "cái"],
    ["Tập vở", row.NhomC_TapVo_Quyen, "quyển"],
    ["Giấy", row.NhomD_GiayBao_KG, "kg"],
    ["Carton", row.NhomD_Carton_KG, "kg"],
    ["Vỏ sữa", row.NhomD_VoSua_Cai, "vỏ"],
    ["Nhựa", row.NhomD_Nhua_Cai, "sp"],
    ["Vỏ lon", row.NhomD_VoLon_Cai, "sp"],
  ].filter((item) => Number(item[1] || 0) > 0);
  return list.length ? list.map((item) => `${item[0]}: ${formatNumber(item[1])} ${item[2]}`).join(", ") : "-";
}

function renderHangDoiText(row: GiaoDichRow, products: CatalogItem[]) {
  const list = products.map((item) => [item.label, row[`HangDoi_${item.key}`]]).filter((item) => Number(item[1] || 0) > 0);
  return list.length ? list.map((item) => `${item[0]}: ${formatNumber(item[1])}`).join(", ") : "-";
}

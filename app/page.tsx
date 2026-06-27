"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, Field, NumberField, SelectInput, TextInput } from "@/components/FormBits";
import { SmartSelect } from "@/components/SmartSelect";
import { useFeedback } from "@/components/Feedback";
import { Api, type AiSuggestionResult, type GiaoDichRow, type KhuVuc, type StockMap } from "@/lib/api";
import { APP_CONFIG, type CatalogItem } from "@/lib/config";
import { formatNumber, todayInputValue } from "@/lib/format";
import { readLocal, removeLocal, saveLocal } from "@/lib/storage";

type FormState = Record<string, string | number>;

const DEFAULT_FORM: FormState = {
  MaKhuVuc: "",
  TenKhuVuc: "",
  KhuVucSearch: "",
  NgayToChuc: "",
  BuoiToChuc: "Sáng",
  MaTuan: "",
  HoTenNguoiUngHo: "",
  SoDienThoai: "",
  EmailTNV: "",
  NhomA_KG: 0,
  NhomB_KG: 0,
};

export default function GiaoDichPage() {
  const { toast, setLoading, feedback } = useFeedback();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [khuVuc, setKhuVuc] = useState<KhuVuc[]>([]);
  const [hangDoi, setHangDoi] = useState<CatalogItem[]>(APP_CONFIG.HANG_DOI);
  const [tonKho, setTonKho] = useState<StockMap>({});
  const [aiResult, setAiResult] = useState<AiSuggestionResult | null>(null);
  const [summary, setSummary] = useState("");
  const [lastCode, setLastCode] = useState("");
  const [history, setHistory] = useState<GiaoDichRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const draft = readLocal<FormState | null>(APP_CONFIG.STORAGE_KEYS.DRAFT_GIAODICH, null);
    const context = readLocal<Partial<FormState>>(APP_CONFIG.STORAGE_KEYS.WORK_CONTEXT, {});
    setForm((current) => ({
      ...current,
      ...draft,
      ...context,
      NgayToChuc: String(draft?.NgayToChuc || context.NgayToChuc || todayInputValue()),
    }));
    void loadConfig(context.MaKhuVuc ? String(context.MaKhuVuc) : "");
  }, []);

  const payload = useMemo(() => collect(form, hangDoi), [form, hangDoi]);

  function updateField(key: string, value: string | number) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      saveDraft(next, hangDoi);
      return next;
    });
  }

  async function loadConfig(initialKhuVuc = "") {
    try {
      setLoading(true, "Đang tải cấu hình...");
      const res = await Api.getConfig();
      if (!res.success) throw new Error(res.error);
      setKhuVuc(res.data.khuVuc || []);
      setHangDoi((res.data.hangDoi?.length ? res.data.hangDoi : APP_CONFIG.HANG_DOI) as CatalogItem[]);

      const maTuan = String(res.data.tuanActive?.MaTuan || res.data.tuanActive?.maTuan || "");
      if (maTuan) updateField("MaTuan", maTuan);
      if (initialKhuVuc) await loadTonKho(initialKhuVuc);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không tải được cấu hình.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadTonKho(maKhuVuc: string) {
    try {
      const res = await Api.getTonKho({ maKhuVuc });
      if (!res.success) throw new Error(res.error);
      setTonKho(res.data.tonKho || {});
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không tải được tồn kho.", "warning");
    }
  }

  function selectKhuVuc(option: KhuVuc) {
    updateMany({
      MaKhuVuc: option.maKhuVuc,
      TenKhuVuc: option.tenKhuVuc,
      KhuVucSearch: option.tenKhuVuc,
    });
    void loadTonKho(option.maKhuVuc);
  }

  function updateMany(values: Record<string, string | number>) {
    setForm((current) => {
      const next = { ...current, ...values };
      saveDraft(next, hangDoi);
      return next;
    });
  }

  async function loadDeXuatAI() {
    if (!form.MaKhuVuc) {
      toast("Vui lòng chọn khu vực trước.", "warning");
      return;
    }
    try {
      setLoading(true, "AI đang tính đề xuất...");
      const res = await Api.getDeXuatDoiHang({ ...payload, tonKho });
      if (!res.success) throw new Error(res.error);
      setAiResult(res.data);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không lấy được đề xuất.", "error");
    } finally {
      setLoading(false);
    }
  }

  function applySuggestion(index: number) {
    const suggestion = aiResult?.suggestions?.[index];
    if (!suggestion) return;

    const next: Record<string, string | number> = {};
    hangDoi.forEach((item) => {
      next[`HangDoi_${item.key}`] = 0;
    });
    suggestion.items.forEach((item) => {
      next[`HangDoi_${item.key}`] = Math.min(Number(item.soLuong || 0), Number(tonKho[item.key] || 0));
    });
    updateMany(next);
    toast("Đã áp dụng đề xuất.", "success");
  }

  function validate() {
    const required = ["MaKhuVuc", "NgayToChuc", "BuoiToChuc", "HoTenNguoiUngHo"];
    const ok = required.every((key) => String(form[key] || "").trim());
    const overStock = hangDoi.some((item) => Number(form[`HangDoi_${item.key}`] || 0) > Number(tonKho[item.key] || 0));
    if (!ok || overStock) {
      toast("Vui lòng kiểm tra thông tin bắt buộc hoặc số lượng vượt tồn kho.", "warning");
      return false;
    }
    return true;
  }

  async function previewGiaoDich() {
    if (!validate()) return;
    try {
      const res = await Api.getDeXuatDoiHang({ ...payload, tonKho });
      const diem = res.success ? res.data.diem : { tongDiem: 0 };
      const selected = hangDoi
        .map((item) => ({ label: item.label, qty: Number(form[`HangDoi_${item.key}`] || 0) }))
        .filter((item) => item.qty > 0);

      setSummary(
        `Khu vực: ${form.TenKhuVuc || ""}\nNgười ủng hộ: ${form.HoTenNguoiUngHo || ""}\nSố suất đủ quy đổi: ${formatNumber(
          diem?.tongDiem || 0,
        )}\nHàng đổi đã chọn: ${selected.length ? selected.map((item) => `${item.label}: ${formatNumber(item.qty)}`).join(", ") : "Chưa chọn hàng đổi."}`,
      );
      saveDraft(form, hangDoi);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không tính được tóm tắt.", "error");
    }
  }

  async function submitGiaoDich() {
    if (submitting || !validate()) return;
    await previewGiaoDich();
    if (!window.confirm("Xác nhận lưu giao dịch?")) return;

    try {
      setSubmitting(true);
      setLoading(true, "Đang lưu...");
      const res = await Api.submitGiaoDich(payload);
      if (!res.success) throw new Error(res.error);
      setLastCode(res.data.maGiaoDich);
      toast(`${res.data.duplicate ? "Không lưu trùng, dùng lại mã" : "Đã lưu"}: ${res.data.maGiaoDich}`, res.data.duplicate ? "warning" : "success");
      await loadLichSuGiaoDich();
      resetForm(false);
      if (form.MaKhuVuc) await loadTonKho(String(form.MaKhuVuc));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không lưu được giao dịch.", "error");
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  }

  async function loadLichSuGiaoDich() {
    const keyword = String(form.EmailTNV || form.SoDienThoai || "");
    if (!keyword) {
      toast("Nhập mã TNV/SĐT TNV hoặc SĐT người ủng hộ để tải lịch sử.", "warning");
      return;
    }
    try {
      const res = await Api.getGiaoDich({ keyword, limit: 20 });
      if (!res.success) throw new Error(res.error);
      setHistory(res.data.rows || []);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không tải được lịch sử.", "error");
    }
  }

  function resetForm(ask = true) {
    if (ask && !window.confirm("Xóa form?")) return;
    const preserved = {
      MaTuan: form.MaTuan,
      NgayToChuc: form.NgayToChuc,
      EmailTNV: form.EmailTNV,
      MaKhuVuc: form.MaKhuVuc,
      TenKhuVuc: form.TenKhuVuc,
      KhuVucSearch: form.KhuVucSearch,
      BuoiToChuc: form.BuoiToChuc,
    };
    const cleared: FormState = { ...DEFAULT_FORM, ...preserved };
    [...APP_CONFIG.NHOM_C, ...APP_CONFIG.NHOM_D].forEach((item) => (cleared[item.field] = 0));
    hangDoi.forEach((item) => (cleared[`HangDoi_${item.key}`] = 0));
    setForm(cleared);
    setAiResult(null);
    setSummary("");
    removeLocal(APP_CONFIG.STORAGE_KEYS.DRAFT_GIAODICH);
  }

  return (
    <AppShell icon="🌱" subtitle="Nhập thông tin người ủng hộ" heroTitle="Nhập giao dịch đổi hàng" heroText="Chọn phiên, nhập hàng ủng hộ, xem đề xuất đổi hàng và lưu giao dịch.">
      <main className="grid">
        <Card span={5}>
          <h3>1. Phiên làm việc</h3>
          <div className="form-grid">
            <Field label="Khu vực">
              <SmartSelect value={String(form.KhuVucSearch || "")} placeholder="Tìm khu vực..." options={khuVuc} onChange={selectKhuVuc} />
            </Field>
            <Field label="Ngày" size="half">
              <TextInput type="date" value={String(form.NgayToChuc || "")} onChange={(e) => updateField("NgayToChuc", e.target.value)} />
            </Field>
            <Field label="Buổi" size="half">
              <SelectInput value={String(form.BuoiToChuc || "Sáng")} onChange={(e) => updateField("BuoiToChuc", e.target.value)}>
                <option>Sáng</option>
                <option>Chiều</option>
              </SelectInput>
            </Field>
            <Field label="Tuần quy đổi">
              <TextInput value={String(form.MaTuan || "")} readOnly />
            </Field>
          </div>
        </Card>

        <Card span={7}>
          <h3>2. Người ủng hộ</h3>
          <div className="form-grid">
            <Field label="Họ tên người ủng hộ" size="half">
              <TextInput value={String(form.HoTenNguoiUngHo || "")} onChange={(e) => updateField("HoTenNguoiUngHo", e.target.value)} />
            </Field>
            <Field label='SĐT người ủng hộ (không cung cấp thì điền "00")' size="half">
              <TextInput value={String(form.SoDienThoai || "")} onChange={(e) => updateField("SoDienThoai", e.target.value)} />
            </Field>
            <Field label="Mã TNV / SĐT của TNV">
              <TextInput value={String(form.EmailTNV || "")} onChange={(e) => updateField("EmailTNV", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <h3>3. Hàng đã trao</h3>
          <p className="section-note">Nhập số lượng sản phẩm để hệ thống đề xuất hàng đổi và kiểm soát hàng hóa.</p>
          <div className="form-grid">
            <NumberField label="Nhóm A - SGK chương trình mới" unit="kg" value={Number(form.NhomA_KG || 0)} onChange={(v) => updateField("NhomA_KG", v)} />
            <NumberField label="Nhóm B - SGK chương trình cũ, tài liệu, sách tham khảo" unit="kg" value={Number(form.NhomB_KG || 0)} onChange={(v) => updateField("NhomB_KG", v)} />
          </div>
          <h3 style={{ marginTop: 18 }}>Nhóm C</h3>
          <div className="form-grid">
            {APP_CONFIG.NHOM_C.map((item) => (
              <NumberField key={item.field} label={item.label} unit={item.unit} value={Number(form[item.field] || 0)} onChange={(v) => updateField(item.field, v)} />
            ))}
          </div>
          <h3 style={{ marginTop: 18 }}>Nhóm D</h3>
          <div className="form-grid">
            {APP_CONFIG.NHOM_D.map((item) => (
              <NumberField key={item.field} label={item.label} unit={item.unit} value={Number(form[item.field] || 0)} onChange={(v) => updateField(item.field, v)} />
            ))}
          </div>
        </Card>

        <Card span={6}>
          <h3>4. AI đề xuất đổi hàng</h3>
          <p className="section-note">Bấm nút sau khi nhập hàng người ủng hộ mang tới.</p>
          <div className="actions">
            <button className="btn-primary" type="button" onClick={loadDeXuatAI}>
              AI đề xuất hàng đổi
            </button>
          </div>
          {aiResult && <AiResult data={aiResult} onApply={applySuggestion} />}
        </Card>

        <Card span={6}>
          <h3>5. Hàng đổi thực tế</h3>
          <p className="section-note">Có thể dùng đề xuất hoặc nhập tay. Không được vượt tồn kho.</p>
          <div className="summary-box">
            <strong>Tổng hàng đổi đang có tại điểm:</strong> {formatNumber(hangDoi.reduce((sum, item) => sum + Number(tonKho[item.key] || 0), 0))} món
          </div>
          <div className="exchange-list">
            {hangDoi.map((item) => {
              const stock = Number(tonKho[item.key] || 0);
              const key = `HangDoi_${item.key}`;
              return (
                <div className="exchange-item" key={item.key}>
                  <div>
                    <label>{item.label}</label>
                    <div style={{ fontSize: 12, color: stock <= 0 ? "var(--danger)" : "var(--muted)", marginTop: 4 }}>
                      Tồn hiện tại: <strong>{formatNumber(stock)}</strong>
                    </div>
                  </div>
                  <input type="number" min="0" max={stock} step="1" value={Number(form[key] || 0)} onChange={(e) => updateField(key, Math.min(Number(e.target.value || 0), stock))} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h3>6. Lưu giao dịch</h3>
          <div className="actions">
            <button className="btn-primary" type="button" onClick={previewGiaoDich}>
              Tính điểm / Tóm tắt
            </button>
            <button className="btn-secondary" type="button" disabled={submitting} onClick={submitGiaoDich}>
              {submitting ? "Đang lưu..." : "Lưu giao dịch"}
            </button>
            <button className="btn-ghost" type="button" onClick={() => resetForm()}>
              Xóa form
            </button>
          </div>
          {summary && <pre className="summary-box">{summary}</pre>}
        </Card>

        <Card>
          <h3>7. Kết quả & lịch sử giao dịch</h3>
          {lastCode && (
            <div className="summary-box">
              <strong>Mã giao dịch:</strong> <span style={{ fontSize: 18 }}>{lastCode}</span>
            </div>
          )}
          <div className="actions">
            <button className="btn-secondary" type="button" onClick={loadLichSuGiaoDich}>
              Tải lịch sử giao dịch của TNV
            </button>
          </div>
          <HistoryTable rows={history} />
        </Card>
      </main>
      {feedback}
    </AppShell>
  );
}

function collect(form: FormState, hangDoi: CatalogItem[] = APP_CONFIG.HANG_DOI) {
  const payload: Record<string, string | number> = {
    MaKhuVuc: String(form.MaKhuVuc || ""),
    TenKhuVuc: String(form.TenKhuVuc || ""),
    NgayToChuc: String(form.NgayToChuc || ""),
    BuoiToChuc: String(form.BuoiToChuc || ""),
    MaTuan: String(form.MaTuan || ""),
    HoTenNguoiUngHo: String(form.HoTenNguoiUngHo || ""),
    SoDienThoai: String(form.SoDienThoai || ""),
    EmailTNV: String(form.EmailTNV || ""),
    NhomA_KG: Number(form.NhomA_KG || 0),
    NhomB_KG: Number(form.NhomB_KG || 0),
  };
  [...APP_CONFIG.NHOM_C, ...APP_CONFIG.NHOM_D].forEach((item) => (payload[item.field] = Number(form[item.field] || 0)));
  hangDoi.forEach((item) => (payload[`HangDoi_${item.key}`] = Number(form[`HangDoi_${item.key}`] || 0)));
  return payload;
}

function saveDraft(form: FormState, hangDoi: CatalogItem[] = APP_CONFIG.HANG_DOI) {
  saveLocal(APP_CONFIG.STORAGE_KEYS.DRAFT_GIAODICH, collect(form, hangDoi));
  saveLocal(APP_CONFIG.STORAGE_KEYS.WORK_CONTEXT, {
    MaKhuVuc: form.MaKhuVuc,
    TenKhuVuc: form.TenKhuVuc,
    KhuVucSearch: form.KhuVucSearch,
    NgayToChuc: form.NgayToChuc,
    BuoiToChuc: form.BuoiToChuc,
    EmailTNV: form.EmailTNV,
  });
}

function AiResult({ data, onApply }: { data: AiSuggestionResult; onApply: (index: number) => void }) {
  const diem = data.diem || {};
  const suggestions = data.suggestions || [];
  return (
    <>
      <div className="summary-box">
        <p>
          <strong>Cách tính:</strong> AI đề xuất theo từng nhóm trong bảng quy đổi, không dùng điểm gói.
        </p>
        <p>
          Nhóm A: <strong>{formatNumber(diem.diemA)}</strong> · Nhóm B: <strong>{formatNumber(diem.diemB)}</strong> · Nhóm C: <strong>{formatNumber(diem.diemC)}</strong> · Nhóm D: <strong>{formatNumber(diem.diemD)}</strong>
        </p>
      </div>
      <div className="suggestion-list">
        {suggestions.length ? (
          suggestions.map((suggestion, index) => (
            <div className="suggestion-card" key={`${suggestion.note}-${index}`}>
              <h4>Phương án {index + 1}</h4>
              <p>
                <strong>Ghép theo bảng quy đổi:</strong> {suggestion.note || "Phương án tối ưu"}
              </p>
              <ul>
                {suggestion.items.map((item) => (
                  <li key={`${item.key}-${item.soLuong}`}>
                    {item.tenHangDoi}: <strong>{formatNumber(item.soLuong)}</strong>
                  </li>
                ))}
              </ul>
              <button className="btn-secondary" type="button" onClick={() => onApply(index)}>
                Dùng đề xuất này
              </button>
            </div>
          ))
        ) : (
          <div className="summary-box">Chưa đủ điểm hoặc không còn hàng phù hợp để đề xuất.</div>
        )}
      </div>
    </>
  );
}

function HistoryTable({ rows }: { rows: GiaoDichRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Mã GD</th>
            <th>Địa điểm</th>
            <th>Người ủng hộ</th>
            <th>Sản phẩm đem tới</th>
            <th>Hàng đã đổi</th>
            <th>TNV</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.MaGiaoDich)}>
              <td>
                <strong>{row.MaGiaoDich}</strong>
              </td>
              <td>{String(row.TenKhuVuc || row.MaKhuVuc || "")}</td>
              <td>
                {String(row.HoTenNguoiUngHo || "")}
                <br />
                <small>{String(row.SoDienThoai || "")}</small>
              </td>
              <td>{renderHangMangToiText(row)}</td>
              <td>{renderHangDoiText(row)}</td>
              <td>{String(row.EmailTNV || "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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

function renderHangDoiText(row: GiaoDichRow) {
  const list = APP_CONFIG.HANG_DOI.map((item) => [item.label, row[`HangDoi_${item.key}`]]).filter((item) => Number(item[1] || 0) > 0);
  return list.length ? list.map((item) => `${item[0]}: ${formatNumber(item[1])}`).join(", ") : "-";
}

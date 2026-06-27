"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, Field, SelectInput, TextArea, TextInput } from "@/components/FormBits";
import { SmartSelect } from "@/components/SmartSelect";
import { useFeedback } from "@/components/Feedback";
import { Api, type KhuVuc, type StockMap, type TonKhoSource } from "@/lib/api";
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
  LoaiKiem: "DauBuoi",
  EmailNguoiKiem: "",
  AnhMinhChung_URL: "",
  GhiChu: "",
};

export default function KiemKhoPage() {
  const { toast, setLoading, feedback } = useFeedback();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [khuVuc, setKhuVuc] = useState<KhuVuc[]>([]);
  const [hangDoi, setHangDoi] = useState<CatalogItem[]>(APP_CONFIG.HANG_DOI);
  const [hangTrungBay, setHangTrungBay] = useState<CatalogItem[]>(APP_CONFIG.HANG_TRUNG_BAY);
  const [tonKho, setTonKho] = useState<StockMap>({});
  const [source, setSource] = useState<TonKhoSource | null>(null);
  const [summary, setSummary] = useState<string[]>([]);

  const allItems = useMemo(() => [...hangDoi, ...hangTrungBay], [hangDoi, hangTrungBay]);

  useEffect(() => {
    const draft = readLocal<FormState | null>(APP_CONFIG.STORAGE_KEYS.DRAFT_KIEMKHO, null);
    const context = readLocal<Partial<FormState>>(APP_CONFIG.STORAGE_KEYS.WORK_CONTEXT, {});
    setForm((current) => ({
      ...current,
      ...draft,
      ...context,
      EmailNguoiKiem: String(draft?.EmailNguoiKiem || context.EmailTNV || ""),
      NgayToChuc: String(draft?.NgayToChuc || context.NgayToChuc || todayInputValue()),
    }));
    void loadConfig(context.MaKhuVuc ? String(context.MaKhuVuc) : "");
  }, []);

  function updateField(key: string, value: string | number) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      saveDraft(next, allItems);
      return next;
    });
  }

  async function loadConfig(initialKhuVuc = "") {
    try {
      setLoading(true, "Đang tải...");
      const res = await Api.getConfig();
      if (!res.success) throw new Error(res.error);
      setKhuVuc(res.data.khuVuc || []);
      setHangDoi((res.data.hangDoi?.length ? res.data.hangDoi : APP_CONFIG.HANG_DOI) as CatalogItem[]);
      setHangTrungBay((res.data.hangTrungBay?.length ? res.data.hangTrungBay : APP_CONFIG.HANG_TRUNG_BAY) as CatalogItem[]);
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
      setSource(res.data.tonKhoSource || null);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không tải được tồn kho.", "warning");
    }
  }

  function selectKhuVuc(option: KhuVuc) {
    setForm((current) => {
      const next = {
        ...current,
        MaKhuVuc: option.maKhuVuc,
        TenKhuVuc: option.tenKhuVuc,
        KhuVucSearch: option.tenKhuVuc,
      };
      saveDraft(next, allItems);
      return next;
    });
    void loadTonKho(option.maKhuVuc);
  }

  function validate() {
    if (!form.MaKhuVuc || !form.NgayToChuc || !form.BuoiToChuc || !form.LoaiKiem) {
      toast("Vui lòng nhập đủ thông tin phiên kiểm.", "warning");
      return false;
    }
    return true;
  }

  function previewKiemKho() {
    if (!validate()) return;
    const warnings = allItems
      .map((item) => {
        const lyThuyet = Number(tonKho[item.key] || 0);
        const thucTe = Number(form[`${item.key}_ThucTe`] || 0);
        const lech = thucTe - lyThuyet;
        if (lech < 0) return `${item.label}: thiếu ${formatNumber(Math.abs(lech))}`;
        if (lech > 0) return `${item.label}: dư ${formatNumber(lech)}`;
        return "";
      })
      .filter(Boolean);
    setSummary(warnings);
    saveDraft(form, allItems);
  }

  async function submitKiemKho() {
    if (!validate()) return;
    previewKiemKho();

    const hasHutHang = allItems.some((item) => Number(form[`${item.key}_ThucTe`] || 0) < Number(tonKho[item.key] || 0));
    if (hasHutHang && !form.AnhMinhChung_URL) {
      toast("Có hàng bị hụt, vui lòng dán URL ảnh minh chứng.", "warning");
      return;
    }
    if (!window.confirm("Xác nhận lưu phiếu kiểm kho?")) return;

    try {
      setLoading(true, "Đang lưu...");
      const res = await Api.submitKiemKho(collect(form, allItems.map((item) => item.key)));
      if (!res.success) throw new Error(res.error);
      toast(`Đã lưu: ${res.data.maKiemKho}`, "success");
      removeLocal(APP_CONFIG.STORAGE_KEYS.DRAFT_KIEMKHO);
      if (form.MaKhuVuc) await loadTonKho(String(form.MaKhuVuc));
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không lưu được phiếu kiểm kho.", "error");
    } finally {
      setLoading(false);
    }
  }

  function resetKiemKho() {
    if (!window.confirm("Xóa form?")) return;
    const preserved = {
      MaKhuVuc: form.MaKhuVuc,
      TenKhuVuc: form.TenKhuVuc,
      KhuVucSearch: form.KhuVucSearch,
      NgayToChuc: form.NgayToChuc,
      BuoiToChuc: form.BuoiToChuc,
      EmailNguoiKiem: form.EmailNguoiKiem,
      LoaiKiem: form.LoaiKiem,
    };
    const next: FormState = { ...DEFAULT_FORM, ...preserved };
    allItems.forEach((item) => (next[`${item.key}_ThucTe`] = 0));
    setForm(next);
    setSummary([]);
    removeLocal(APP_CONFIG.STORAGE_KEYS.DRAFT_KIEMKHO);
  }

  const totalStock = allItems.reduce((sum, item) => sum + Number(tonKho[item.key] || 0), 0);

  return (
    <AppShell icon="📦" subtitle="Kiểm kho bằng cách đếm thực tế" heroTitle="Kiểm kho đầu/cuối buổi" heroText="TNV chỉ cần đếm số lượng thực tế. Hệ thống tự so sánh với tồn kho lý thuyết.">
      <main className="grid">
        <Card span={5}>
          <h3>1. Phiên kiểm</h3>
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
            <Field label="Loại kiểm">
              <SelectInput value={String(form.LoaiKiem || "DauBuoi")} onChange={(e) => updateField("LoaiKiem", e.target.value)}>
                <option value="DauBuoi">Đầu buổi / Đầu ngày</option>
                <option value="CuoiBuoi">Cuối buổi / Cuối ngày</option>
              </SelectInput>
            </Field>
            <Field label="Email người kiểm">
              <TextInput type="email" value={String(form.EmailNguoiKiem || "")} onChange={(e) => updateField("EmailNguoiKiem", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card span={7}>
          <h3>2. Tồn kho hệ thống</h3>
          <div className="summary-box">
            <strong>Tổng tồn hệ thống tại điểm:</strong> {formatNumber(totalStock)} món
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>{sourceText(source)}</div>
          </div>
          <p className="section-note" style={{ marginTop: 12 }}>
            Tồn hệ thống = nhập/xuất kho - giao dịch đã đổi.
          </p>
        </Card>

        <InventorySection title="3. Hàng đổi - TNV chỉ nhập số đếm thực tế" badge="Hàng đổi" items={hangDoi} form={form} tonKho={tonKho} updateField={updateField} />
        <InventorySection title="4. Hàng trưng bày / CSVC - TNV chỉ nhập số đếm thực tế" badge="Trưng bày/CSVC" items={hangTrungBay} form={form} tonKho={tonKho} updateField={updateField} />

        <Card span={6}>
          <h3>5. Minh chứng</h3>
          <div className="form-grid">
            <Field label="URL ảnh minh chứng">
              <TextInput placeholder="Bắt buộc nếu có lệch kho" value={String(form.AnhMinhChung_URL || "")} onChange={(e) => updateField("AnhMinhChung_URL", e.target.value)} />
            </Field>
            <Field label="Ghi chú">
              <TextArea rows={4} value={String(form.GhiChu || "")} onChange={(e) => updateField("GhiChu", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card span={6}>
          <h3>6. Lưu phiếu</h3>
          <div className="actions">
            <button className="btn-primary" type="button" onClick={previewKiemKho}>
              Xem lệch kho
            </button>
            <button className="btn-secondary" type="button" onClick={submitKiemKho}>
              Lưu phiếu kiểm kho
            </button>
            <button className="btn-ghost" type="button" onClick={resetKiemKho}>
              Xóa form
            </button>
          </div>
          {summary.length ? (
            <div className="summary-box">
              <p>
                <strong>Có lệch kho:</strong>
              </p>
              <ul>{summary.map((item) => <li key={item}>{item}</li>)}</ul>
              <p>Nếu có hụt hàng, cần dán URL ảnh minh chứng trước khi lưu.</p>
            </div>
          ) : (
            <div className="summary-box">
              <strong>Số đếm thực tế khớp với tồn hệ thống hoặc chưa xem lệch.</strong>
            </div>
          )}
        </Card>
      </main>
      {feedback}
    </AppShell>
  );
}

function InventorySection({
  title,
  badge,
  items,
  form,
  tonKho,
  updateField,
}: {
  title: string;
  badge: string;
  items: CatalogItem[];
  form: FormState;
  tonKho: StockMap;
  updateField: (key: string, value: string | number) => void;
}) {
  return (
    <Card>
      <h3>{title}</h3>
      <div className="inventory-list">
        {items.map((item) => {
          const lyThuyet = Number(tonKho[item.key] || 0);
          const thucTe = Number(form[`${item.key}_ThucTe`] || 0);
          const lech = thucTe - lyThuyet;
          return (
            <div className="inventory-card" key={item.key}>
              <div className="inventory-card-title">
                <span>{item.label}</span>
                <span className="badge">{badge}</span>
              </div>
              <div className="inventory-grid">
                <div className="mini-field">
                  <label>Tồn hệ thống</label>
                  <div className="calc-value">{formatNumber(lyThuyet)}</div>
                </div>
                <div className="mini-field">
                  <label>Số đếm thực tế</label>
                  <input type="number" min="0" step="1" value={thucTe} onChange={(e) => updateField(`${item.key}_ThucTe`, Number(e.target.value || 0))} />
                </div>
                <div className="mini-field">
                  <label>Lệch</label>
                  <div className={`calc-value ${lech < 0 ? "danger" : ""} ${lech > 0 ? "success" : ""}`}>{formatNumber(lech)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function collect(form: FormState, keys: string[]) {
  const payload: Record<string, string | number> = {
    MaKhuVuc: String(form.MaKhuVuc || ""),
    TenKhuVuc: String(form.TenKhuVuc || ""),
    NgayToChuc: String(form.NgayToChuc || ""),
    BuoiToChuc: String(form.BuoiToChuc || ""),
    LoaiKiem: String(form.LoaiKiem || ""),
    EmailNguoiKiem: String(form.EmailNguoiKiem || ""),
    AnhMinhChung_URL: String(form.AnhMinhChung_URL || ""),
    GhiChu: String(form.GhiChu || ""),
  };
  keys.forEach((key) => {
    payload[`${key}_ThucTe`] = Number(form[`${key}_ThucTe`] || 0);
  });
  return payload;
}

function saveDraft(form: FormState, items: CatalogItem[] = [...APP_CONFIG.HANG_DOI, ...APP_CONFIG.HANG_TRUNG_BAY]) {
  const keys = items.map((item) => item.key);
  saveLocal(APP_CONFIG.STORAGE_KEYS.DRAFT_KIEMKHO, collect(form, keys));
  saveLocal(APP_CONFIG.STORAGE_KEYS.WORK_CONTEXT, {
    MaKhuVuc: form.MaKhuVuc,
    TenKhuVuc: form.TenKhuVuc,
    KhuVucSearch: form.KhuVucSearch,
    NgayToChuc: form.NgayToChuc,
    BuoiToChuc: form.BuoiToChuc,
    EmailTNV: form.EmailNguoiKiem,
  });
}

function sourceText(source: TonKhoSource | null) {
  if (source?.type === "KiemKho") {
    const loai = source.loaiKiem === "DauBuoi" ? "đầu buổi" : source.loaiKiem === "CuoiBuoi" ? "cuối buổi" : source.loaiKiem || "";
    return ["Nguồn tồn kho: phiếu kiểm kho", loai, source.maKiemKho, source.ngayToChuc, source.buoiToChuc].filter(Boolean).join(" · ");
  }
  return "Nguồn tồn kho: chưa có phiếu kiểm kho, đang tính theo phiếu kho/giao dịch.";
}

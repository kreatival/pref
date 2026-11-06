"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ClientForm from "@/components/ClientForm";
import { Alert, Button, Card, Field, Input, Modal, PageHeader, Select, Spinner, Textarea, cx } from "@/components/ui";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import { Catalog, Client, ItemType, Measurement, MeasurementStatus, OpeningSide, Paginated, Quotation } from "@/lib/types";

interface LineForm {
  key: string; location: string; label: string; type: ItemType; quantity: number;
  wt: string; wm: string; wb: string; hl: string; hm: string; hr: string; d1: string; d2: string; depth: string;
  opening: OpeningSide; series: string; color: string; shutter: boolean; motor: boolean; mosquitoNet: boolean; notes: string;
}

let k = 0;
const nextKey = () => `m${++k}`;
const blank = (): LineForm => ({
  key: nextKey(), location: "", label: "", type: "TILT_TURN", quantity: 1,
  wt: "", wm: "", wb: "", hl: "", hm: "", hr: "", d1: "", d2: "", depth: "",
  opening: "NONE", series: "", color: "", shutter: false, motor: false, mosquitoNet: false, notes: "",
});

const cmStr = (mm: number | null) => (mm === null ? "" : String(Number((mm / 10).toFixed(1))));
const toMm = (s: string): number | null => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10) : null;
};
const nums = (...s: string[]) => s.map(toMm).filter((x): x is number => x !== null);

function fromDto(m: Measurement): LineForm[] {
  return m.lines.map((l) => ({
    key: nextKey(), location: l.location ?? "", label: l.label ?? "", type: l.type, quantity: l.quantity,
    wt: cmStr(l.widthTopMm), wm: cmStr(l.widthMidMm), wb: cmStr(l.widthBottomMm),
    hl: cmStr(l.heightLeftMm), hm: cmStr(l.heightMidMm), hr: cmStr(l.heightRightMm),
    d1: cmStr(l.diagonal1Mm), d2: cmStr(l.diagonal2Mm), depth: cmStr(l.wallDepthMm),
    opening: l.opening, series: l.series ?? "", color: l.color ?? "",
    shutter: l.shutter, motor: l.motor, mosquitoNet: l.mosquitoNet, notes: l.notes ?? "",
  }));
}

const OPENINGS: { value: OpeningSide; label: string }[] = [
  { value: "NONE", label: "No opening / fixed" },
  { value: "LEFT", label: "Hinged left" },
  { value: "RIGHT", label: "Hinged right" },
  { value: "BOTH", label: "Both leaves open" },
];

function Dim({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-center text-[11px] text-ink-soft">{label}</span>
      <Input type="number" inputMode="decimal" step="0.1" min={0} value={value} onChange={(e) => onChange(e.target.value)} className="px-2 text-center text-base" />
    </label>
  );
}

export default function MeasurementEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const isNew = id === "new";

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newClient, setNewClient] = useState(false);

  const [number, setNumber] = useState<number | null>(null);
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [siteAddress, setSite] = useState("");
  const [clearanceMm, setClearance] = useState(0);
  const [status, setStatus] = useState<MeasurementStatus>("DRAFT");
  const [notes, setNotes] = useState("");
  const [quotation, setQuotation] = useState<Measurement["quotation"]>(null);
  const [lines, setLines] = useState<LineForm[]>(() => [blank()]);

  useEffect(() => {
    api<Catalog>("/catalog").then(setCatalog).catch((e) => setError(errMsg(e)));
    api<Paginated<Client>>("/clients?pageSize=200").then((r) => setClients(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  function apply(m: Measurement) {
    setNumber(m.number);
    setClientId(m.client.id);
    setDate(m.date.slice(0, 10));
    setSite(m.siteAddress ?? "");
    setClearance(m.clearanceMm);
    setStatus(m.status);
    setNotes(m.notes ?? "");
    setQuotation(m.quotation);
    setLines(fromDto(m));
  }

  useEffect(() => {
    if (isNew) return;
    api<Measurement>(`/measurements/${id}`).then(apply).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }, [id, isNew]);

  useEffect(() => {
    if (!clientId || clients.some((c) => c.id === clientId)) return;
    api<Client>(`/clients/${clientId}`).then((c) => setClients((l) => [c, ...l])).catch(() => {});
  }, [clientId, clients]);

  function pickClient(cid: string) {
    setClientId(cid);
    const c = clients.find((x) => x.id === cid);
    if (c && !siteAddress) setSite([c.address, c.city].filter(Boolean).join(", "));
  }

  const patch = (key: string, p: Partial<LineForm>) => setLines((l) => l.map((x) => (x.key === key ? { ...x, ...p } : x)));

  const move = (idx: number, dir: -1 | 1) =>
    setLines((l) => {
      const j = idx + dir;
      if (j < 0 || j >= l.length) return l;
      const c = [...l];
      [c[idx], c[j]] = [c[j], c[idx]];
      return c;
    });

  async function save(): Promise<boolean> {
    setError("");
    setSaved(false);
    if (!clientId) { setError(t("pleaseSelectClient")); return false; }
    const body = {
      clientId, date, status, siteAddress: siteAddress || null, clearanceMm, notes: notes || null,
      lines: lines.map((l) => ({
        location: l.location || null, label: l.label || null, type: l.type, quantity: l.quantity,
        widthTopMm: toMm(l.wt), widthMidMm: toMm(l.wm), widthBottomMm: toMm(l.wb),
        heightLeftMm: toMm(l.hl), heightMidMm: toMm(l.hm), heightRightMm: toMm(l.hr),
        diagonal1Mm: toMm(l.d1), diagonal2Mm: toMm(l.d2), wallDepthMm: toMm(l.depth),
        opening: l.opening, series: l.series || null, color: l.color || null,
        shutter: l.shutter, motor: l.motor, mosquitoNet: l.mosquitoNet, notes: l.notes || null,
      })),
    };
    setBusy(true);
    try {
      if (isNew) {
        const m = await api<Measurement>("/measurements", { method: "POST", body });
        router.replace(`/measurements/${m.id}`);
      } else {
        apply(await api<Measurement>(`/measurements/${id}`, { method: "PUT", body }));
        setSaved(true);
      }
      return true;
    } catch (e) {
      setError(errMsg(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function convert() {
    if (!confirm(t("quoteWillBeEmpty"))) return;
    if (!(await save())) return;
    setBusy(true);
    try {
      const q = await api<Quotation>(`/measurements/${id}/convert`, { method: "POST" });
      router.push(`/quotations/${q.id}`);
    } catch (e) {
      setError(errMsg(e));
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(t("deleteThisMeasurement"))) return;
    try {
      await api(`/measurements/${id}`, { method: "DELETE" });
      router.replace("/measurements");
    } catch (e) {
      setError(errMsg(e));
    }
  }

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader
        title={isNew ? t("newMeasurement") : `Measurement M-${number}`}
        subtitle={isNew ? "Measure each opening at 3 points; the smallest value is used" : fmtDate(date)}
        actions={
          <>
            <Link href="/measurements"><Button variant="secondary">{t("back")}</Button></Link>
            {!isNew && quotation && <Link href={`/quotations/${quotation.id}`}><Button variant="secondary">{t("quotationLabel")} #{quotation.number}</Button></Link>}
            {!isNew && !quotation && <Button variant="secondary" onClick={convert} disabled={busy}>{t("createQuotation")}</Button>}
            <Button onClick={save} disabled={busy}>{busy ? t("savePassword") : t("save")}</Button>
          </>
        }
      />
      {error && <Alert>{error}</Alert>}
      {saved && <Alert tone="success">{t("saved")}</Alert>}

      <Card className="mb-5 p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label={t("clientLabel")} className="md:col-span-2">
            <div className="flex gap-2">
              <Select value={clientId} onChange={(e) => pickClient(e.target.value)}>
                <option value="">{t("selectClient")}</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>)}
              </Select>
              <Button type="button" variant="secondary" onClick={() => setNewClient(true)}>{t("newLabel")}</Button>
            </div>
          </Field>
          <Field label={t("date")}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={t("status")}>
            <Select value={status} onChange={(e) => setStatus(e.target.value as MeasurementStatus)}>
              <option value="DRAFT">{t("inProgress")}</option>
              <option value="COMPLETED">{t("completed")}</option>
            </Select>
          </Field>
          <Field label={t("siteAddress")} className="md:col-span-3"><Input value={siteAddress} onChange={(e) => setSite(e.target.value)} placeholder={t("whereOpeningsAre")} /></Field>
          <Field label={t("clearanceMm")} hint={t("deduction")}>
            <Input type="number" inputMode="numeric" min={0} max={100} value={clearanceMm} onChange={(e) => setClearance(Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))))} />
          </Field>
        </div>
      </Card>

      <div className="space-y-4">
        {lines.map((l, idx) => {
          const w = nums(l.wt, l.wm, l.wb);
          const h = nums(l.hl, l.hm, l.hr);
          const minW = w.length ? Math.min(...w) : null;
          const minH = h.length ? Math.min(...h) : null;
          const spreadW = w.length > 1 ? Math.max(...w) - Math.min(...w) : 0;
          const spreadH = h.length > 1 ? Math.max(...h) - Math.min(...h) : 0;
          const d1 = toMm(l.d1);
          const d2 = toMm(l.d2);
          const skew = d1 !== null && d2 !== null ? Math.abs(d1 - d2) : 0;
          const orderW = minW === null ? null : minW - clearanceMm;
          const orderH = minH === null ? null : minH - clearanceMm;
          const warn: string[] = [];
          if (spreadW > 10) warn.push(`Widths differ by ${(spreadW / 10).toFixed(1)} cm — recheck`);
          if (spreadH > 10) warn.push(`Heights differ by ${(spreadH / 10).toFixed(1)} cm — recheck`);
          if (skew > 5) warn.push(`Diagonals differ by ${(skew / 10).toFixed(1)} cm — opening is out of square`);

          return (
            <Card key={l.key} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-7 min-w-[1.75rem] items-center justify-center rounded bg-brand-500 px-1 text-sm font-semibold text-white">{idx + 1}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label={t("moveUp")}>↑</Button>
                  <Button variant="ghost" size="sm" onClick={() => move(idx, 1)} disabled={idx === lines.length - 1} aria-label={t("moveDown")}>↓</Button>
                  <Button variant="ghost" size="sm" onClick={() => setLines((x) => [...x.slice(0, idx + 1), { ...l, key: nextKey() }, ...x.slice(idx + 1)])}>{t("copy")}</Button>
                  <Button variant="ghost" size="sm" className="text-red-700" disabled={lines.length === 1} onClick={() => setLines((x) => x.filter((y) => y.key !== l.key))}>{t("remove")}</Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <Field label={t("roomLocation")}><Input value={l.location} onChange={(e) => patch(l.key, { location: e.target.value })} placeholder="e.g. Living room" /></Field>
                <Field label={t("label")}><Input value={l.label} onChange={(e) => patch(l.key, { label: e.target.value })} placeholder="e.g. W1, Balcony door" /></Field>
                <Field label={t("type")}>
                  <Select value={l.type} onChange={(e) => patch(l.key, { type: e.target.value as ItemType })}>
                    {catalog?.itemTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                </Field>
                <Field label={t("quantity")}><Input type="number" inputMode="numeric" min={1} value={l.quantity} onChange={(e) => patch(l.key, { quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} /></Field>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-sm font-medium">{t("widthCm")}</div>
                  <div className="grid grid-cols-3 gap-2">
                    <Dim label={t("widthTop")} value={l.wt} onChange={(v) => patch(l.key, { wt: v })} />
                    <Dim label={t("widthMiddle")} value={l.wm} onChange={(v) => patch(l.key, { wm: v })} />
                    <Dim label={t("widthBottom")} value={l.wb} onChange={(v) => patch(l.key, { wb: v })} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium">{t("heightCm")}</div>
                  <div className="grid grid-cols-3 gap-2">
                    <Dim label={t("heightLeft")} value={l.hl} onChange={(v) => patch(l.key, { hl: v })} />
                    <Dim label={t("heightMiddle")} value={l.hm} onChange={(v) => patch(l.key, { hm: v })} />
                    <Dim label={t("heightRight")} value={l.hr} onChange={(v) => patch(l.key, { hr: v })} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-sm font-medium">{t("squarenessCheck")}</div>
                  <div className="grid grid-cols-3 gap-2">
                    <Dim label={t("diagonalA")} value={l.d1} onChange={(v) => patch(l.key, { d1: v })} />
                    <Dim label={t("diagonalB")} value={l.d2} onChange={(v) => patch(l.key, { d2: v })} />
                    <Dim label={t("wallDepth")} value={l.depth} onChange={(v) => patch(l.key, { depth: v })} />
                  </div>
                </div>
                <div className={cx("flex flex-col justify-center rounded-md border px-4 py-3", orderW !== null && orderH !== null ? "border-brand-200 bg-brand-50" : "border-line bg-paper")}>
                  <span className="text-xs text-ink-soft">{t("orderSize").replace("{mm}", String(clearanceMm))}</span>
                  <span className="text-xl font-semibold">
                    {orderW !== null && orderH !== null ? `${(orderW / 10).toFixed(1)} × ${(orderH / 10).toFixed(1)} cm` : t("enterWidthHeight")}
                  </span>
                </div>
              </div>

              {warn.length > 0 && (
                <ul className="mt-3 space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {warn.map((x) => <li key={x}>⚠ {x}</li>)}
                </ul>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <Field label={t("opening")}>
                  <Select value={l.opening} onChange={(e) => patch(l.key, { opening: e.target.value as OpeningSide })}>
                    {OPENINGS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </Field>
                <Field label={t("profileSeries")}>
                  <Select value={l.series} onChange={(e) => patch(l.key, { series: e.target.value })}>
                    <option value="">—</option>
                    {catalog?.series.map((s) => <option key={s.code} value={s.name}>{s.name}</option>)}
                  </Select>
                </Field>
                <Field label={t("colour")}><Input list="m-colors" value={l.color} onChange={(e) => patch(l.key, { color: e.target.value })} /></Field>
                <div className="flex flex-wrap items-end gap-x-4 gap-y-2 pb-2">
                  {([["shutter", t("shutter")], ["motor", t("motor")], ["mosquitoNet", t("screen")]] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" checked={l[key]} onChange={(e) => patch(l.key, { [key]: e.target.checked })} className="h-4 w-4 accent-brand-500" />
                      {label}
                    </label>
                  ))}
                </div>
                <Field label={t("notesPrint")} className="md:col-span-4">
                  <Input value={l.notes} onChange={(e) => patch(l.key, { notes: e.target.value })} />
                </Field>
              </div>
            </Card>
          );
        })}
      </div>
      {catalog && <datalist id="m-colors">{catalog.colors.map((c) => <option key={c} value={c} />)}</datalist>}

      <div className="mt-4">
        <Button variant="secondary" onClick={() => setLines((x) => [...x, blank()])}>{t("addOpening")}</Button>
      </div>

      <div className="mt-6">
        <Field label={t("generalNotesTitle")}><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>

      <div className="mt-6 flex flex-wrap justify-between gap-2">
        {!isNew && user && ["SUPERADMIN", "WORKSHOP_ADMIN", "ADMIN"].includes(user.role) ? <Button variant="danger" onClick={remove}>{t("deleteMeasurement")}</Button> : <span />}
        <div className="flex gap-2">
          {!isNew && !quotation && <Button variant="secondary" onClick={convert} disabled={busy}>{t("createQuotation")}</Button>}
          <Button onClick={save} disabled={busy}>{busy ? t("savePassword") : t("save")}</Button>
        </div>
      </div>

      <Modal open={newClient} title={t("newClient")} onClose={() => setNewClient(false)}>
        <ClientForm
          onCancel={() => setNewClient(false)}
          onSaved={(c) => { setClients((l) => [c, ...l]); setClientId(c.id); setNewClient(false); }}
        />
      </Modal>
    </>
  );
}

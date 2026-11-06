"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ClientForm from "@/components/ClientForm";
import { Alert, Button, Card, Field, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Textarea } from "@/components/ui";
import { api, errMsg } from "@/lib/api";
import { cmToMm, computeTotals, fmtDate, mmToCm, money, round2, STATUS_LABEL, unitArea } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { Catalog, Client, ItemType, Paginated, Quotation, QuotationStatus } from "@/lib/types";

interface ItemForm {
  key: string; title: string; type: ItemType; series: string;
  widthCm: number; heightCm: number; quantity: number; unitPrice: number; leaves: number;
  color: string; glass: string; mechanism: string;
  shutter: boolean; motor: boolean; mosquitoNet: boolean; notes: string;
}

let keyCounter = 0;
const nextKey = () => `k${++keyCounter}`;

const blankItem = (): ItemForm => ({
  key: nextKey(), title: "", type: "TILT_TURN", series: "", widthCm: 0, heightCm: 0, quantity: 1, unitPrice: 0, leaves: 1,
  color: "", glass: "", mechanism: "", shutter: false, motor: false, mosquitoNet: false, notes: "",
});

const today = () => new Date().toISOString().slice(0, 10);
const num = (v: string) => (v === "" ? 0 : Number(v));

function fromDto(q: Quotation): ItemForm[] {
  return q.items.map((i) => ({
    key: nextKey(), title: i.title, type: i.type, series: i.series ?? "",
    widthCm: mmToCm(i.widthMm), heightCm: mmToCm(i.heightMm), quantity: i.quantity, unitPrice: i.unitPrice, leaves: i.leaves,
    color: i.color ?? "", glass: i.glass ?? "", mechanism: i.mechanism ?? "",
    shutter: i.shutter, motor: i.motor, mosquitoNet: i.mosquitoNet, notes: i.notes ?? "",
  }));
}

export default function QuotationEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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
  const [date, setDate] = useState(today());
  const [validUntil, setValidUntil] = useState("");
  const [status, setStatus] = useState<QuotationStatus>("DRAFT");
  const [currency] = useState("EUR");
  const [discountPct, setDiscount] = useState(0);
  const [vatPct, setVat] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemForm[]>(() => [blankItem()]);

  useEffect(() => {
    api<Catalog>("/catalog").then(setCatalog).catch((e) => setError(errMsg(e)));
    api<Paginated<Client>>("/clients?pageSize=200").then((r) => setClients(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  function apply(q: Quotation) {
    setNumber(q.number);
    setClientId(q.client.id);
    setDate(q.date.slice(0, 10));
    setValidUntil(q.validUntil ? q.validUntil.slice(0, 10) : "");
    setStatus(q.status);
    setDiscount(q.discountPct);
    setVat(q.vatPct);
    setNotes(q.notes ?? "");
    setItems(fromDto(q));
  }

  useEffect(() => {
    if (isNew) return;
    api<Quotation>(`/quotations/${id}`)
      .then(apply)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  useEffect(() => {
    if (!clientId || clients.some((c) => c.id === clientId)) return;
    api<Client>(`/clients/${clientId}`).then((c) => setClients((l) => [c, ...l])).catch(() => {});
  }, [clientId, clients]);

  const totals = useMemo(
    () => computeTotals(items.map((i) => ({ widthMm: cmToMm(i.widthCm), heightMm: cmToMm(i.heightCm), quantity: i.quantity, unitPrice: i.unitPrice })), discountPct, vatPct),
    [items, discountPct, vatPct],
  );

  const patch = (key: string, p: Partial<ItemForm>) => setItems((l) => l.map((i) => (i.key === key ? { ...i, ...p } : i)));

  function pickSeries(key: string, name: string) {
    const s = catalog?.series.find((x) => x.name === name);
    setItems((l) =>
      l.map((i) => {
        if (i.key !== key) return i;
        if (!s) return { ...i, series: name };
        return {
          ...i,
          series: name,
          type: s.types.includes(i.type) ? i.type : s.types[0],
          leaves: s.defaultLeaves,
          title: i.title || s.name,
          mechanism: i.mechanism || s.defaultMechanism || "",
          color: i.color || s.defaultColor || "",
          glass: i.glass || catalog?.glass[0] || "",
        };
      }),
    );
  }

  const move = (idx: number, dir: -1 | 1) =>
    setItems((l) => {
      const j = idx + dir;
      if (j < 0 || j >= l.length) return l;
      const c = [...l];
      [c[idx], c[j]] = [c[j], c[idx]];
      return c;
    });

  async function save() {
    setError("");
    setSaved(false);
    if (!clientId) return setError(t("pleaseSelectClient"));
    for (const [n, i] of items.entries()) {
      if (!i.title.trim()) return setError(t("itemRequired").replace("{n}", String(n + 1)));
      if (i.widthCm <= 0 || i.heightCm <= 0) return setError(t("itemDimensionsRequired").replace("{n}", String(n + 1)));
    }
    const body = {
      clientId, date, validUntil: validUntil || null, status, currency, discountPct, vatPct, notes: notes || null,
      items: items.map((i) => ({
        title: i.title.trim(), type: i.type, series: i.series || null,
        widthMm: cmToMm(i.widthCm), heightMm: cmToMm(i.heightCm), quantity: i.quantity,
        unitPrice: i.unitPrice, leaves: i.leaves, color: i.color || null, glass: i.glass || null,
        mechanism: i.mechanism || null, shutter: i.shutter, motor: i.motor, mosquitoNet: i.mosquitoNet, notes: i.notes || null,
      })),
    };
    setBusy(true);
    try {
      if (isNew) {
        const q = await api<Quotation>("/quotations", { method: "POST", body });
        router.replace(`/quotations/${q.id}`);
      } else {
        const q = await api<Quotation>(`/quotations/${id}`, { method: "PUT", body });
        apply(q);
        setSaved(true);
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(t("deleteThisQuotation"))) return;
    try {
      await api(`/quotations/${id}`, { method: "DELETE" });
      router.replace("/quotations");
    } catch (e) {
      setError(errMsg(e));
    }
  }

  async function duplicate() {
    try {
      const q = await api<Quotation>(`/quotations/${id}/duplicate`, { method: "POST" });
      router.push(`/quotations/${q.id}`);
    } catch (e) {
      setError(errMsg(e));
    }
  }

  async function share(channel: "whatsapp" | "email") {
    try {
      const payload = await api<{ whatsappUrl: string | null; emailUrl: string | null }>(`/quotations/${id}/share`);
      const nextUrl = channel === "whatsapp" ? payload.whatsappUrl : payload.emailUrl;
      if (!nextUrl) {
        setError(channel === "whatsapp" ? t("noWhatsAppContact") : t("noEmailContact"));
        return;
      }
      window.open(nextUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(errMsg(e));
    }
  }

  if (loading) return <Spinner />;

  const dl = (name: string, list: string[]) => (
    <datalist id={name}>{list.map((v) => <option key={v} value={v} />)}</datalist>
  );

  return (
    <>
      <PageHeader
        title={isNew ? t("newQuotation") : `Quotation #${number}`}
        subtitle={isNew ? undefined : `${fmtDate(date)} · ${STATUS_LABEL[status]}`}
        actions={
          <>
            <Link href="/quotations"><Button variant="secondary">{t("back")}</Button></Link>
            {!isNew && (
              <>
                <a href={`/api/quotations/${id}/pdf`} target="_blank" rel="noreferrer"><Button variant="secondary">{t("previewPdf")}</Button></a>
                <a href={`/api/quotations/${id}/pdf?download=1`}><Button variant="secondary">{t("downloadPdf")}</Button></a>
                <Button variant="secondary" onClick={() => share("whatsapp")}>{t("sendViaWhatsApp")}</Button>
                <Button variant="secondary" onClick={() => share("email")}>{t("sendViaEmail")}</Button>
                <Button variant="secondary" onClick={duplicate}>{t("duplicate")}</Button>
              </>
            )}
            <Button onClick={save} disabled={busy}>{busy ? t("savePassword") : t("save")}</Button>
          </>
        }
      />
      {error && <Alert>{error}</Alert>}
      {saved && <Alert tone="success">{t("saved")} The PDF now reflects these changes.</Alert>}

      <Card className="mb-5 p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label={t("clientLabel")} className="md:col-span-2">
            <div className="flex gap-2">
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">{t("selectClient")}</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>)}
              </Select>
              <Button type="button" variant="secondary" onClick={() => setNewClient(true)}>{t("newLabel")}</Button>
            </div>
          </Field>
          <Field label={t("date")}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={t("validUntil")}><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></Field>
          <Field label={t("status")}>
            <Select value={status} onChange={(e) => setStatus(e.target.value as QuotationStatus)}>
              {(Object.keys(STATUS_LABEL) as QuotationStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </Select>
          </Field>
          <Field label={`${t("discount")} %`}><Input type="number" min={0} max={100} step="0.01" value={discountPct} onChange={(e) => setDiscount(num(e.target.value))} /></Field>
          <Field label={`${t("vat")} %`}><Input type="number" min={0} max={100} step="0.01" value={vatPct} onChange={(e) => setVat(num(e.target.value))} /></Field>
        </div>
      </Card>

      {catalog && <>{dl("glass-list", catalog.glass)}{dl("mech-list", catalog.mechanisms)}{dl("color-list", catalog.colors)}</>}

      <div className="space-y-4">
        {items.map((it, idx) => {
          const area = unitArea(cmToMm(it.widthCm), cmToMm(it.heightCm));
          return (
            <Card key={it.key} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-brand-500 text-xs font-semibold text-white">{idx + 1}</span>
                  <span className="text-sm text-ink-soft">{area.toFixed(2)} {t("areaEach")} · {round2(area * it.quantity).toFixed(2)} {t("areaTotal")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label={t("moveUp")}>↑</Button>
                  <Button variant="ghost" size="sm" onClick={() => move(idx, 1)} disabled={idx === items.length - 1} aria-label={t("moveDown")}>↓</Button>
                  <Button variant="ghost" size="sm" onClick={() => setItems((l) => [...l.slice(0, idx + 1), { ...it, key: nextKey() }, ...l.slice(idx + 1)])}>{t("copy")}</Button>
                  <Button variant="ghost" size="sm" className="text-red-700" disabled={items.length === 1} onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}>{t("remove")}</Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-6">
                <Field label={t("profileSeries")} className="md:col-span-2">
                  <Select value={it.series} onChange={(e) => pickSeries(it.key, e.target.value)}>
                    <option value="">—</option>
                    {catalog?.series.map((s) => <option key={s.code} value={s.name}>{s.name} — {s.family}</option>)}
                  </Select>
                </Field>
                <Field label={t("itemLabel")} className="md:col-span-2"><Input value={it.title} onChange={(e) => patch(it.key, { title: e.target.value })} placeholder="e.g. DRITARE WC" /></Field>
                <Field label={t("type")}>
                  <Select value={it.type} onChange={(e) => patch(it.key, { type: e.target.value as ItemType })}>
                    {catalog?.itemTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                </Field>
                <Field label={t("quantity")}><Input type="number" min={1} max={6} value={it.leaves} onChange={(e) => patch(it.key, { leaves: Math.min(6, Math.max(1, num(e.target.value) || 1)) })} /></Field>

                <Field label={t("widthCm")}><Input type="number" min={0} step="0.5" value={it.widthCm || ""} onChange={(e) => patch(it.key, { widthCm: num(e.target.value) })} /></Field>
                <Field label={t("heightCm")}><Input type="number" min={0} step="0.5" value={it.heightCm || ""} onChange={(e) => patch(it.key, { heightCm: num(e.target.value) })} /></Field>
                <Field label={t("quantity")}><Input type="number" min={1} value={it.quantity} onChange={(e) => patch(it.key, { quantity: Math.max(1, Math.floor(num(e.target.value) || 1)) })} /></Field>
                <Field label={`${t("unitPrice")} (${currency})`}><Input type="number" min={0} step="0.01" value={it.unitPrice || ""} onChange={(e) => patch(it.key, { unitPrice: num(e.target.value) })} /></Field>
                <Field label="Or price per m²" hint="Fills the unit price">
                  <Input type="number" min={0} step="0.01" placeholder="€/m²" onChange={(e) => patch(it.key, { unitPrice: round2(num(e.target.value) * area) })} />
                </Field>
                <div className="flex flex-col justify-end pb-2 text-right">
                  <span className="text-xs text-ink-soft">{t("lineTotal")}</span>
                  <span className="text-lg font-semibold">{money(round2(it.unitPrice * it.quantity), currency)}</span>
                </div>

                <Field label={t("colour")} className="md:col-span-2"><Input list="color-list" value={it.color} onChange={(e) => patch(it.key, { color: e.target.value })} /></Field>
                <Field label={t("glass")} className="md:col-span-2"><Input list="glass-list" value={it.glass} onChange={(e) => patch(it.key, { glass: e.target.value })} /></Field>
                <Field label={t("hardware")} className="md:col-span-2"><Input list="mech-list" value={it.mechanism} onChange={(e) => patch(it.key, { mechanism: e.target.value })} /></Field>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 md:col-span-6">
                  {([["shutter", t("shutter")], ["motor", t("motor")], ["mosquitoNet", t("screen")]] as const).map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={it[k]} onChange={(e) => patch(it.key, { [k]: e.target.checked })} className="h-4 w-4 accent-brand-500" />
                      {label}
                    </label>
                  ))}
                  <Input className="ml-auto max-w-xs" placeholder={t("printedOnQuote")} value={it.notes} onChange={(e) => patch(it.key, { notes: e.target.value })} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 flex justify-start">
        <Button variant="secondary" onClick={() => setItems((l) => [...l, blankItem()])}>{t("addItem")}</Button>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-[1fr_320px]">
        <Field label={t("notesPrint")}><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <Card className="p-4 text-sm">
          <Row k={`${t("quantity")} · ${t("width")}`} v={`${totals.pieces} · ${totals.area.toFixed(2)} m²`} />
          <Row k={t("subtotal")} v={money(totals.subtotal, currency)} />
          <Row k={`${t("discount")} ${discountPct}%`} v={`− ${money(totals.discount, currency)}`} />
          <Row k={t("afterDiscount")} v={money(totals.net, currency)} />
          <Row k={`${t("vat")} ${vatPct}%`} v={money(totals.vat, currency)} />
          <div className="mt-2 flex justify-between border-t border-line pt-2 text-base font-semibold">
            <span>{t("total")}</span><span>{money(totals.total, currency)}</span>
          </div>
          {!isNew && <div className="mt-3"><StatusBadge status={status} /></div>}
        </Card>
      </div>

      <div className="mt-6 flex justify-between">
        {!isNew ? <Button variant="danger" onClick={remove}>{t("delete")}</Button> : <span />}
        <Button onClick={save} disabled={busy}>{busy ? t("savePassword") : t("save")}</Button>
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

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between py-0.5 text-ink-soft"><span>{k}</span><span className="text-ink">{v}</span></div>;
}

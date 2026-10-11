"use client";
/**
 * Civic → Financial Disclosures: stock trades, CDs, bonds, real estate and other
 * transactions reported by officials at every level of government.
 */
import { useState } from "react";
import { api, useLoad, useMember, Btn, Field, Note, Pill, Tabs, ErrorNote, NeedLevel, C, card, muted, row, input, fmtDate, fmtMoney, openSignIn } from "./kit";
import { tableStyle, headRow, bodyRow, Th, Td } from "../civic/ui";

const TXN_LABEL = { purchase: "Purchase", sale: "Sale", partial_sale: "Partial sale", exchange: "Exchange", acquisition: "Acquisition", disposition: "Disposition", gift: "Gift", other: "Other" };
const ASSET_LABEL = { stock: "Stock", option: "Option", bond: "Bond / Treasury", cd: "CD", mutual_fund: "Mutual fund", etf: "ETF", crypto: "Crypto", real_estate: "Real estate",
  private_business: "Private business", bank_account: "Bank / CD", loan: "Loan", other: "Other" };
const amountText = a => a.text || (a.min && a.max ? `${fmtMoney(a.min)} – ${fmtMoney(a.max)}` : a.min ? `${fmtMoney(a.min)}+` : "—");

function Filters({ meta, f, setF }) {
  return (
    <div style={{ ...row, marginBottom: 12 }}>
      <input value={f.q} onChange={e => setF({ ...f, q: e.target.value })} placeholder="Official, company or ticker…" style={{ ...input, minWidth: 220 }} />
      <select value={f.level} onChange={e => setF({ ...f, level: e.target.value })} style={input}>
        <option value="">All levels</option><option value="federal">Federal</option><option value="state">State</option><option value="county">County</option><option value="city">City</option>
      </select>
      <select value={f.category} onChange={e => setF({ ...f, category: e.target.value })} style={input}>
        <option value="">All offices</option>{meta?.categories?.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <select value={f.assetType} onChange={e => setF({ ...f, assetType: e.target.value })} style={input}>
        <option value="">All assets</option>{meta?.assetTypes?.map(a => <option key={a} value={a}>{ASSET_LABEL[a] || a}</option>)}
      </select>
      <select value={f.minAmount} onChange={e => setF({ ...f, minAmount: e.target.value })} style={input}>
        <option value="">Any amount</option><option value="50000">$50K+</option><option value="250000">$250K+</option><option value="1000000">$1M+</option>
      </select>
      <label style={{ fontSize: 13 }}><input type="checkbox" checked={f.late === "1"} onChange={e => setF({ ...f, late: e.target.checked ? "1" : "" })} /> Reported late only</label>
    </div>
  );
}

function SubmitForm({ meta, member, onDone }) {
  const [b, setB] = useState({ official: { name: "", category: "mayor", office: "", jurisdiction: "", state: "" }, assetName: "", ticker: "", assetType: "stock",
    transactionType: "purchase", transactionDate: "", disclosedDate: "", amountText: "", owner: "Self", sourceType: "local_filing", sourceUrl: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);
  const o = b.official, set = p => setB({ ...b, ...p }), setO = p => setB({ ...b, official: { ...o, ...p } });
  if (!member || member.level < 2) return <NeedLevel need={2} member={member} what="submitting disclosures" />;
  if (done) return <Note>Thanks — your submission is waiting for review by Agora staff, who will check it against the source document before publishing.</Note>;
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await api("/api/disclosures", { method: "POST", body: { action: "submit", ...b } }); setDone(true); onDone?.(); }
    catch (x) { setErr(x); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} style={card}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Submit a disclosed transaction</div>
      <div style={{ ...muted, marginBottom: 10 }}>Use only official filings, such as a state ethics form, a city's Form 700 or an OGE 278-T, and link to the document. Staff verify every submission before it's published.</div>
      <div style={row}>
        <Field label="Official's name"><input required value={o.name} onChange={e => setO({ name: e.target.value })} style={input} /></Field>
        <Field label="Office type"><select value={o.category} onChange={e => setO({ category: e.target.value })} style={input}>{meta?.categories?.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
        <Field label="Title / office"><input value={o.office} onChange={e => setO({ office: e.target.value })} style={input} placeholder="e.g. Mayor of Fresno" /></Field>
        <Field label="Jurisdiction"><input value={o.jurisdiction} onChange={e => setO({ jurisdiction: e.target.value })} style={input} placeholder="e.g. City of Fresno" /></Field>
      </div>
      <div style={row}>
        <Field label="Asset"><input required value={b.assetName} onChange={e => set({ assetName: e.target.value })} style={{ ...input, minWidth: 240 }} placeholder="e.g. Apple Inc. stock / 123 Main St" /></Field>
        <Field label="Ticker"><input value={b.ticker} onChange={e => set({ ticker: e.target.value })} style={{ ...input, width: 90 }} /></Field>
        <Field label="Asset type"><select value={b.assetType} onChange={e => set({ assetType: e.target.value })} style={input}>{meta?.assetTypes?.map(a => <option key={a} value={a}>{ASSET_LABEL[a]}</option>)}</select></Field>
        <Field label="Transaction"><select value={b.transactionType} onChange={e => set({ transactionType: e.target.value })} style={input}>{meta?.transactionTypes?.map(t => <option key={t} value={t}>{TXN_LABEL[t]}</option>)}</select></Field>
      </div>
      <div style={row}>
        <Field label="Transaction date"><input type="date" value={b.transactionDate} onChange={e => set({ transactionDate: e.target.value })} style={input} /></Field>
        <Field label="Date disclosed"><input type="date" value={b.disclosedDate} onChange={e => set({ disclosedDate: e.target.value })} style={input} /></Field>
        <Field label="Amount (as reported)"><input value={b.amountText} onChange={e => set({ amountText: e.target.value })} style={input} placeholder="$15,001 - $50,000" /></Field>
        <Field label="Owner"><select value={b.owner} onChange={e => set({ owner: e.target.value })} style={input}>{["Self", "Spouse", "Joint", "Dependent child"].map(x => <option key={x}>{x}</option>)}</select></Field>
      </div>
      <Field label="Link to the official source document"><input type="url" required value={b.sourceUrl} onChange={e => set({ sourceUrl: e.target.value })} style={{ ...input, width: "100%" }} placeholder="https://" /></Field>
      <div style={row}><Btn type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit for review"}</Btn></div>
      <ErrorNote error={err} />
    </form>
  );
}

export function Disclosures() {
  const { member } = useMember();
  const [view, setView] = useState("trades");
  const [f, setF] = useState({ q: "", level: "", category: "", assetType: "", minAmount: "", late: "" });
  const [applied, setApplied] = useState(f);
  const meta = useLoad(() => api("/api/disclosures?view=meta"), []).data;
  const summary = useLoad(() => api("/api/disclosures?view=summary"), []).data;
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(applied).filter(([, v]) => v))).toString();
  const trades = useLoad(() => view === "trades" ? api(`/api/disclosures?view=transactions&${qs}`) : Promise.resolve(null), [qs, view]);
  const filings = useLoad(() => view === "filings" ? api("/api/disclosures?view=filings") : Promise.resolve(null), [view]);

  return (
    <div>
      <Note>Trades and other financial transactions reported by officials at every level of government: the President and cabinet, judges and justices, members of Congress, generals and admirals, governors, legislators, mayors, and local officials.
        Every entry links to the official filing. Federal officials must report covered trades within 45 days (STOCK Act); entries past that deadline are flagged <Pill tone="red">Late</Pill>.
        A report is a disclosure, not evidence of wrongdoing.</Note>
      {summary && (
        <div style={{ ...row, marginBottom: 12 }}>
          {[["Transactions", summary.transactions], ["Officials", summary.officials], ["Reported late", summary.late], ["House reports indexed", summary.filings?.total]].map(([l, v]) => (
            <div key={l} style={{ ...card, marginBottom: 0, padding: "8px 14px", minWidth: 120 }}><div style={{ fontSize: 20, fontWeight: 800 }}>{(v ?? 0).toLocaleString()}</div><div style={muted}>{l}</div></div>
          ))}
          {summary.lastSync && <span style={muted}>House data refreshed {fmtDate(summary.lastSync)}</span>}
        </div>
      )}
      <Tabs value={view} onChange={setView} tabs={[{ id: "trades", label: "Transactions" }, { id: "top", label: "Most active (90 days)" }, { id: "filings", label: "House filings" }, { id: "sources", label: "Where disclosures are filed" }, { id: "submit", label: "Submit a disclosure" }]} />

      {view === "trades" && <>
        <Filters meta={meta} f={f} setF={setF} />
        <div style={{ ...row, marginTop: -4, marginBottom: 12 }}><Btn small onClick={() => setApplied(f)}>Apply filters</Btn></div>
        <ErrorNote error={trades.error} />
        {trades.data && (trades.data.transactions.length === 0
          ? <div style={{ ...card, color: C.textDim }}>No transactions match.</div>
          : <div style={{ overflowX: "auto" }}><table style={tableStyle}>
              <thead><tr style={headRow}><Th>Date</Th><Th>Official</Th><Th>Asset</Th><Th>Transaction</Th><Th>Amount</Th><Th>Disclosed</Th><Th>Source</Th></tr></thead>
              <tbody>{trades.data.transactions.map(t => (
                <tr key={t.id} style={bodyRow}>
                  <Td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{fmtDate(t.transactionDate)}</Td>
                  <Td style={{ fontSize: 13 }}><strong>{t.official.name}</strong><div style={muted}>{t.official.office || t.official.categoryLabel}{t.official.jurisdiction && t.official.jurisdiction !== "United States" ? ` · ${t.official.jurisdiction}` : ""}</div></Td>
                  <Td style={{ fontSize: 13, maxWidth: 260 }}>{t.asset}{t.ticker && <strong> ({t.ticker})</strong>}<div style={muted}>{ASSET_LABEL[t.assetType] || t.assetType}{t.owner && t.owner !== "Self" ? ` · ${t.owner}` : ""}</div></Td>
                  <Td><Pill tone={t.transactionType === "purchase" || t.transactionType === "acquisition" ? "green" : t.transactionType.includes("sale") ? "red" : "gray"}>{TXN_LABEL[t.transactionType] || t.transactionType}</Pill></Td>
                  <Td style={{ fontSize: 12, whiteSpace: "nowrap" }}>{amountText(t.amount)}</Td>
                  <Td style={{ fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(t.disclosedDate)}{t.late && <div><Pill tone="red" title={`${t.daysToDisclose} days after the transaction`}>Late · {t.daysToDisclose}d</Pill></div>}</Td>
                  <Td style={{ fontSize: 12 }}><a href={t.sourceUrl} target="_blank" rel="noreferrer" style={{ color: C.link }}>Filing →</a>{t.autoExtracted && <div style={muted} title="Read automatically from the PDF — check the filing">auto-read</div>}</Td>
                </tr>))}</tbody></table></div>)}
      </>}

      {view === "top" && summary && (
        summary.topTraders.length === 0 ? <div style={{ ...card, color: C.textDim }}>No transactions in the last 90 days yet.</div> :
        <div style={{ overflowX: "auto" }}><table style={tableStyle}>
          <thead><tr style={headRow}><Th>Official</Th><Th>Office</Th><Th>Transactions (90 days)</Th><Th>Max reported value</Th></tr></thead>
          <tbody>{summary.topTraders.map(o => <tr key={o.id} style={bodyRow}><Td><strong>{o.name}</strong></Td><Td style={{ fontSize: 12 }}>{o.office || o.categoryLabel}</Td><Td>{o.trades}</Td><Td>{fmtMoney(o.max_value)}</Td></tr>)}</tbody>
        </table></div>
      )}

      {view === "filings" && (
        <>
          <Note>Every Periodic Transaction Report filed with the House Clerk this year, refreshed daily. Electronically filed reports are read automatically; paper filings are scanned images, so open the PDF.</Note>
          {filings.data && <div style={{ overflowX: "auto" }}><table style={tableStyle}>
            <thead><tr style={headRow}><Th>Filed</Th><Th>Member</Th><Th>District</Th><Th>Transactions</Th><Th>Report</Th></tr></thead>
            <tbody>{filings.data.filings.map(fl => <tr key={fl.id} style={bodyRow}>
              <Td style={{ fontSize: 12 }}>{fmtDate(fl.filing_date)}</Td><Td>{fl.filer_name}</Td><Td>{fl.state_district}</Td>
              <Td style={{ fontSize: 12 }}>{fl.parse_status === "parsed" ? fl.txn_count : fl.parse_status === "scanned" ? "Paper filing" : fl.parse_status === "pending" ? "Queued" : "See PDF"}</Td>
              <Td><a href={fl.document_url} target="_blank" rel="noreferrer" style={{ color: C.link, fontSize: 12 }}>PDF →</a></Td>
            </tr>)}</tbody></table></div>}
        </>
      )}

      {view === "sources" && meta && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
          {meta.directory.map(d => (
            <div key={d.who} style={{ ...card, marginBottom: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{d.who}</div>
              <div style={{ fontSize: 13, margin: "4px 0" }}>{d.url ? <a href={d.url} target="_blank" rel="noreferrer" style={{ color: C.link }}>{d.where} →</a> : d.where}</div>
              <div style={muted}>{d.note}</div>
            </div>
          ))}
        </div>
      )}

      {view === "submit" && <SubmitForm meta={meta} member={member} />}
    </div>
  );
}

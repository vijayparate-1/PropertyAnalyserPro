import { useState, useMemo } from "react";

const C = {
  bg: "#070d1a", surface: "#0d1829", card: "#111e33",
  border: "#1a2d4a", green: "#00c896", greenFg: "#00ffbc",
  gold: "#f5a623", red: "#ff4d6a", yellow: "#ffd666",
  text: "#e8eef8", muted: "#6b8aaa", mutedHi: "#8aa5c2",
  navy: "#0a1628", accent: "#2563eb",
};

const S = {
  card: (extra = {}) => ({ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px 22px", ...extra }),
  label: { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 5 },
  input: { width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", color: C.text, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: "none" },
  sectionTitle: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: C.muted, marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}` },
  th: { padding: "10px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: C.muted, background: C.surface, textAlign: "right", whiteSpace: "nowrap" },
  td: { padding: "9px 14px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", textAlign: "right", borderBottom: `1px solid #1a2d4a18` },
};

const fmt = {
  currency: v => (v === null || isNaN(v)) ? "—" : (v < 0 ? "-$" : "$") + Math.round(Math.abs(v)).toLocaleString("en-AU"),
  pct: (v, dp = 2) => (v === null || isNaN(v)) ? "—" : v.toFixed(dp) + "%",
};

const CARD_COLORS = [C.green, C.accent, C.gold, C.yellow, C.red, "#a855f7", "#ec4899", "#14b8a6"];

function calcMonthlyRepayment(principal, annualRate, termYears) {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

function calcLoanBalance(principal, annualRate, termYears, yearsElapsed) {
  if (principal <= 0 || yearsElapsed <= 0) return principal;
  const r = annualRate / 12;
  const n = termYears * 12;
  const p = Math.min(yearsElapsed * 12, n);
  if (r === 0) return principal * (1 - p / n);
  const pmt = calcMonthlyRepayment(principal, annualRate, termYears);
  return Math.max(0, principal * Math.pow(1 + r, p) - pmt * (Math.pow(1 + r, p) - 1) / r);
}

function estimateLMI(value, loan) {
  const lvr = loan / value * 100;
  if (lvr <= 80) return 0;
  if (lvr <= 85) return loan * 0.0066;
  if (lvr <= 90) return loan * 0.0132;
  if (lvr <= 95) return loan * 0.0248;
  return loan * 0.0350;
}

const EMPTY_PROPERTY = {
  nickname: "", state: "NSW", value: 0, loan: 0,
  weeklyRent: 0, rate: 6.0, term: 30, growth: 4, expenses: 25,
};

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"];

function KPICard({ label, value, sub, color, wide }) {
  return (
    <div style={{ ...S.card(), borderLeft: `3px solid ${color || C.green}`, gridColumn: wide ? "span 2" : undefined }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: wide ? 26 : 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: color || C.green }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.mutedHi, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function MiniInput({ label, value, onChange, prefix, suffix }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{label}</div>
      <div style={{ position: "relative" }}>
        {prefix && <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace", pointerEvents: "none" }}>{prefix}</span>}
        <input type="number" value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          style={{ ...S.input, paddingLeft: prefix ? 18 : 10, paddingRight: suffix ? 32 : 10, fontSize: 12 }} />
        {suffix && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: C.muted, pointerEvents: "none" }}>{suffix}</span>}
      </div>
    </div>
  );
}

export default function PortfolioView() {
  const [properties, setProperties] = useState([
    { nickname: "Sydney Unit",     state: "NSW", value: 750000, loan: 600000, weeklyRent: 650, rate: 6.0, term: 30, growth: 4,   expenses: 25 },
    { nickname: "Melbourne House", state: "VIC", value: 850000, loan: 680000, weeklyRent: 720, rate: 6.0, term: 30, growth: 3.5, expenses: 25 },
  ]);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [projectionYear, setProjectionYear] = useState(10);

  const addProperty  = () => setProperties(p => [...p, { ...EMPTY_PROPERTY, nickname: `Property ${p.length + 1}` }]);
  const removeProperty = idx => { setProperties(p => p.filter((_, i) => i !== idx)); if (expandedIdx === idx) setExpandedIdx(null); };
  const updateProperty = (idx, key, val) => setProperties(p => p.map((prop, i) => i === idx ? { ...prop, [key]: val } : prop));

  // ── Per-property calculations ──
  const computed = useMemo(() => properties.map(p => {
    const monthly     = calcMonthlyRepayment(p.loan, p.rate / 100, p.term);
    const annualRent  = p.weeklyRent * 52;
    const expenses    = annualRent * p.expenses / 100;
    const netRent     = annualRent - expenses;
    const cashFlow    = netRent - monthly * 12;
    const grossYield  = p.value > 0 ? annualRent / p.value * 100 : 0;
    const netYield    = p.value > 0 ? netRent / p.value * 100 : 0;
    const lvr         = p.value > 0 ? p.loan / p.value * 100 : 0;
    const equity      = p.value - p.loan;
    const lmi         = estimateLMI(p.value, p.loan);
    const valN        = p.value * Math.pow(1 + p.growth / 100, projectionYear);
    const loanN       = calcLoanBalance(p.loan, p.rate / 100, p.term, projectionYear);
    const equityN     = valN - loanN;
    const totalInterest = monthly * p.term * 12 - p.loan;
    const dscr        = monthly * 12 > 0 ? netRent / (monthly * 12) : 0;
    // Yield rating
    const yieldRating = grossYield >= 7 ? { label: "Excellent", color: C.green }
      : grossYield >= 5.5 ? { label: "Good", color: "#84cc16" }
      : grossYield >= 4   ? { label: "Average", color: C.yellow }
      : { label: "Below Avg", color: C.red };
    return { monthly, annualRent, expenses, netRent, cashFlow, grossYield, netYield, lvr, equity, lmi, valN, loanN, equityN, totalInterest, dscr, yieldRating };
  }), [properties, projectionYear]);

  // ── Portfolio totals ──
  const totals = useMemo(() => ({
    value:    computed.reduce((s, p) => s + properties[computed.indexOf(p)]?.value || 0, 0) || properties.reduce((s, p) => s + p.value, 0),
    loan:     properties.reduce((s, p) => s + p.loan, 0),
    equity:   computed.reduce((s, c) => s + c.equity, 0),
    cashFlow: computed.reduce((s, c) => s + c.cashFlow, 0),
    annRent:  computed.reduce((s, c) => s + c.annualRent, 0),
    equityN:  computed.reduce((s, c) => s + c.equityN, 0),
    valN:     computed.reduce((s, c) => s + c.valN, 0),
    lmi:      computed.reduce((s, c) => s + c.lmi, 0),
  }), [computed, properties]);

  const portfolioLVR    = totals.value > 0 ? totals.loan / totals.value * 100 : 0;
  const portfolioYield  = totals.value > 0 ? totals.annRent / totals.value * 100 : 0;
  const cashFlowColor   = totals.cashFlow >= 0 ? C.green : C.red;

  return (
    <div className="tab-content" style={{ fontFamily: "'Sora', sans-serif", color: C.text }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Property Portfolio</h2>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
            {properties.length} {properties.length === 1 ? "property" : "properties"} · Combined analysis · {projectionYear}-year projection
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, color: C.muted }}>Projection year:</div>
          {[5, 10, 15, 20].map(y => (
            <button key={y} onClick={() => setProjectionYear(y)} style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: projectionYear === y ? `${C.green}20` : C.surface,
              border: `1px solid ${projectionYear === y ? C.green : C.border}`,
              color: projectionYear === y ? C.green : C.muted,
              fontFamily: "'Sora', sans-serif",
            }}>{y}yr</button>
          ))}
        </div>
      </div>

      {/* ── Portfolio KPI strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <KPICard label="Total Portfolio Value"    value={fmt.currency(totals.value)}    color={C.gold}  sub={`${properties.length} properties`} />
        <KPICard label="Total Equity"             value={fmt.currency(totals.equity)}   color={C.green} sub={fmt.pct(totals.equity / totals.value * 100) + " of portfolio"} />
        <KPICard label="Annual Cash Flow"         value={fmt.currency(totals.cashFlow)} color={cashFlowColor} sub={totals.cashFlow < 0 ? "Negatively geared" : "Positively geared"} />
        <KPICard label={`Equity in Year ${projectionYear}`} value={fmt.currency(totals.equityN)} color={C.gold} sub={fmt.currency(totals.valN) + " total value"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <KPICard label="Portfolio LVR"       value={fmt.pct(portfolioLVR)}    color={portfolioLVR <= 80 ? C.green : C.red} sub={portfolioLVR > 80 ? "Above 80% — LMI may apply" : "Below 80% threshold"} />
        <KPICard label="Portfolio Gross Yield" value={fmt.pct(portfolioYield)} color={portfolioYield >= 5 ? C.green : C.yellow} sub="Blended gross yield" />
        <KPICard label="Total Debt"          value={fmt.currency(totals.loan)} color={C.muted} sub="Combined loan balances" />
        <KPICard label="Annual Gross Rent"   value={fmt.currency(totals.annRent)} color={C.accent} sub="Combined rental income" />
      </div>

      {/* ── Cash flow bar visual ── */}
      {properties.length > 1 && (
        <div style={{ ...S.card({ marginBottom: 24 }) }}>
          <div style={S.sectionTitle}>Cash Flow by Property</div>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
            {computed.map((c, i) => {
              const maxAbs = Math.max(...computed.map(x => Math.abs(x.cashFlow)), 1);
              const h = Math.max(8, Math.abs(c.cashFlow) / maxAbs * 80);
              const col = c.cashFlow >= 0 ? C.green : C.red;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: col, fontWeight: 700 }}>{fmt.currency(c.cashFlow)}/yr</div>
                  <div style={{ width: "100%", height: h, background: col, borderRadius: "4px 4px 0 0", opacity: 0.85 }} />
                  <div style={{ fontSize: 10, color: C.muted, textAlign: "center", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {properties[i].nickname || `P${i + 1}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Property cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginBottom: 24 }}>
        {properties.map((p, idx) => {
          const c       = computed[idx];
          const color   = CARD_COLORS[idx % CARD_COLORS.length];
          const isOpen  = expandedIdx === idx;
          return (
            <div key={idx} style={{ ...S.card({ borderTop: `3px solid ${color}`, padding: 0 }) }}>
              {/* Card header */}
              <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <input value={p.nickname}
                    onChange={e => updateProperty(idx, "nickname", e.target.value)}
                    placeholder={`Property ${idx + 1}`}
                    style={{ ...S.input, flex: 1, fontSize: 14, fontWeight: 700, fontFamily: "'Sora', sans-serif", background: "transparent", border: "none", padding: 0, color: C.text }} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setExpandedIdx(isOpen ? null : idx)} style={{
                      background: isOpen ? `${color}20` : C.surface, border: `1px solid ${isOpen ? color : C.border}`,
                      color: isOpen ? color : C.muted, fontSize: 11, fontWeight: 600, padding: "4px 10px",
                      borderRadius: 5, cursor: "pointer", fontFamily: "'Sora', sans-serif",
                    }}>{isOpen ? "▲ Less" : "▼ Edit"}</button>
                    {properties.length > 1 && (
                      <button onClick={() => removeProperty(idx)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 13, padding: "4px 8px", borderRadius: 5, cursor: "pointer" }}>✕</button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{p.state} · {fmt.currency(p.value)} · LVR {fmt.pct(c.lvr)}</div>
              </div>

              {/* Key stats */}
              <div style={{ padding: "14px 18px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
                  {[
                    ["Equity",      fmt.currency(c.equity),    C.gold],
                    ["Cash Flow",   fmt.currency(c.cashFlow) + "/yr", c.cashFlow >= 0 ? C.green : C.red],
                    ["Gross Yield", fmt.pct(c.grossYield),     c.yieldRating.color],
                    ["Net Yield",   fmt.pct(c.netYield),       c.netYield >= 4 ? C.green : C.yellow],
                    ["LVR",         fmt.pct(c.lvr),            c.lvr <= 80 ? C.green : C.red],
                    ["DSCR",        c.dscr.toFixed(2) + "×",  c.dscr >= 1.25 ? C.green : c.dscr >= 1 ? C.yellow : C.red],
                  ].map(([k, v, col]) => (
                    <div key={k} style={{ background: C.surface, padding: "8px 10px", borderRadius: 7 }}>
                      <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{k}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: col }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Yield rating badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, background: `${c.yieldRating.color}20`, color: c.yieldRating.color, padding: "3px 10px", borderRadius: 4, fontWeight: 700, letterSpacing: "0.06em" }}>
                    {c.yieldRating.label} Yield
                  </span>
                  <span style={{ fontSize: 11, color: C.muted }}>
                    Yr {projectionYear} equity: <strong style={{ color: C.gold }}>{fmt.currency(c.equityN)}</strong>
                  </span>
                </div>
              </div>

              {/* Expanded edit panel */}
              {isOpen && (
                <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: color, textTransform: "uppercase", letterSpacing: "0.1em", margin: "14px 0 12px" }}>Edit Property Details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={S.label}>State</div>
                      <select value={p.state} onChange={e => updateProperty(idx, "state", e.target.value)}
                        style={{ ...S.input, appearance: "none", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}>
                        {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <MiniInput label="Property Value"  value={p.value}      onChange={v => updateProperty(idx, "value", v)}      prefix="$" />
                    <MiniInput label="Loan Amount"     value={p.loan}       onChange={v => updateProperty(idx, "loan", v)}       prefix="$" />
                    <MiniInput label="Weekly Rent"     value={p.weeklyRent} onChange={v => updateProperty(idx, "weeklyRent", v)} prefix="$" />
                    <MiniInput label="Interest Rate"   value={p.rate}       onChange={v => updateProperty(idx, "rate", v)}       suffix="%" />
                    <MiniInput label="Loan Term"       value={p.term}       onChange={v => updateProperty(idx, "term", v)}       suffix="yrs" />
                    <MiniInput label="Capital Growth"  value={p.growth}     onChange={v => updateProperty(idx, "growth", v)}     suffix="% p.a." />
                    <MiniInput label="Expenses % Rent" value={p.expenses}   onChange={v => updateProperty(idx, "expenses", v)}   suffix="%" />
                  </div>

                  {/* Detailed breakdown */}
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Full Breakdown</div>
                    {[
                      ["Gross Annual Rent",       fmt.currency(c.annualRent),     C.green],
                      ["Property Expenses",       "-" + fmt.currency(c.expenses), C.red],
                      ["Net Annual Rent",         fmt.currency(c.netRent),        C.green],
                      ["Annual Mortgage (P&I)",   "-" + fmt.currency(c.monthly * 12), C.red],
                      ["Net Annual Cash Flow",    fmt.currency(c.cashFlow),       c.cashFlow >= 0 ? C.green : C.red],
                      ["Monthly Repayment",       fmt.currency(c.monthly) + "/mo", C.muted],
                      ["Total Interest (life)",   fmt.currency(c.totalInterest),  C.muted],
                      [c.lmi > 0 ? "LMI Estimate" : "LMI", c.lmi > 0 ? fmt.currency(c.lmi) : "Not required ✓", c.lmi > 0 ? C.red : C.green],
                    ].map(([k, v, col]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}18` }}>
                        <span style={{ fontSize: 11, color: C.muted }}>{k}</span>
                        <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: col }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add property */}
        <div onClick={addProperty} style={{
          ...S.card({ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 220, background: C.surface, borderStyle: "dashed" }),
          opacity: 0.65, transition: "opacity 0.2s",
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0.65}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10, color: C.green }}>＋</div>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Add Property</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Track another investment</div>
          </div>
        </div>
      </div>

      {/* ── Portfolio summary table ── */}
      <div style={S.card({ padding: 0, marginBottom: 20 })}>
        <div style={{ ...S.sectionTitle, padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}` }}>
          Portfolio Summary Table
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Property", "State", "Value", "Loan", "Equity", "LVR", "Gross Yield", "Net Yield", "Cash Flow/yr", `Equity Yr ${projectionYear}`].map(h => (
                  <th key={h} style={{ ...S.th, textAlign: h === "Property" || h === "State" ? "left" : "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {properties.map((p, idx) => {
                const c = computed[idx];
                return (
                  <tr key={idx} style={{ borderBottom: `1px solid ${C.border}18`, background: idx % 2 === 0 ? "transparent" : `${C.surface}40` }}>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: C.text, fontWeight: 600, textAlign: "left" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: CARD_COLORS[idx % CARD_COLORS.length], flexShrink: 0 }} />
                        {p.nickname || `Property ${idx + 1}`}
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: C.muted, textAlign: "left" }}>{p.state}</td>
                    <td style={S.td}>{fmt.currency(p.value)}</td>
                    <td style={{ ...S.td, color: C.muted }}>{fmt.currency(p.loan)}</td>
                    <td style={{ ...S.td, color: C.gold }}>{fmt.currency(c.equity)}</td>
                    <td style={{ ...S.td, color: c.lvr <= 80 ? C.green : C.red }}>{fmt.pct(c.lvr)}</td>
                    <td style={{ ...S.td, color: c.grossYield >= 5 ? C.green : C.yellow }}>{fmt.pct(c.grossYield)}</td>
                    <td style={{ ...S.td, color: c.netYield >= 4 ? C.green : C.yellow }}>{fmt.pct(c.netYield)}</td>
                    <td style={{ ...S.td, color: c.cashFlow >= 0 ? C.green : C.red, fontWeight: 600 }}>{fmt.currency(c.cashFlow)}</td>
                    <td style={{ ...S.td, color: C.gold, fontWeight: 600 }}>{fmt.currency(c.equityN)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${C.border}`, background: `${C.surface}80` }}>
                <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: C.text, textAlign: "left" }}>TOTAL / BLENDED</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: C.muted, textAlign: "left" }}>{properties.length} props</td>
                <td style={{ ...S.td, fontWeight: 700, color: C.text }}>{fmt.currency(totals.value)}</td>
                <td style={{ ...S.td, fontWeight: 700, color: C.muted }}>{fmt.currency(totals.loan)}</td>
                <td style={{ ...S.td, fontWeight: 700, color: C.gold }}>{fmt.currency(totals.equity)}</td>
                <td style={{ ...S.td, fontWeight: 700, color: portfolioLVR <= 80 ? C.green : C.red }}>{fmt.pct(portfolioLVR)}</td>
                <td style={{ ...S.td, fontWeight: 700, color: C.yellow }}>{fmt.pct(portfolioYield)}</td>
                <td style={{ ...S.td, color: C.muted }}>—</td>
                <td style={{ ...S.td, fontWeight: 700, color: cashFlowColor }}>{fmt.currency(totals.cashFlow)}</td>
                <td style={{ ...S.td, fontWeight: 700, color: C.gold }}>{fmt.currency(totals.equityN)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Equity growth projection ── */}
      <div style={S.card()}>
        <div style={S.sectionTitle}>Portfolio Equity Growth — All Properties</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 100, marginBottom: 10 }}>
          {[1, 2, 3, 4, 5, 7, 10, 15, 20].filter(y => y <= 30).map(yr => {
            const totalEq = computed.reduce((sum, c, i) => {
              const val = properties[i].value * Math.pow(1 + properties[i].growth / 100, yr);
              const bal = calcLoanBalance(properties[i].loan, properties[i].rate / 100, properties[i].term, yr);
              return sum + Math.max(0, val - bal);
            }, 0);
            const maxEq = computed.reduce((sum, c, i) => {
              const val = properties[i].value * Math.pow(1 + properties[i].growth / 100, 20);
              const bal = calcLoanBalance(properties[i].loan, properties[i].rate / 100, properties[i].term, 20);
              return sum + Math.max(0, val - bal);
            }, 0);
            const h = maxEq > 0 ? Math.max(8, (totalEq / maxEq) * 88) : 8;
            return (
              <div key={yr} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 9, color: C.gold, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>
                  {totalEq >= 1e6 ? "$" + (totalEq / 1e6).toFixed(1) + "M" : "$" + Math.round(totalEq / 1000) + "k"}
                </div>
                <div style={{ width: "100%", height: h, background: `linear-gradient(180deg, ${C.gold}, ${C.green})`, borderRadius: "4px 4px 0 0", opacity: 0.85 }} />
                <span style={{ fontSize: 9, color: C.muted }}>Yr {yr}</span>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
          Combined portfolio equity across all {properties.length} {properties.length === 1 ? "property" : "properties"}, assuming individual growth rates.
        </div>
      </div>
    </div>
  );
}

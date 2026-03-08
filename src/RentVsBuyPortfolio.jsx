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

function InputField({ label, value, onChange, prefix, suffix, note, step }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={S.label}>{label}</div>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {prefix && <span style={{ position: "absolute", left: 10, fontSize: 12, color: C.muted, pointerEvents: "none", fontFamily: "'JetBrains Mono', monospace" }}>{prefix}</span>}
        <input type="number" value={value} step={step || 1}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ ...S.input, paddingLeft: prefix ? 22 : 12, paddingRight: suffix ? 36 : 12, borderColor: focused ? C.green : C.border }} />
        {suffix && <span style={{ position: "absolute", right: 10, fontSize: 11, color: C.muted, pointerEvents: "none" }}>{suffix}</span>}
      </div>
      {note && <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{note}</div>}
    </div>
  );
}

function KPICard({ label, value, sub, color }) {
  return (
    <div style={{ ...S.card(), borderLeft: `3px solid ${color || C.green}` }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: color || C.green }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.mutedHi, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SectionDivider({ title, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "28px 0 18px" }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

const EMPTY_PROPERTY = { nickname: "", value: 0, loan: 0, weeklyRent: 0, rate: 6.0, term: 30, growth: 4, expenses: 25, state: "NSW" };

export default function RentVsBuyAndPortfolio() {
  // Rent vs Buy
  const [propPrice, setPropPrice]           = useState(750000);
  const [deposit, setDeposit]               = useState(150000);
  const [buyRate, setBuyRate]               = useState(6.0);
  const [buyTerm, setBuyTerm]               = useState(30);
  const [propGrowth, setPropGrowth]         = useState(4);
  const [propExpPct, setPropExpPct]         = useState(1.2);
  const [stampDuty, setStampDuty]           = useState(30000);
  const [weeklyRentPaid, setWeeklyRentPaid] = useState(650);
  const [rentGrowth, setRentGrowth]         = useState(3);
  const [investReturn, setInvestReturn]     = useState(7);
  const [yearsCompare, setYearsCompare]     = useState(10);

  // Portfolio
  const [properties, setProperties] = useState([
    { nickname: "Sydney Unit",    value: 750000, loan: 600000, weeklyRent: 650, rate: 6.0, term: 30, growth: 4, expenses: 25 },
    { nickname: "Melbourne House",value: 850000, loan: 680000, weeklyRent: 720, rate: 6.0, term: 30, growth: 3.5, expenses: 25 },
  ]);

  const addProperty = () => setProperties(p => [...p, { ...EMPTY_PROPERTY, nickname: `Property ${p.length + 1}` }]);
  const removeProperty = idx => setProperties(p => p.filter((_, i) => i !== idx));
  const updateProperty = (idx, key, val) => setProperties(p => p.map((prop, i) => i === idx ? { ...prop, [key]: val } : prop));

  // ── Rent vs Buy calculation ──
  const rvb = useMemo(() => {
    const loanAmt      = propPrice - deposit;
    const monthly      = calcMonthlyRepayment(loanAmt, buyRate / 100, buyTerm);
    const propExpAnnual = propPrice * propExpPct / 100;

    const buyRows = Array.from({ length: yearsCompare }, (_, i) => {
      const yr       = i + 1;
      const propVal  = propPrice * Math.pow(1 + propGrowth / 100, yr);
      const loanBal  = calcLoanBalance(loanAmt, buyRate / 100, buyTerm, yr);
      const equity   = propVal - loanBal;
      const cumMort  = monthly * 12 * yr;
      const cumExp   = propExpAnnual * yr * Math.pow(1 + propGrowth / 100 / 2, yr); // expenses grow
      const totalOut = cumMort + cumExp + stampDuty + deposit;
      const netWealth = equity - (cumMort + cumExp + stampDuty); // vs just having deposit
      return { yr, propVal, loanBal, equity, cumMort, netWealth };
    });

    const rentRows = Array.from({ length: yearsCompare }, (_, i) => {
      const yr        = i + 1;
      const annRent   = weeklyRentPaid * 52 * Math.pow(1 + rentGrowth / 100, yr - 1);
      const cumRent   = Array.from({ length: yr }, (_, j) => weeklyRentPaid * 52 * Math.pow(1 + rentGrowth / 100, j)).reduce((a, b) => a + b, 0);
      // Invested deposit + mortgage difference grows at investReturn
      const mortDiff  = monthly * 12 - annRent; // extra cash if renting is cheaper
      const investedCapital = deposit + stampDuty;
      const portfolioVal = investedCapital * Math.pow(1 + investReturn / 100, yr) +
        Array.from({ length: yr }, (_, j) => Math.max(0, mortDiff) * Math.pow(1 + investReturn / 100, yr - j - 1)).reduce((a, b) => a + b, 0);
      const netWealth = portfolioVal - cumRent;
      return { yr, cumRent, portfolioVal, netWealth, annRent };
    });

    const crossover = buyRows.findIndex((b, i) => b.netWealth > (rentRows[i]?.netWealth || 0));
    return { buyRows, rentRows, loanAmt, monthly, crossover };
  }, [propPrice, deposit, buyRate, buyTerm, propGrowth, propExpPct, stampDuty, weeklyRentPaid, rentGrowth, investReturn, yearsCompare]);

  // ── Portfolio calculations ──
  const portfolio = useMemo(() => {
    return properties.map(p => {
      const monthly    = calcMonthlyRepayment(p.loan, p.rate / 100, p.term);
      const annualRent = p.weeklyRent * 52;
      const expenses   = annualRent * p.expenses / 100;
      const netRent    = annualRent - expenses;
      const cashFlow   = netRent - monthly * 12;
      const grossYield = p.value > 0 ? annualRent / p.value * 100 : 0;
      const netYield   = p.value > 0 ? netRent / p.value * 100 : 0;
      const lvr        = p.value > 0 ? p.loan / p.value * 100 : 0;
      const equity     = p.value - p.loan;
      const val10      = p.value * Math.pow(1 + p.growth / 100, 10);
      const loan10     = calcLoanBalance(p.loan, p.rate / 100, p.term, 10);
      const equity10   = val10 - loan10;
      return { ...p, monthly, annualRent, expenses, netRent, cashFlow, grossYield, netYield, lvr, equity, val10, loan10, equity10 };
    });
  }, [properties]);

  const totals = useMemo(() => ({
    value:     portfolio.reduce((s, p) => s + p.value, 0),
    loan:      portfolio.reduce((s, p) => s + p.loan, 0),
    equity:    portfolio.reduce((s, p) => s + p.equity, 0),
    cashFlow:  portfolio.reduce((s, p) => s + p.cashFlow, 0),
    annRent:   portfolio.reduce((s, p) => s + p.annualRent, 0),
    equity10:  portfolio.reduce((s, p) => s + p.equity10, 0),
    val10:     portfolio.reduce((s, p) => s + p.val10, 0),
  }), [portfolio]);

  const yr10Buy  = rvb.buyRows[yearsCompare - 1];
  const yr10Rent = rvb.rentRows[yearsCompare - 1];
  const buyWins  = yr10Buy && yr10Rent && yr10Buy.netWealth > yr10Rent.netWealth;

  return (
    <div className="tab-content" style={{ fontFamily: "'Sora', sans-serif", color: C.text }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Rent vs Buy & Portfolio View</h2>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
          Compare renting vs buying over time · Track your full property portfolio
        </p>
      </div>

      {/* ═══ SECTION 1: RENT VS BUY ═══ */}
      <SectionDivider title="Rent vs Buy Calculator" icon="🏠" />

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, marginBottom: 20 }}>
        <div>
          <div style={S.card({ marginBottom: 14 })}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>🏠 Buying</div>
            <InputField label="Property Price" value={propPrice} onChange={setPropPrice} prefix="$" />
            <InputField label="Deposit" value={deposit} onChange={setDeposit} prefix="$" />
            <InputField label="Stamp Duty + Costs" value={stampDuty} onChange={setStampDuty} prefix="$" />
            <InputField label="Interest Rate" value={buyRate} onChange={setBuyRate} suffix="% p.a." step={0.05} />
            <InputField label="Loan Term" value={buyTerm} onChange={setBuyTerm} suffix="years" />
            <InputField label="Capital Growth" value={propGrowth} onChange={setPropGrowth} suffix="% p.a." step={0.5} />
            <InputField label="Ongoing Costs (rates, insur.)" value={propExpPct} onChange={setPropExpPct} suffix="% of value" step={0.1} />
          </div>
          <div style={S.card({ marginBottom: 14 })}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>🏢 Renting</div>
            <InputField label="Weekly Rent" value={weeklyRentPaid} onChange={setWeeklyRentPaid} prefix="$" />
            <InputField label="Rent Growth Rate" value={rentGrowth} onChange={setRentGrowth} suffix="% p.a." step={0.5} />
            <InputField label="Investment Return (deposit)" value={investReturn} onChange={setInvestReturn} suffix="% p.a." step={0.5} note="Return on deposit if invested instead" />
          </div>
          <div style={S.card()}>
            <InputField label="Comparison Period" value={yearsCompare} onChange={setYearsCompare} suffix="years" note="How many years to compare" />
          </div>
        </div>

        <div>
          {/* Verdict */}
          <div style={{
            background: buyWins ? `${C.green}0d` : `${C.accent}0d`,
            border: `1px solid ${buyWins ? C.green : C.accent}35`,
            borderRadius: 10, padding: "16px 20px", marginBottom: 14, display: "flex", alignItems: "center", gap: 14,
          }}>
            <span style={{ fontSize: 28 }}>{buyWins ? "🏠" : "🏢"}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: buyWins ? C.green : C.accent }}>
                Over {yearsCompare} years, <strong>{buyWins ? "BUYING" : "RENTING & INVESTING"}</strong> builds more wealth
              </div>
              <div style={{ fontSize: 12, color: C.mutedHi, marginTop: 3 }}>
                Buy wealth: <strong style={{ color: C.green }}>{yr10Buy ? fmt.currency(yr10Buy.netWealth) : "—"}</strong>
                {" "}vs Rent wealth: <strong style={{ color: C.accent }}>{yr10Rent ? fmt.currency(yr10Rent.netWealth) : "—"}</strong>
                {rvb.crossover >= 0 && <span style={{ color: C.gold }}> · Buying overtakes renting at Year {rvb.crossover + 1}</span>}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
            <KPICard label="Monthly Mortgage" value={fmt.currency(rvb.monthly)} color={C.green} sub="P&I repayment" />
            <KPICard label="Monthly Rent" value={fmt.currency(weeklyRentPaid * 52 / 12)} color={C.accent} />
            <KPICard label={`Buy Wealth (Yr ${yearsCompare})`} value={yr10Buy ? fmt.currency(yr10Buy.netWealth) : "—"} color={C.green} />
            <KPICard label={`Rent Wealth (Yr ${yearsCompare})`} value={yr10Rent ? fmt.currency(yr10Rent.netWealth) : "—"} color={C.accent} />
          </div>

          {/* Year by year comparison */}
          <div style={S.card({ padding: 0 })}>
            <div style={{ ...S.sectionTitle, padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}` }}>
              Net Wealth Over Time — Buy vs Rent
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, textAlign: "left", paddingLeft: 16 }}>Year</th>
                    <th style={{ ...S.th, color: C.green }}>Buy — Property Equity</th>
                    <th style={{ ...S.th, color: C.green }}>Buy — Net Wealth</th>
                    <th style={{ ...S.th, color: C.accent }}>Rent — Portfolio</th>
                    <th style={{ ...S.th, color: C.accent }}>Rent — Net Wealth</th>
                    <th style={S.th}>Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {rvb.buyRows.map((b, i) => {
                    const r     = rvb.rentRows[i];
                    const buyW  = b.netWealth > r.netWealth;
                    return (
                      <tr key={b.yr} style={{ background: b.yr % 5 === 0 ? `${C.surface}80` : "transparent", borderBottom: `1px solid ${C.border}18` }}>
                        <td style={{ ...S.td, textAlign: "left", paddingLeft: 16, color: C.mutedHi, fontWeight: b.yr % 5 === 0 ? 700 : 400 }}>{b.yr}</td>
                        <td style={{ ...S.td, color: C.green }}>{fmt.currency(b.equity)}</td>
                        <td style={{ ...S.td, color: C.green, fontWeight: 600 }}>{fmt.currency(b.netWealth)}</td>
                        <td style={{ ...S.td, color: C.accent }}>{fmt.currency(r.portfolioVal)}</td>
                        <td style={{ ...S.td, color: C.accent, fontWeight: 600 }}>{fmt.currency(r.netWealth)}</td>
                        <td style={{ ...S.td }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: buyW ? C.green : C.accent, background: buyW ? `${C.green}18` : `${C.accent}18`, padding: "2px 8px", borderRadius: 4 }}>
                            {buyW ? "🏠 Buy" : "🏢 Rent"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 2: PORTFOLIO VIEW ═══ */}
      <SectionDivider title="Portfolio View" icon="🏘️" />

      {/* Portfolio totals */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <KPICard label="Total Portfolio Value" value={fmt.currency(totals.value)} color={C.gold} />
        <KPICard label="Total Equity" value={fmt.currency(totals.equity)} color={C.green} sub={fmt.pct(totals.equity / totals.value * 100) + " of portfolio"} />
        <KPICard label="Total Annual Cash Flow" value={fmt.currency(totals.cashFlow)} color={totals.cashFlow >= 0 ? C.green : C.red} sub={totals.cashFlow < 0 ? "Negatively geared" : "Positively geared"} />
        <KPICard label="Portfolio Equity (Yr 10)" value={fmt.currency(totals.equity10)} color={C.gold} sub={fmt.currency(totals.val10) + " total value"} />
      </div>

      {/* Property input cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, marginBottom: 20 }}>
        {properties.map((p, idx) => (
          <div key={idx} style={{ ...S.card({ borderTop: `3px solid ${[C.green, C.accent, C.gold, C.yellow, C.red][idx % 5]}` }) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <input value={p.nickname} onChange={e => updateProperty(idx, "nickname", e.target.value)}
                placeholder={`Property ${idx + 1}`}
                style={{ ...S.input, width: "auto", flex: 1, fontSize: 13, fontWeight: 700, fontFamily: "'Sora', sans-serif", background: "transparent", border: "none", padding: "0", color: C.text }} />
              {properties.length > 1 && (
                <button onClick={() => removeProperty(idx)} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</button>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                ["Value", "value", "$", ""],
                ["Loan", "loan", "$", ""],
                ["Weekly Rent", "weeklyRent", "$", ""],
                ["Interest Rate", "rate", "", "% p.a."],
                ["Growth Rate", "growth", "", "% p.a."],
                ["Expenses", "expenses", "", "% rent"],
              ].map(([label, key, pre, suf]) => (
                <div key={key}>
                  <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{label}</div>
                  <div style={{ position: "relative" }}>
                    {pre && <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>{pre}</span>}
                    <input type="number" value={p[key]}
                      onChange={e => updateProperty(idx, key, parseFloat(e.target.value) || 0)}
                      style={{ ...S.input, paddingLeft: pre ? 18 : 10, paddingRight: suf ? 36 : 10, fontSize: 12 }} />
                    {suf && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: C.muted }}>{suf}</span>}
                  </div>
                </div>
              ))}
            </div>
            {/* Mini stats */}
            {portfolio[idx] && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                {[
                  ["LVR",       fmt.pct(portfolio[idx].lvr),        portfolio[idx].lvr <= 80 ? C.green : C.red],
                  ["Net Yield", fmt.pct(portfolio[idx].netYield),    portfolio[idx].netYield >= 4 ? C.green : C.yellow],
                  ["Cash Flow", fmt.currency(portfolio[idx].cashFlow) + "/yr", portfolio[idx].cashFlow >= 0 ? C.green : C.red],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: c, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Add property button */}
        <div onClick={addProperty} style={{ ...S.card({ borderTop: `3px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, background: C.surface }), opacity: 0.7 }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0.7}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>＋</div>
            <div style={{ fontSize: 12, color: C.muted }}>Add Property</div>
          </div>
        </div>
      </div>

      {/* Portfolio summary table */}
      <div style={S.card({ padding: 0 })}>
        <div style={{ ...S.sectionTitle, padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}` }}>Portfolio Summary</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Property", "Value", "Loan", "Equity", "LVR", "Gross Yield", "Net Cash Flow", "Equity (Yr 10)"].map(h => (
                  <th key={h} style={{ ...S.th, textAlign: h === "Property" ? "left" : "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {portfolio.map((p, idx) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${C.border}18`, background: idx % 2 === 0 ? "transparent" : `${C.surface}40` }}>
                  <td style={{ padding: "9px 14px", fontSize: 12, color: C.text, fontWeight: 600, textAlign: "left" }}>{p.nickname || `Property ${idx + 1}`}</td>
                  <td style={S.td}>{fmt.currency(p.value)}</td>
                  <td style={{ ...S.td, color: C.muted }}>{fmt.currency(p.loan)}</td>
                  <td style={{ ...S.td, color: C.gold }}>{fmt.currency(p.equity)}</td>
                  <td style={{ ...S.td, color: p.lvr <= 80 ? C.green : C.red }}>{fmt.pct(p.lvr)}</td>
                  <td style={{ ...S.td, color: p.grossYield >= 5 ? C.green : C.yellow }}>{fmt.pct(p.grossYield)}</td>
                  <td style={{ ...S.td, color: p.cashFlow >= 0 ? C.green : C.red, fontWeight: 600 }}>{fmt.currency(p.cashFlow)}/yr</td>
                  <td style={{ ...S.td, color: C.gold, fontWeight: 600 }}>{fmt.currency(p.equity10)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${C.border}`, background: `${C.surface}80` }}>
                <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: C.text, textAlign: "left" }}>TOTAL</td>
                <td style={{ ...S.td, fontWeight: 700, color: C.text }}>{fmt.currency(totals.value)}</td>
                <td style={{ ...S.td, fontWeight: 700, color: C.muted }}>{fmt.currency(totals.loan)}</td>
                <td style={{ ...S.td, fontWeight: 700, color: C.gold }}>{fmt.currency(totals.equity)}</td>
                <td style={{ ...S.td, color: totals.loan / totals.value * 100 <= 80 ? C.green : C.red, fontWeight: 700 }}>{fmt.pct(totals.loan / totals.value * 100)}</td>
                <td style={{ ...S.td, color: C.yellow, fontWeight: 700 }}>{fmt.pct(totals.annRent / totals.value * 100)}</td>
                <td style={{ ...S.td, color: totals.cashFlow >= 0 ? C.green : C.red, fontWeight: 700 }}>{fmt.currency(totals.cashFlow)}/yr</td>
                <td style={{ ...S.td, color: C.gold, fontWeight: 700 }}>{fmt.currency(totals.equity10)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

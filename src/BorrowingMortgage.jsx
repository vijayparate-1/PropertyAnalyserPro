import { useState, useMemo } from "react";

const C = {
  bg: "#070d1a", surface: "#0d1829", card: "#111e33",
  border: "#1a2d4a", borderHi: "#1e3a5f",
  green: "#00c896", greenDim: "#00a878", greenFg: "#00ffbc",
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
  currency: v => (v === null || isNaN(v)) ? "—" : "$" + Math.round(Math.abs(v)).toLocaleString("en-AU"),
  pct: (v, dp = 2) => (v === null || isNaN(v)) ? "—" : v.toFixed(dp) + "%",
  num: (v, dp = 0) => (v === null || isNaN(v)) ? "—" : Number(v.toFixed(dp)).toLocaleString("en-AU"),
};

function calcMonthlyRepayment(principal, annualRate, termYears) {
  if (principal <= 0 || annualRate <= 0) return principal / (termYears * 12);
  const r = annualRate / 12;
  const n = termYears * 12;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

function calcTotalInterest(principal, annualRate, termYears) {
  const monthly = calcMonthlyRepayment(principal, annualRate, termYears);
  return monthly * termYears * 12 - principal;
}

function calcIORepayment(principal, annualRate) {
  return principal * (annualRate / 12);
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

function KPICard({ label, value, sub, color, badge }) {
  return (
    <div style={{ ...S.card(), borderLeft: `3px solid ${color || C.green}` }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: color || C.green }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.mutedHi, marginTop: 3 }}>{sub}</div>}
      {badge && <div style={{ fontSize: 9, background: badge.bg, color: badge.color, padding: "2px 7px", borderRadius: 4, fontWeight: 700, display: "inline-block", marginTop: 4 }}>{badge.text}</div>}
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

// ── ATO FY2025-26 tax ──
function calcMarginalRate(income) {
  if (income <= 18200) return 0;
  if (income <= 45000) return 0.16;
  if (income <= 135000) return 0.30;
  if (income <= 190000) return 0.37;
  return 0.45;
}

export default function BorrowingMortgage() {
  // Borrowing capacity inputs
  const [grossIncome, setGrossIncome]       = useState(120000);
  const [partnerIncome, setPartnerIncome]   = useState(0);
  const [otherIncome, setOtherIncome]       = useState(0);
  const [livingExpenses, setLivingExpenses] = useState(2500);
  const [existingDebts, setExistingDebts]   = useState(0);
  const [dependants, setDependants]         = useState(0);
  const [creditCards, setCreditCards]       = useState(0);
  const [borrowRate, setBorrowRate]         = useState(6.0);
  const [borrowTerm, setBorrowTerm]         = useState(30);
  const [depositAmount, setDepositAmount]   = useState(150000);

  // Mortgage comparison inputs
  const [loanAmount, setLoanAmount]         = useState(600000);
  const [rate1, setRate1]                   = useState(6.0);
  const [rate2, setRate2]                   = useState(6.5);
  const [term1, setTerm1]                   = useState(30);
  const [term2, setTerm2]                   = useState(25);
  const [ioYears, setIoYears]               = useState(5);

  // ── Borrowing capacity ──
  const borrowing = useMemo(() => {
    const totalIncome     = grossIncome + partnerIncome + otherIncome;
    const monthlyIncome   = totalIncome / 12;
    // APRA stress test rate (+3% buffer)
    const stressRate      = borrowRate + 3.0;
    const depCost         = dependants * 500; // ~$500/month per dependant
    const ccCommitment    = creditCards * 0.038; // 3.8% of limit monthly
    const totalMonthlyExp = livingExpenses + existingDebts + depCost + ccCommitment;
    // Max repayment = 30% of gross monthly income (conservative)
    const maxRepayment    = monthlyIncome * 0.30;
    const availRepayment  = Math.max(0, maxRepayment - totalMonthlyExp);
    // Back-calculate max loan at stress rate
    const r = stressRate / 100 / 12;
    const n = borrowTerm * 12;
    const maxLoan = r > 0 ? availRepayment * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n)) : availRepayment * n;
    const maxPurchase = maxLoan + depositAmount;
    const dsr = totalMonthlyExp / monthlyIncome * 100;
    const margRate = calcMarginalRate(totalIncome);
    return { maxLoan, maxPurchase, availRepayment, totalMonthlyExp, monthlyIncome, dsr, stressRate, margRate, totalIncome };
  }, [grossIncome, partnerIncome, otherIncome, livingExpenses, existingDebts, dependants, creditCards, borrowRate, borrowTerm, depositAmount]);

  // ── Mortgage comparison ──
  const mortgages = useMemo(() => {
    const pi1    = calcMonthlyRepayment(loanAmount, rate1 / 100, term1);
    const pi2    = calcMonthlyRepayment(loanAmount, rate2 / 100, term2);
    const io1    = calcIORepayment(loanAmount, rate1 / 100);
    const io2    = calcIORepayment(loanAmount, rate2 / 100);
    const int1   = calcTotalInterest(loanAmount, rate1 / 100, term1);
    const int2   = calcTotalInterest(loanAmount, rate2 / 100, term2);
    // IO then PI
    const ioThenPIMonths = borrowTerm * 12 - ioYears * 12;
    const principalAfterIO = loanAmount; // IO doesn't reduce principal
    const piAfterIO = calcMonthlyRepayment(principalAfterIO, rate1 / 100, ioThenPIMonths / 12);
    const totalCostIO = io1 * ioYears * 12 + piAfterIO * ioThenPIMonths;
    const totalCostPI = pi1 * term1 * 12;
    const ioExtraCost = totalCostIO - totalCostPI;

    // Amortisation schedule comparison (every 5 years)
    const schedule = [0, 5, 10, 15, 20, 25, 30].filter(y => y <= Math.max(term1, term2)).map(yr => {
      const bal1 = yr === 0 ? loanAmount : (() => {
        if (yr >= term1) return 0;
        const r = rate1 / 100 / 12; const n = term1 * 12; const p = yr * 12;
        if (r === 0) return loanAmount * (1 - p / n);
        return Math.max(0, loanAmount * Math.pow(1 + r, p) - pi1 * (Math.pow(1 + r, p) - 1) / r);
      })();
      const bal2 = yr === 0 ? loanAmount : (() => {
        if (yr >= term2) return 0;
        const r = rate2 / 100 / 12; const n = term2 * 12; const p = yr * 12;
        if (r === 0) return loanAmount * (1 - p / n);
        return Math.max(0, loanAmount * Math.pow(1 + r, p) - pi2 * (Math.pow(1 + r, p) - 1) / r);
      })();
      return { yr, bal1, bal2 };
    });

    return { pi1, pi2, io1, io2, int1, int2, piAfterIO, totalCostIO, totalCostPI, ioExtraCost, schedule };
  }, [loanAmount, rate1, rate2, term1, term2, ioYears, borrowTerm]);

  const capacityColor = borrowing.maxLoan > 800000 ? C.green : borrowing.maxLoan > 400000 ? C.yellow : C.red;

  return (
    <div className="tab-content" style={{ fontFamily: "'Sora', sans-serif", color: C.text }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Borrowing Capacity & Mortgage Comparison</h2>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>APRA stress-tested borrowing capacity · P&I vs Interest Only · Fixed vs Variable comparison</p>
      </div>

      {/* ═══ SECTION 1: BORROWING CAPACITY ═══ */}
      <SectionDivider title="Borrowing Capacity Calculator" icon="💰" />

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, marginBottom: 20 }}>
        <div>
          <div style={S.card({ marginBottom: 14 })}>
            <div style={S.sectionTitle}>Income</div>
            <InputField label="Your Gross Annual Income" value={grossIncome} onChange={setGrossIncome} prefix="$" />
            <InputField label="Partner's Gross Income" value={partnerIncome} onChange={setPartnerIncome} prefix="$" note="Leave 0 if single applicant" />
            <InputField label="Other Income (rental, etc.)" value={otherIncome} onChange={setOtherIncome} prefix="$" />
          </div>
          <div style={S.card({ marginBottom: 14 })}>
            <div style={S.sectionTitle}>Expenses & Liabilities</div>
            <InputField label="Monthly Living Expenses" value={livingExpenses} onChange={setLivingExpenses} prefix="$" note="Groceries, utilities, transport, etc." />
            <InputField label="Existing Debt Repayments" value={existingDebts} onChange={setExistingDebts} prefix="$" note="Monthly car, personal loan payments" />
            <InputField label="Credit Card Limits (total)" value={creditCards} onChange={setCreditCards} prefix="$" note="Banks use 3.8% of limit as monthly commitment" />
            <InputField label="Number of Dependants" value={dependants} onChange={setDependants} note="~$500/month per dependant assumed" />
          </div>
          <div style={S.card()}>
            <div style={S.sectionTitle}>Loan Parameters</div>
            <InputField label="Interest Rate" value={borrowRate} onChange={setBorrowRate} suffix="% p.a." step={0.05} note={`APRA stress test: ${(borrowRate + 3).toFixed(2)}% (+3% buffer)`} />
            <InputField label="Loan Term" value={borrowTerm} onChange={setBorrowTerm} suffix="years" />
            <InputField label="Available Deposit" value={depositAmount} onChange={setDepositAmount} prefix="$" note="Includes savings, gifts, FHSS" />
          </div>
        </div>

        <div>
          {/* Hero result */}
          <div style={{ ...S.card({ marginBottom: 14, background: `${capacityColor}0d`, borderColor: `${capacityColor}35` }) }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 6 }}>Maximum Borrowing Capacity</div>
                <div style={{ fontSize: 38, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: capacityColor, letterSpacing: "-0.02em" }}>{fmt.currency(borrowing.maxLoan)}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Stress-tested at {fmt.pct(borrowing.stressRate, 2)} (rate + 3% APRA buffer)</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 6 }}>Max Purchase Price</div>
                <div style={{ fontSize: 38, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: C.gold, letterSpacing: "-0.02em" }}>{fmt.currency(borrowing.maxPurchase)}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Loan + {fmt.currency(depositAmount)} deposit</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                ["Total Income", fmt.currency(borrowing.totalIncome) + "/yr", C.green],
                ["Monthly Income", fmt.currency(borrowing.monthlyIncome), C.green],
                ["Max Repayment", fmt.currency(borrowing.availRepayment) + "/mo", C.yellow],
                ["Debt Ratio", fmt.pct(borrowing.dsr), borrowing.dsr < 30 ? C.green : borrowing.dsr < 40 ? C.yellow : C.red],
              ].map(([k, v, c]) => (
                <div key={k} style={{ background: C.surface, padding: "10px 12px", borderRadius: 8 }}>
                  <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Expense breakdown */}
          <div style={{ ...S.card({ marginBottom: 14 }) }}>
            <div style={S.sectionTitle}>Monthly Expense Breakdown</div>
            {[
              ["Living Expenses",          livingExpenses,                                 C.muted],
              ["Existing Debt Repayments", existingDebts,                                  C.muted],
              ["Credit Card Commitment",   creditCards * 0.038,                            C.muted],
              ["Dependant Costs",          dependants * 500,                               C.muted],
              ["Total Monthly Commitments",borrowing.totalMonthlyExp,                      C.red, true],
              ["Gross Monthly Income",     borrowing.monthlyIncome,                        C.green, true],
              ["Available for Repayment",  borrowing.availRepayment,                       C.gold, true],
            ].map(([k, v, c, bold]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}18` }}>
                <span style={{ fontSize: 12, color: bold ? C.mutedHi : C.muted, fontWeight: bold ? 600 : 400 }}>{k}</span>
                <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: bold ? 700 : 400, color: c }}>{fmt.currency(v)}/mo</span>
              </div>
            ))}
          </div>

          {/* Deposit scenarios */}
          <div style={S.card()}>
            <div style={S.sectionTitle}>Purchase Price at Different Deposit Levels</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Deposit %", "Deposit $", "Max Purchase", "LVR", "LMI?"].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[5, 10, 20, 30].map(pct => {
                  const dep = borrowing.maxLoan * pct / (100 - pct);
                  const purchase = borrowing.maxLoan + dep;
                  const lvr = 100 - pct;
                  return (
                    <tr key={pct} style={{ background: pct === 20 ? `${C.green}08` : "transparent", borderBottom: `1px solid ${C.border}18` }}>
                      <td style={{ ...S.td, color: pct === 20 ? C.green : C.mutedHi, fontWeight: pct === 20 ? 700 : 400 }}>{pct}% {pct === 20 ? "✓" : ""}</td>
                      <td style={S.td}>{fmt.currency(dep)}</td>
                      <td style={{ ...S.td, color: C.gold, fontWeight: 600 }}>{fmt.currency(purchase)}</td>
                      <td style={{ ...S.td, color: lvr > 80 ? C.red : C.green }}>{lvr}%</td>
                      <td style={{ ...S.td, color: lvr > 80 ? C.red : C.green }}>{lvr > 80 ? "Yes ⚠" : "No ✓"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 2: MORTGAGE COMPARISON ═══ */}
      <SectionDivider title="Mortgage Comparison" icon="🏦" />

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
        <div style={S.card()}>
          <div style={S.sectionTitle}>Loan Parameters</div>
          <InputField label="Loan Amount" value={loanAmount} onChange={setLoanAmount} prefix="$" />
          <div style={{ borderBottom: `1px solid ${C.border}`, marginBottom: 14, paddingBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Option A</div>
            <InputField label="Interest Rate" value={rate1} onChange={setRate1} suffix="% p.a." step={0.05} />
            <InputField label="Loan Term" value={term1} onChange={setTerm1} suffix="years" />
          </div>
          <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Option B</div>
            <InputField label="Interest Rate" value={rate2} onChange={setRate2} suffix="% p.a." step={0.05} />
            <InputField label="Loan Term" value={term2} onChange={setTerm2} suffix="years" />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Interest Only Period</div>
            <InputField label="IO Period (uses Option A rate)" value={ioYears} onChange={setIoYears} suffix="years" note="Then reverts to P&I for remaining term" />
          </div>
        </div>

        <div>
          {/* Comparison cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
            {[
              { label: "Option A — P&I", monthly: mortgages.pi1, total: mortgages.pi1 * term1 * 12, interest: mortgages.int1, color: C.green, sub: `${rate1}% · ${term1}yr P&I` },
              { label: "Option B — P&I", monthly: mortgages.pi2, total: mortgages.pi2 * term2 * 12, interest: mortgages.int2, color: C.accent, sub: `${rate2}% · ${term2}yr P&I` },
              { label: "IO then P&I", monthly: mortgages.io1, total: mortgages.totalCostIO, interest: mortgages.totalCostIO - loanAmount, color: C.gold, sub: `${ioYears}yr IO @ ${rate1}%, then P&I` },
            ].map(opt => (
              <div key={opt.label} style={{ ...S.card(), borderTop: `3px solid ${opt.color}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: opt.color, marginBottom: 12 }}>{opt.label}</div>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Monthly Repayment</div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: opt.color, marginBottom: 10 }}>{fmt.currency(opt.monthly)}</div>
                <div style={{ fontSize: 10, color: C.muted }}>{opt.sub}</div>
                <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 10, paddingTop: 10 }}>
                  {[
                    ["Total Repaid", fmt.currency(opt.total)],
                    ["Total Interest", fmt.currency(opt.interest)],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontSize: 10, color: C.muted }}>{k}</span>
                      <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: C.text }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* IO warning */}
          {mortgages.ioExtraCost > 0 && (
            <div style={{ background: `${C.gold}10`, border: `1px solid ${C.gold}30`, borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.gold }}>
                ⚠ IO costs <strong>{fmt.currency(mortgages.ioExtraCost)}</strong> more than P&I over the loan term
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                After the IO period ends, P&I repayments jump to {fmt.currency(mortgages.piAfterIO)}/month (compressed into {borrowTerm - ioYears} years).
              </div>
            </div>
          )}

          {/* Amortisation comparison */}
          <div style={S.card({ padding: 0 })}>
            <div style={{ ...S.sectionTitle, padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}` }}>Loan Balance Over Time</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...S.th, textAlign: "left", paddingLeft: 16 }}>Year</th>
                  <th style={{ ...S.th, color: C.green }}>Option A Balance</th>
                  <th style={{ ...S.th, color: C.accent }}>Option B Balance</th>
                  <th style={S.th}>Difference</th>
                </tr>
              </thead>
              <tbody>
                {mortgages.schedule.map(row => (
                  <tr key={row.yr} style={{ borderBottom: `1px solid ${C.border}18` }}>
                    <td style={{ ...S.td, textAlign: "left", paddingLeft: 16, color: C.mutedHi, fontWeight: 600 }}>{row.yr === 0 ? "Start" : `Yr ${row.yr}`}</td>
                    <td style={{ ...S.td, color: C.green }}>{fmt.currency(row.bal1)}</td>
                    <td style={{ ...S.td, color: C.accent }}>{fmt.currency(row.bal2)}</td>
                    <td style={{ ...S.td, color: row.bal1 < row.bal2 ? C.green : C.red }}>
                      {row.bal1 === row.bal2 ? "—" : (row.bal1 < row.bal2 ? "-" : "+") + fmt.currency(Math.abs(row.bal1 - row.bal2))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={{ ...S.card({ marginTop: 16, background: `${C.accent}08`, borderColor: `${C.accent}25` }) }}>
        <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Methodology</div>
        <div style={{ fontSize: 11, color: C.mutedHi, lineHeight: 1.7 }}>
          Borrowing capacity uses APRA's serviceability buffer (interest rate + 3%). Monthly commitment includes 3.8% of total credit card limits per APRA APS 223.
          Living expenses benchmarked at HEM (Household Expenditure Measure). Results are indicative only — actual lending capacity varies by lender, credit score, and policies.
        </div>
      </div>
    </div>
  );
}

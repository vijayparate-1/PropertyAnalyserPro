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

export default function OffsetAndStressTest() {
  // Offset inputs
  const [loanAmount, setLoanAmount]         = useState(600000);
  const [interestRate, setInterestRate]     = useState(6.0);
  const [loanTerm, setLoanTerm]             = useState(30);
  const [offsetBalance, setOffsetBalance]   = useState(50000);
  const [monthlyDeposit, setMonthlyDeposit] = useState(2000);
  const [offsetGrowthRate, setOffsetGrowthRate] = useState(3);

  // Stress test inputs
  const [stressLoanAmount, setStressLoanAmount]   = useState(600000);
  const [stressBaseRate, setStressBaseRate]         = useState(6.0);
  const [stressLoanTerm, setStressLoanTerm]         = useState(30);
  const [grossIncome, setGrossIncome]               = useState(120000);
  const [partnerIncome, setPartnerIncome]           = useState(0);
  const [weeklyRent, setWeeklyRent]                 = useState(650);
  const [monthlyExpenses, setMonthlyExpenses]       = useState(3500);

  // ── Offset calculations ──
  const offset = useMemo(() => {
    const effectiveLoan = Math.max(0, loanAmount - offsetBalance);
    const monthlyNoOffset   = calcMonthlyRepayment(loanAmount,     interestRate / 100, loanTerm);
    const monthlyWithOffset = calcMonthlyRepayment(effectiveLoan,  interestRate / 100, loanTerm);
    const totalNoOffset     = monthlyNoOffset * loanTerm * 12;
    const totalWithOffset   = monthlyWithOffset * loanTerm * 12 + (loanAmount - effectiveLoan) * (interestRate / 100) * loanTerm; // simplified
    const interestSavedNow  = (loanAmount - effectiveLoan) * (interestRate / 100);
    const totalInterestNoOffset = totalNoOffset - loanAmount;

    // Project offset balance over time with monthly deposits
    const projection = Array.from({ length: loanTerm }, (_, i) => {
      const yr = i + 1;
      const projOffset = offsetBalance * Math.pow(1 + offsetGrowthRate / 100, yr) + monthlyDeposit * 12 * yr;
      const effLoan    = Math.max(0, loanAmount - Math.min(projOffset, loanAmount));
      const intSaved   = (loanAmount - effLoan) * (interestRate / 100);
      const loanBal    = calcLoanBalance(loanAmount, interestRate / 100, loanTerm, yr);
      return { yr, projOffset: Math.min(projOffset, loanAmount), effLoan, intSaved, loanBal };
    });

    // Total interest saved over loan life (approximate)
    const totalIntSaved = projection.reduce((sum, r) => sum + r.intSaved, 0);
    const yearsShortened = totalIntSaved > 0 ? Math.round(totalIntSaved / (monthlyNoOffset * 12)) : 0;

    return { effectiveLoan, monthlyNoOffset, monthlyWithOffset, interestSavedNow, totalIntSaved, yearsShortened, projection, totalInterestNoOffset };
  }, [loanAmount, interestRate, loanTerm, offsetBalance, monthlyDeposit, offsetGrowthRate]);

  // ── Stress test calculations ──
  const stress = useMemo(() => {
    const totalIncome     = grossIncome + partnerIncome;
    const monthlyIncome   = totalIncome / 12;
    const annualRent      = weeklyRent * 52;
    const rateScenarios   = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4].map(increase => {
      const rate     = stressBaseRate + increase;
      const monthly  = calcMonthlyRepayment(stressLoanAmount, rate / 100, stressLoanTerm);
      const annual   = monthly * 12;
      const totalOut = monthly + monthlyExpenses;
      const netCF    = monthlyIncome + annualRent / 12 - totalOut;
      const dsr      = totalOut / monthlyIncome * 100;
      const canService = netCF >= 0;
      return { increase, rate, monthly, annual, netCF, dsr, canService };
    });

    const breakEvenRate = rateScenarios.find(r => !r.canService);
    const currentScenario = rateScenarios[0];
    const apraScenario    = rateScenarios.find(r => Math.abs(r.increase - 3) < 0.01);

    return { rateScenarios, breakEvenRate, currentScenario, apraScenario, monthlyIncome };
  }, [stressLoanAmount, stressBaseRate, stressLoanTerm, grossIncome, partnerIncome, weeklyRent, monthlyExpenses]);

  return (
    <div className="tab-content" style={{ fontFamily: "'Sora', sans-serif", color: C.text }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Offset Account Simulator & Stress Test</h2>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
          See how your offset balance saves interest over time · Test cash flow at higher interest rates
        </p>
      </div>

      {/* ═══ SECTION 1: OFFSET ACCOUNT ═══ */}
      <SectionDivider title="Offset Account Simulator" icon="🏦" />

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, marginBottom: 20 }}>
        <div style={S.card()}>
          <div style={S.sectionTitle}>Loan & Offset Details</div>
          <InputField label="Loan Amount" value={loanAmount} onChange={setLoanAmount} prefix="$" />
          <InputField label="Interest Rate" value={interestRate} onChange={setInterestRate} suffix="% p.a." step={0.05} />
          <InputField label="Loan Term" value={loanTerm} onChange={setLoanTerm} suffix="years" />
          <InputField label="Current Offset Balance" value={offsetBalance} onChange={setOffsetBalance} prefix="$" note="Reduces effective loan principal" />
          <InputField label="Monthly Offset Deposits" value={monthlyDeposit} onChange={setMonthlyDeposit} prefix="$" note="Salary, savings deposited monthly" />
          <InputField label="Offset Balance Growth" value={offsetGrowthRate} onChange={setOffsetGrowthRate} suffix="% p.a." step={0.5} note="Assumed annual growth of offset balance" />
        </div>

        <div>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 14 }}>
            <KPICard label="Interest Saved Per Year (Now)" value={fmt.currency(offset.interestSavedNow)} color={C.green} sub={`On ${fmt.currency(offsetBalance)} offset balance`} />
            <KPICard label="Estimated Total Interest Saved" value={fmt.currency(offset.totalIntSaved)} color={C.gold} sub="Over full loan life" />
            <KPICard label="Monthly Repayment Without Offset" value={fmt.currency(offset.monthlyNoOffset)} color={C.muted} />
            <KPICard label="Effective Loan Balance (Now)" value={fmt.currency(offset.effectiveLoan)} color={C.accent} sub={`${fmt.currency(loanAmount)} - ${fmt.currency(offsetBalance)} offset`} />
          </div>

          {/* Insight banner */}
          <div style={{ background: `${C.green}0d`, border: `1px solid ${C.green}30`, borderRadius: 10, padding: "13px 18px", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 4 }}>
              💡 Your {fmt.currency(offsetBalance)} offset saves {fmt.currency(offset.interestSavedNow)}/year in interest
            </div>
            <div style={{ fontSize: 12, color: C.mutedHi }}>
              That's equivalent to earning {fmt.pct(interestRate)} tax-free on your offset savings — better than most savings accounts after tax.
              Over the loan life, estimated total saving: <strong style={{ color: C.gold }}>{fmt.currency(offset.totalIntSaved)}</strong>.
            </div>
          </div>

          {/* Offset projection chart */}
          <div style={S.card({ marginBottom: 14 })}>
            <div style={S.sectionTitle}>Offset Balance Growth vs Loan Balance</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 90, marginBottom: 8 }}>
              {offset.projection.filter((_, i) => i % Math.ceil(loanTerm / 20) === 0 || i === loanTerm - 1).map(r => {
                const maxVal  = loanAmount;
                const loanH   = Math.max(3, (r.loanBal / maxVal) * 80);
                const offsetH = Math.max(3, (r.projOffset / maxVal) * 80);
                return (
                  <div key={r.yr} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", justifyContent: "center" }}>
                      <div style={{ flex: 1, height: loanH, background: C.red, borderRadius: "3px 3px 0 0", opacity: 0.7 }} />
                      <div style={{ flex: 1, height: offsetH, background: C.green, borderRadius: "3px 3px 0 0", opacity: 0.85 }} />
                    </div>
                    <span style={{ fontSize: 8, color: C.muted }}>{r.yr}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, background: C.red, borderRadius: 2, opacity: 0.7 }} />
                <span style={{ fontSize: 10, color: C.muted }}>Loan Balance</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, background: C.green, borderRadius: 2 }} />
                <span style={{ fontSize: 10, color: C.muted }}>Offset Balance</span>
              </div>
            </div>
          </div>

          {/* Offset projection table */}
          <div style={S.card({ padding: 0 })}>
            <div style={{ ...S.sectionTitle, padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}` }}>Year-by-Year Offset Impact</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Year", "Offset Balance", "Loan Balance", "Effective Loan", "Interest Saved/yr"].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {offset.projection.filter((_, i) => i === 0 || (i + 1) % 5 === 0).map(r => (
                    <tr key={r.yr} style={{ borderBottom: `1px solid ${C.border}18` }}>
                      <td style={{ ...S.td, color: C.mutedHi, fontWeight: 600 }}>{r.yr}</td>
                      <td style={{ ...S.td, color: C.green }}>{fmt.currency(r.projOffset)}</td>
                      <td style={{ ...S.td, color: C.muted }}>{fmt.currency(r.loanBal)}</td>
                      <td style={{ ...S.td, color: C.accent }}>{fmt.currency(r.effLoan)}</td>
                      <td style={{ ...S.td, color: C.gold, fontWeight: 600 }}>{fmt.currency(r.intSaved)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 2: STRESS TEST ═══ */}
      <SectionDivider title="Interest Rate Stress Test" icon="📊" />

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
        <div style={S.card()}>
          <div style={S.sectionTitle}>Loan & Income Details</div>
          <InputField label="Loan Amount" value={stressLoanAmount} onChange={setStressLoanAmount} prefix="$" />
          <InputField label="Current Interest Rate" value={stressBaseRate} onChange={setStressBaseRate} suffix="% p.a." step={0.05} />
          <InputField label="Loan Term" value={stressLoanTerm} onChange={setStressLoanTerm} suffix="years" />
          <InputField label="Your Gross Annual Income" value={grossIncome} onChange={setGrossIncome} prefix="$" />
          <InputField label="Partner's Gross Income" value={partnerIncome} onChange={setPartnerIncome} prefix="$" note="Leave 0 if single" />
          <InputField label="Weekly Rent Received" value={weeklyRent} onChange={setWeeklyRent} prefix="$" />
          <InputField label="Monthly Living Expenses" value={monthlyExpenses} onChange={setMonthlyExpenses} prefix="$" note="Excl. mortgage repayments" />
        </div>

        <div>
          {/* APRA verdict */}
          {stress.apraScenario && (
            <div style={{
              background: stress.apraScenario.canService ? `${C.green}0d` : `${C.red}12`,
              border: `1px solid ${stress.apraScenario.canService ? C.green : C.red}35`,
              borderRadius: 10, padding: "14px 18px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: 22 }}>{stress.apraScenario.canService ? "✅" : "⚠️"}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: stress.apraScenario.canService ? C.green : C.red }}>
                  APRA Stress Test (+3%): {stress.apraScenario.canService ? "PASSES" : "FAILS"}
                </div>
                <div style={{ fontSize: 12, color: C.mutedHi, marginTop: 3 }}>
                  At {fmt.pct(stress.apraScenario.rate, 1)}, monthly repayment is {fmt.currency(stress.apraScenario.monthly)}.
                  Monthly cash flow: <strong style={{ color: stress.apraScenario.canService ? C.green : C.red }}>{fmt.currency(stress.apraScenario.netCF)}</strong>.
                  {stress.breakEvenRate && !stress.apraScenario.canService && ` Cash flow breaks even at ~${fmt.pct(stressBaseRate + (stress.breakEvenRate.increase - 0.5), 1)}.`}
                </div>
              </div>
            </div>
          )}

          {/* Stress test table */}
          <div style={S.card({ padding: 0, marginBottom: 14 })}>
            <div style={{ ...S.sectionTitle, padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}` }}>
              Cash Flow at Different Rate Scenarios
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Rate Increase", "Interest Rate", "Monthly Repayment", "Monthly Cash Flow", "Debt Ratio", "Status"].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stress.rateScenarios.map(r => {
                  const isBase  = r.increase === 0;
                  const isApra  = r.increase === 3;
                  const cfColor = r.canService ? C.green : C.red;
                  const dColor  = r.dsr <= 30 ? C.green : r.dsr <= 40 ? C.yellow : C.red;
                  return (
                    <tr key={r.increase} style={{
                      background: isBase ? `${C.green}08` : isApra ? `${C.gold}08` : "transparent",
                      borderBottom: `1px solid ${C.border}18`,
                    }}>
                      <td style={{ ...S.td, color: isBase ? C.green : isApra ? C.gold : C.muted, fontWeight: isBase || isApra ? 700 : 400 }}>
                        {r.increase === 0 ? "Base (now)" : `+${r.increase}%`}
                        {isApra ? " ← APRA" : ""}
                      </td>
                      <td style={{ ...S.td, color: C.text, fontWeight: 600 }}>{fmt.pct(r.rate)}</td>
                      <td style={{ ...S.td, color: C.text }}>{fmt.currency(r.monthly)}/mo</td>
                      <td style={{ ...S.td, color: cfColor, fontWeight: 700 }}>{fmt.currency(r.netCF)}/mo</td>
                      <td style={{ ...S.td, color: dColor }}>{fmt.pct(r.dsr)}</td>
                      <td style={{ ...S.td }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: cfColor, background: `${cfColor}18`, padding: "2px 8px", borderRadius: 4 }}>
                          {r.canService ? "✓ OK" : "✗ AT RISK"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Visual stress bar */}
          <div style={S.card()}>
            <div style={S.sectionTitle}>Monthly Cash Flow by Rate</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stress.rateScenarios.map(r => {
                const maxAbs  = Math.max(...stress.rateScenarios.map(x => Math.abs(x.netCF)));
                const barW    = maxAbs > 0 ? Math.abs(r.netCF) / maxAbs * 100 : 0;
                const col     = r.canService ? C.green : C.red;
                return (
                  <div key={r.increase} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 10, color: C.muted, width: 70, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                      {r.increase === 0 ? "Base" : `+${r.increase}%`} ({fmt.pct(r.rate)})
                    </div>
                    <div style={{ flex: 1, height: 14, background: C.surface, borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${barW}%`, background: col, borderRadius: 3, opacity: 0.85, transition: "width 0.3s" }} />
                    </div>
                    <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: col, fontWeight: 600, width: 100, textAlign: "right", flexShrink: 0 }}>
                      {fmt.currency(r.netCF)}/mo
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 14, fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
              <strong style={{ color: C.gold }}>APRA requires lenders</strong> to assess your ability to repay at your current rate plus 3%.
              If cash flow turns negative, consider building a buffer fund of at least 3–6 months of repayments.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

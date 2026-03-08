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

function calcIncomeTax(income) {
  if (income <= 18200)  return 0;
  if (income <= 45000)  return (income - 18200) * 0.16;
  if (income <= 135000) return 4288 + (income - 45000) * 0.30;
  if (income <= 190000) return 31288 + (income - 135000) * 0.37;
  return 51638 + (income - 190000) * 0.45;
}
function calcMarginalRate(income) {
  if (income <= 18200) return 0;
  if (income <= 45000) return 0.16;
  if (income <= 135000) return 0.30;
  if (income <= 190000) return 0.37;
  return 0.45;
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

function Toggle({ label, value, onChange, note }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{label}</div>
          {note && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{note}</div>}
        </div>
        <div onClick={() => onChange(!value)} style={{ width: 40, height: 22, borderRadius: 11, cursor: "pointer", background: value ? C.green : C.border, position: "relative", transition: "background 0.2s", flexShrink: 0, marginLeft: 12 }}>
          <div style={{ position: "absolute", top: 3, left: value ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
        </div>
      </div>
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

export default function CGTAndRenovation() {
  // CGT inputs
  const [purchasePrice, setPurchasePrice]   = useState(600000);
  const [salePrice, setSalePrice]           = useState(900000);
  const [purchaseCosts, setPurchaseCosts]   = useState(30000);
  const [saleCosts, setSaleCosts]           = useState(20000);
  const [yearsHeld, setYearsHeld]           = useState(5);
  const [personalIncome, setPersonalIncome] = useState(120000);
  const [isMainResidence, setIsMainResidence] = useState(false);
  const [mainResYears, setMainResYears]     = useState(0);
  const [capitalImprovements, setCapitalImprovements] = useState(0);

  // Renovation inputs
  const [currentValue, setCurrentValue]     = useState(750000);
  const [renovCost, setRenovCost]           = useState(50000);
  const [valueAddPct, setValueAddPct]       = useState(8);
  const [weeklyRentBefore, setWeeklyRentBefore] = useState(550);
  const [weeklyRentAfter, setWeeklyRentAfter]   = useState(650);
  const [renovFinancedPct, setRenovFinancedPct] = useState(0);
  const [financingRate, setFinancingRate]   = useState(8.5);

  // ── CGT calculation ──
  const cgt = useMemo(() => {
    const costBase    = purchasePrice + purchaseCosts + capitalImprovements;
    const netProceeds = salePrice - saleCosts;
    const grossGain   = netProceeds - costBase;
    if (grossGain <= 0) return { grossGain, taxableGain: 0, cgtPayable: 0, netProceeds, costBase, effectiveRate: 0, netGain: grossGain };

    // Main residence exemption
    let exemptFraction = 0;
    if (isMainResidence && yearsHeld > 0) {
      exemptFraction = Math.min(1, mainResYears / yearsHeld);
    }
    const taxableBeforeDiscount = grossGain * (1 - exemptFraction);

    // 50% CGT discount if held > 12 months
    const cgtDiscount = yearsHeld >= 1 ? 0.5 : 0;
    const taxableGain = taxableBeforeDiscount * (1 - cgtDiscount);

    // Tax on gain added to income
    const taxWithout  = calcIncomeTax(personalIncome);
    const taxWith     = calcIncomeTax(personalIncome + taxableGain);
    const cgtPayable  = taxWith - taxWithout;
    const margRate    = calcMarginalRate(personalIncome + taxableGain / 2);
    const effectiveRate = grossGain > 0 ? cgtPayable / grossGain * 100 : 0;
    const netGain     = grossGain - cgtPayable;

    return { grossGain, taxableGain, cgtPayable, netProceeds, costBase, effectiveRate, netGain, exemptFraction, cgtDiscount, taxableBeforeDiscount, margRate };
  }, [purchasePrice, salePrice, purchaseCosts, saleCosts, yearsHeld, personalIncome, isMainResidence, mainResYears, capitalImprovements]);

  // ── Renovation ROI ──
  const reno = useMemo(() => {
    const valueAdded      = currentValue * valueAddPct / 100;
    const newValue        = currentValue + valueAdded;
    const roi             = valueAdded > 0 ? (valueAdded - renovCost) / renovCost * 100 : -100;
    const annualRentGain  = (weeklyRentAfter - weeklyRentBefore) * 52;
    const rentYield       = annualRentGain / renovCost * 100;
    const financed        = renovCost * renovFinancedPct / 100;
    const annualInterest  = financed * financingRate / 100;
    const netAnnualBenefit = annualRentGain - annualInterest;
    const paybackYears    = netAnnualBenefit > 0 ? (renovCost - financed) / netAnnualBenefit : null;
    const lvr             = (currentValue * 0.8 - currentValue * 0.6); // rough equity release
    const valueMultiple   = renovCost > 0 ? valueAdded / renovCost : 0;

    return { valueAdded, newValue, roi, annualRentGain, rentYield, financed, annualInterest, netAnnualBenefit, paybackYears, valueMultiple };
  }, [currentValue, renovCost, valueAddPct, weeklyRentBefore, weeklyRentAfter, renovFinancedPct, financingRate]);

  const cgtColor = cgt.cgtPayable > 50000 ? C.red : cgt.cgtPayable > 20000 ? C.yellow : C.green;
  const roiColor = reno.roi >= 100 ? C.green : reno.roi >= 0 ? C.yellow : C.red;

  return (
    <div className="tab-content" style={{ fontFamily: "'Sora', sans-serif", color: C.text }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>CGT Calculator & Renovation ROI</h2>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Capital Gains Tax with 50% discount & main residence exemption · Renovation return on investment</p>
      </div>

      {/* ═══ SECTION 1: CGT ═══ */}
      <SectionDivider title="Capital Gains Tax Calculator" icon="🧾" />

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, marginBottom: 20 }}>
        <div>
          <div style={S.card({ marginBottom: 14 })}>
            <div style={S.sectionTitle}>Sale Details</div>
            <InputField label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} prefix="$" />
            <InputField label="Purchase Costs (stamp duty, legal)" value={purchaseCosts} onChange={setPurchaseCosts} prefix="$" />
            <InputField label="Capital Improvements" value={capitalImprovements} onChange={setCapitalImprovements} prefix="$" note="Adds to cost base (renovations, extensions)" />
            <InputField label="Sale Price" value={salePrice} onChange={setSalePrice} prefix="$" />
            <InputField label="Sale Costs (agent, legal)" value={saleCosts} onChange={setSaleCosts} prefix="$" />
            <InputField label="Years Held" value={yearsHeld} onChange={setYearsHeld} suffix="years" note="≥1 year qualifies for 50% CGT discount" />
          </div>
          <div style={S.card({ marginBottom: 14 })}>
            <div style={S.sectionTitle}>Your Tax Situation</div>
            <InputField label="Personal Income (excl. property)" value={personalIncome} onChange={setPersonalIncome} prefix="$" note="ATO FY2025-26 tax brackets" />
            <Toggle label="Main Residence (partial exemption)" value={isMainResidence} onChange={setIsMainResidence} note="Did you live in this property?" />
            {isMainResidence && (
              <InputField label="Years Lived In" value={mainResYears} onChange={setMainResYears} suffix="years"
                note={`${yearsHeld > 0 ? fmt.pct(Math.min(100, mainResYears / yearsHeld * 100)) : "0%"} exempt`} />
            )}
          </div>
        </div>

        <div>
          {/* CGT result */}
          <div style={{ ...S.card({ marginBottom: 14, background: cgt.grossGain < 0 ? `${C.green}0d` : `${cgtColor}0a`, borderColor: `${cgtColor}35` }) }}>
            {cgt.grossGain < 0 ? (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 8 }}>✅ Capital Loss — No CGT Payable</div>
                <div style={{ fontSize: 12, color: C.muted }}>You made a loss of {fmt.currency(Math.abs(cgt.grossGain))}. This can be carried forward to offset future capital gains.</div>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>CGT Payable</div>
                    <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: cgtColor }}>{fmt.currency(cgt.cgtPayable)}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Effective rate: {fmt.pct(cgt.effectiveRate)} of gross gain</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Net Gain After Tax</div>
                    <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: C.gold }}>{fmt.currency(cgt.netGain)}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>After CGT on {fmt.currency(cgt.grossGain)} gross gain</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {[
                    ["Gross Gain",      fmt.currency(cgt.grossGain),              C.text],
                    ["After Exemption", fmt.currency(cgt.taxableBeforeDiscount),  C.yellow],
                    ["After 50% Disc.", fmt.currency(cgt.taxableGain),            C.gold],
                    ["CGT Payable",     fmt.currency(cgt.cgtPayable),             cgtColor],
                  ].map(([k, v, c]) => (
                    <div key={k} style={{ background: C.surface, padding: "10px 12px", borderRadius: 8 }}>
                      <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{k}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: c }}>{v}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Step-by-step breakdown */}
          <div style={{ ...S.card({ marginBottom: 14 }) }}>
            <div style={S.sectionTitle}>CGT Calculation — Step by Step</div>
            {[
              ["Sale Price",                        salePrice,                            C.text],
              ["Less: Sale Costs",                  -saleCosts,                           C.red],
              ["Net Sale Proceeds",                 cgt.netProceeds,                      C.text, true],
              ["Less: Cost Base",                   -cgt.costBase,                        C.red],
              ["  Purchase Price",                  -purchasePrice,                       C.muted],
              ["  Purchase Costs",                  -purchaseCosts,                       C.muted],
              ["  Capital Improvements",            -capitalImprovements,                 C.muted],
              ["Gross Capital Gain",                cgt.grossGain,                        cgt.grossGain >= 0 ? C.gold : C.green, true],
              isMainResidence ? ["Less: Main Residence Exemption (" + fmt.pct((cgt.exemptFraction || 0) * 100) + ")", -(cgt.grossGain * (cgt.exemptFraction || 0)), C.green] : null,
              ["Less: 50% CGT Discount" + (yearsHeld < 1 ? " (not eligible <12 months)" : ""), yearsHeld >= 1 ? -(cgt.taxableBeforeDiscount * 0.5) : 0, C.green],
              ["Taxable Capital Gain",              cgt.taxableGain,                      C.yellow, true],
              ["CGT Payable (at marginal rate)",    -cgt.cgtPayable,                      C.red, true],
              ["Net Gain After CGT",                cgt.netGain,                          C.gold, true],
            ].filter(Boolean).map(([k, v, c, bold]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}18` }}>
                <span style={{ fontSize: bold ? 12 : 11, color: bold ? C.mutedHi : C.muted, fontWeight: bold ? 600 : 400, paddingLeft: k.startsWith("  ") ? 12 : 0 }}>{k.trim()}</span>
                <span style={{ fontSize: bold ? 13 : 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: bold ? 700 : 400, color: c }}>{fmt.currency(v)}</span>
              </div>
            ))}
          </div>

          {/* CGT scenarios — years held */}
          <div style={S.card()}>
            <div style={S.sectionTitle}>CGT by Years Held (same gain)</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Years Held", "50% Discount?", "Taxable Gain", "CGT Payable", "Net Gain"].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[0.5, 1, 2, 5, 10, 15].map(yrs => {
                  const disc     = yrs >= 1 ? 0.5 : 0;
                  const gross    = cgt.grossGain > 0 ? cgt.grossGain : 0;
                  const taxable  = gross * (1 - disc);
                  const taxW     = calcIncomeTax(personalIncome + taxable) - calcIncomeTax(personalIncome);
                  const net      = gross - taxW;
                  const isActive = yrs === yearsHeld;
                  return (
                    <tr key={yrs} style={{ background: isActive ? `${C.green}0a` : "transparent", borderBottom: `1px solid ${C.border}18` }}>
                      <td style={{ ...S.td, color: isActive ? C.green : C.mutedHi, fontWeight: isActive ? 700 : 400 }}>{yrs < 1 ? `${yrs * 12} months` : `${yrs} yrs`}{isActive ? " ◀" : ""}</td>
                      <td style={{ ...S.td, color: disc > 0 ? C.green : C.red }}>{disc > 0 ? "Yes ✓" : "No ✗"}</td>
                      <td style={S.td}>{fmt.currency(taxable)}</td>
                      <td style={{ ...S.td, color: C.red }}>{fmt.currency(taxW)}</td>
                      <td style={{ ...S.td, color: C.gold, fontWeight: 600 }}>{fmt.currency(net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 2: RENOVATION ROI ═══ */}
      <SectionDivider title="Renovation ROI Calculator" icon="🔨" />

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
        <div style={S.card()}>
          <div style={S.sectionTitle}>Renovation Details</div>
          <InputField label="Current Property Value" value={currentValue} onChange={setCurrentValue} prefix="$" />
          <InputField label="Renovation Cost" value={renovCost} onChange={setRenovCost} prefix="$" />
          <InputField label="Expected Value Increase" value={valueAddPct} onChange={setValueAddPct} suffix="%" step={0.5}
            note={`Adds ${fmt.currency(reno.valueAdded)} to property value`} />
          <InputField label="Weekly Rent Before" value={weeklyRentBefore} onChange={setWeeklyRentBefore} prefix="$" />
          <InputField label="Weekly Rent After" value={weeklyRentAfter} onChange={setWeeklyRentAfter} prefix="$"
            note={`Extra: ${fmt.currency((weeklyRentAfter - weeklyRentBefore) * 52)}/yr`} />
          <InputField label="% of Reno Financed" value={renovFinancedPct} onChange={setRenovFinancedPct} suffix="%" note="Leave 0 if paying cash" />
          {renovFinancedPct > 0 && (
            <InputField label="Financing Rate" value={financingRate} onChange={setFinancingRate} suffix="% p.a." step={0.25} />
          )}
        </div>

        <div>
          {/* ROI Hero */}
          <div style={{ ...S.card({ marginBottom: 14, background: `${roiColor}0a`, borderColor: `${roiColor}30` }) }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Value-Add ROI</div>
                <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: roiColor }}>{fmt.pct(reno.roi)}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  {fmt.currency(reno.valueAdded)} gain on {fmt.currency(renovCost)} spend
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Value Multiple</div>
                <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: reno.valueMultiple >= 1 ? C.gold : C.red }}>
                  {reno.valueMultiple.toFixed(2)}×
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Value added per $1 spent</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                ["New Property Value",   fmt.currency(reno.newValue),           C.gold],
                ["Annual Rent Gain",     fmt.currency(reno.annualRentGain),      C.green],
                ["Rent Yield on Cost",   fmt.pct(reno.rentYield),               C.green],
                ["Payback Period",       reno.paybackYears ? reno.paybackYears.toFixed(1) + " yrs" : "N/A", reno.paybackYears && reno.paybackYears < 5 ? C.green : C.yellow],
              ].map(([k, v, c]) => (
                <div key={k} style={{ background: C.surface, padding: "10px 12px", borderRadius: 8 }}>
                  <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Reno cost breakdown */}
          <div style={{ ...S.card({ marginBottom: 14 }) }}>
            <div style={S.sectionTitle}>Return Breakdown</div>
            {[
              ["Renovation Cost",                         -renovCost,                         C.red],
              ["Value Added to Property",                 reno.valueAdded,                    C.green],
              ["Net Capital Gain from Reno",              reno.valueAdded - renovCost,        reno.valueAdded > renovCost ? C.gold : C.red, true],
              ["Annual Rent Increase",                    reno.annualRentGain,                C.green],
              renovFinancedPct > 0 ? ["Annual Interest on Financing", -reno.annualInterest, C.red] : null,
              ["Net Annual Rental Benefit",               reno.netAnnualBenefit,              reno.netAnnualBenefit >= 0 ? C.green : C.red, true],
              ["5-Year Total Rental Gain",                reno.netAnnualBenefit * 5,          C.gold],
              ["10-Year Total Return (capital + rent)",   reno.valueAdded - renovCost + reno.netAnnualBenefit * 10, C.gold, true],
            ].filter(Boolean).map(([k, v, c, bold]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}18` }}>
                <span style={{ fontSize: bold ? 12 : 11, color: bold ? C.mutedHi : C.muted, fontWeight: bold ? 600 : 400 }}>{k}</span>
                <span style={{ fontSize: bold ? 13 : 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: bold ? 700 : 400, color: c }}>{fmt.currency(v)}</span>
              </div>
            ))}
          </div>

          {/* Renovation type benchmarks */}
          <div style={S.card()}>
            <div style={S.sectionTitle}>AU Renovation Value-Add Benchmarks</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Renovation Type", "Typical Cost", "Avg Value Add", "Typical ROI"].map(h => (
                    <th key={h} style={{ ...S.th, textAlign: h === "Renovation Type" ? "left" : "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Kitchen update",        "$15k–$40k",  "4–8%",  "100–200%"],
                  ["Bathroom renovation",   "$10k–$25k",  "3–6%",  "90–180%"],
                  ["Fresh paint + flooring","$5k–$15k",   "2–5%",  "150–300%"],
                  ["Landscaping / street",  "$5k–$20k",   "2–4%",  "80–150%"],
                  ["Granny flat / extension","$80k–$150k","8–15%", "60–120%"],
                  ["Full renovation",       "$80k–$200k", "8–15%", "50–100%"],
                ].map(([type, cost, add, roi]) => (
                  <tr key={type} style={{ borderBottom: `1px solid ${C.border}18` }}>
                    <td style={{ padding: "9px 14px", fontSize: 12, color: C.mutedHi, textAlign: "left" }}>{type}</td>
                    <td style={{ ...S.td, color: C.muted }}>{cost}</td>
                    <td style={{ ...S.td, color: C.gold }}>{add}</td>
                    <td style={{ ...S.td, color: C.green, fontWeight: 600 }}>{roi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>
              Benchmarks based on Australian property market data. Actual returns vary significantly by location, property type, and quality of work.
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...S.card({ marginTop: 16, background: `${C.gold}08`, borderColor: `${C.gold}25` }) }}>
        <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>⚖ ATO Reference</div>
        <div style={{ fontSize: 11, color: C.mutedHi, lineHeight: 1.7 }}>
          CGT: ITAA 1997 s.100-10 onwards. 50% discount: s.115-A (assets held &gt;12 months, individual taxpayer). Main residence exemption: s.118-110.
          Cost base includes purchase price, incidental costs (stamp duty, legal), and capital improvements (s.110-25). Capital losses carried forward: s.102-10.
          Always seek qualified tax advice for your specific circumstances.
        </div>
      </div>
    </div>
  );
}

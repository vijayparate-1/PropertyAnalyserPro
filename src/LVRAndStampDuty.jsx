import { useState, useMemo } from "react";

// ── Colour system (matches App.js) ─────────────────────────
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
};

const fmt = {
  currency: v => (v === null || v === undefined || isNaN(v)) ? "—" : "$" + Math.round(Math.abs(v)).toLocaleString("en-AU"),
  pct: (v, dp = 2) => (v === null || isNaN(v)) ? "—" : v.toFixed(dp) + "%",
};

// ── Loan helpers ────────────────────────────────────────────
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
  const pmt = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  return Math.max(0, principal * Math.pow(1 + r, p) - pmt * (Math.pow(1 + r, p) - 1) / r);
}

function estimateLMI(propertyValue, loanAmount) {
  const lvr = (loanAmount / propertyValue) * 100;
  if (lvr <= 80) return 0;
  if (lvr <= 85) return loanAmount * 0.0066;
  if (lvr <= 90) return loanAmount * 0.0132;
  if (lvr <= 95) return loanAmount * 0.0248;
  return loanAmount * 0.0350;
}

// ── Stamp duty calculations ─────────────────────────────────
function calcNSWDuty(p) {
  if (p <= 16000)   return p * 0.0125;
  if (p <= 35000)   return 200 + (p - 16000) * 0.015;
  if (p <= 93000)   return 485 + (p - 35000) * 0.0175;
  if (p <= 351000)  return 1500 + (p - 93000) * 0.035;
  if (p <= 1168000) return 10530 + (p - 351000) * 0.045;
  if (p <= 3505000) return 47295 + (p - 1168000) * 0.055;
  return 175370 + (p - 3505000) * 0.07;
}
function calcVICDuty(p) {
  if (p <= 25000)   return 1.4 * p / 100;
  if (p <= 130000)  return 350 + (p - 25000) * 2.4 / 100;
  if (p <= 960000)  return 2870 + (p - 130000) * 6 / 100;
  if (p <= 2000000) return p * 5.5 / 100;
  return 110000 + (p - 2000000) * 6.5 / 100;
}
function calcQLDDuty(p) {
  if (p <= 5000)    return 0;
  if (p <= 75000)   return (p - 5000) * 0.015;
  if (p <= 540000)  return 1050 + (p - 75000) * 0.035;
  if (p <= 1000000) return 17325 + (p - 540000) * 0.045;
  return 38025 + (p - 1000000) * 0.0575;
}
function calcSADuty(p) {
  if (p <= 12000)   return p * 1 / 100;
  if (p <= 30000)   return 120 + (p - 12000) * 2 / 100;
  if (p <= 50000)   return 480 + (p - 30000) * 3 / 100;
  if (p <= 100000)  return 1080 + (p - 50000) * 3.5 / 100;
  if (p <= 200000)  return 2830 + (p - 100000) * 4 / 100;
  if (p <= 250000)  return 6830 + (p - 200000) * 4.25 / 100;
  if (p <= 300000)  return 8955 + (p - 250000) * 4.75 / 100;
  if (p <= 500000)  return 11330 + (p - 300000) * 5 / 100;
  return 21330 + (p - 500000) * 5.5 / 100;
}
function calcWADuty(p) {
  if (p <= 120000)  return p * 1.9 / 100;
  if (p <= 150000)  return 2280 + (p - 120000) * 2.85 / 100;
  if (p <= 360000)  return 3135 + (p - 150000) * 3.8 / 100;
  if (p <= 725000)  return 11115 + (p - 360000) * 4.75 / 100;
  return 28440 + (p - 725000) * 5.15 / 100;
}
function calcTASDuty(p) {
  if (p <= 3000)    return 50;
  if (p <= 25000)   return 50 + (p - 3000) * 1.75 / 100;
  if (p <= 75000)   return 435 + (p - 25000) * 2.25 / 100;
  if (p <= 200000)  return 1560 + (p - 75000) * 3.5 / 100;
  if (p <= 375000)  return 5935 + (p - 200000) * 4 / 100;
  if (p <= 725000)  return 12935 + (p - 375000) * 4.25 / 100;
  return 27810 + (p - 725000) * 4.5 / 100;
}
function calcACTDuty(p) {
  if (p <= 200000)  return p * 0.6 / 100;
  if (p <= 300000)  return 1200 + (p - 200000) * 2.2 / 100;
  if (p <= 500000)  return 3400 + (p - 300000) * 3.4 / 100;
  if (p <= 750000)  return 10200 + (p - 500000) * 4.32 / 100;
  if (p <= 1000000) return 21000 + (p - 750000) * 5.9 / 100;
  if (p <= 1500000) return 35750 + (p - 1000000) * 6.4 / 100;
  return 67750 + (p - 1500000) * 7.0 / 100;
}
function calcNTDuty(p) {
  const V = p / 1000;
  if (p <= 525000) return Math.max(0, 0.06571441 * V * V + 15 * V);
  return p * 4.95 / 100;
}

function calcStampDuty(price, state, fhb) {
  switch (state) {
    case "NSW":
      if (fhb && price <= 800000) return 0;
      if (fhb && price <= 1000000) return calcNSWDuty(price) * (price - 800000) / 200000;
      return calcNSWDuty(price);
    case "VIC":
      if (fhb && price <= 600000) return 0;
      if (fhb && price <= 750000) return calcVICDuty(price) * (price - 600000) / 150000;
      return calcVICDuty(price);
    case "QLD":
      return fhb && price <= 500000 ? 0 : calcQLDDuty(price);
    case "SA":
      return fhb && price <= 650000 ? 0 : calcSADuty(price);
    case "WA": {
      const base = calcWADuty(price);
      if (fhb && price <= 430000) return 0;
      if (fhb && price <= 530000) return base * (price - 430000) / 100000;
      return base;
    }
    case "TAS": return calcTASDuty(price);
    case "ACT": return fhb && price <= 1000000 ? 0 : calcACTDuty(price);
    case "NT":  return calcNTDuty(price);
    default:    return calcNSWDuty(price);
  }
}

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"];
const STATE_NAMES = {
  NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland",
  SA: "South Australia", WA: "Western Australia",
  TAS: "Tasmania", ACT: "Australian Capital Territory", NT: "Northern Territory",
};
const STATE_SOURCES = {
  NSW: "Revenue NSW — Duties Act 1997. FHB: exemption ≤$800k, concession $800k–$1M.",
  VIC: "SRO Victoria — Duties Act 2000. FHB: exemption ≤$600k, concession $600k–$750k.",
  QLD: "Queensland Revenue Office — Duties Act 2001. FHB: exemption ≤$500k.",
  SA:  "RevenueSA — Stamp Duties Act 1923. FHB concession ≤$650k.",
  WA:  "Revenue WA — Duties Act 2008. FHB: exemption ≤$430k, concession $430k–$530k.",
  TAS: "SRO Tasmania — Duties Act 2001. Standard rates apply.",
  ACT: "ACT Revenue Office — Duties Act 1999. FHB: exemption ≤$1M.",
  NT:  "NT Treasury — Stamp Duty Act. Formula-based calculation.",
};

// ── Small shared components ─────────────────────────────────
function InputField({ label, value, onChange, prefix, suffix, note }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={S.label}>{label}</div>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {prefix && <span style={{ position: "absolute", left: 10, fontSize: 12, color: C.muted, pointerEvents: "none", fontFamily: "'JetBrains Mono', monospace" }}>{prefix}</span>}
        <input type="number" value={value}
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
        <div onClick={() => onChange(!value)} style={{
          width: 40, height: 22, borderRadius: 11, cursor: "pointer",
          background: value ? C.green : C.border, position: "relative",
          transition: "background 0.2s", flexShrink: 0, marginLeft: 12,
        }}>
          <div style={{ position: "absolute", top: 3, left: value ? 21 : 3, width: 16, height: 16,
            borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
        </div>
      </div>
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

// LVR Gauge arc
function LVRGauge({ lvr }) {
  const clamped = Math.min(100, Math.max(0, lvr));
  const color = lvr <= 60 ? C.green : lvr <= 80 ? C.yellow : lvr <= 90 ? C.gold : C.red;
  const angle = (clamped / 100) * 180;
  const r = 70, cx = 90, cy = 90;
  const toRad = deg => (deg * Math.PI) / 180;
  const arcX = cx + r * Math.cos(toRad(180 - angle));
  const arcY = cy - r * Math.sin(toRad(180 - angle));
  const largeArc = angle > 90 ? 1 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={180} height={105} viewBox="0 0 180 105">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={C.border} strokeWidth={14} strokeLinecap="round" />
        {clamped > 0 && (
          <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${arcX} ${arcY}`}
            fill="none" stroke={color} strokeWidth={14} strokeLinecap="round"
            style={{ transition: "all 0.4s ease" }} />
        )}
        {/* Threshold dots */}
        {[
          { pct: 60, col: C.green },
          { pct: 80, col: C.yellow },
          { pct: 90, col: C.gold },
        ].map(m => {
          const a = (m.pct / 100) * 180;
          const mx = cx + (r + 2) * Math.cos(toRad(180 - a));
          const my = cy - (r + 2) * Math.sin(toRad(180 - a));
          return <circle key={m.pct} cx={mx} cy={my} r={4} fill={m.col} opacity={0.9} />;
        })}
        <text x={cx} y={cy - 8} textAnchor="middle" fill={color}
          style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
          {fmt.pct(clamped, 1)}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill={C.muted}
          style={{ fontSize: 9, fontFamily: "'Sora', sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          LVR
        </text>
      </svg>
      <div style={{ display: "flex", gap: 10, marginTop: -4 }}>
        {[{ c: C.green, l: "≤60%" }, { c: C.yellow, l: "≤80%" }, { c: C.red, l: ">80%" }].map(m => (
          <div key={m.l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: m.c }} />
            <span style={{ fontSize: 9, color: C.muted }}>{m.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section divider ─────────────────────────────────────────
function SectionDivider({ title, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "28px 0 18px" }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMBINED COMPONENT
// ═══════════════════════════════════════════════════════════
export default function LVRAndStampDuty() {

  // ── Shared inputs ──────────────────────────────────────
  const [propertyValue, setPropertyValue] = useState(750000);

  // ── LVR inputs ─────────────────────────────────────────
  const [loanAmount, setLoanAmount]     = useState(600000);
  const [interestRate, setInterestRate] = useState(6);
  const [loanTerm, setLoanTerm]         = useState(30);
  const [growthRate, setGrowthRate]     = useState(4);

  // ── Stamp duty inputs ──────────────────────────────────
  const [selectedState, setSelectedState] = useState("NSW");
  const [fhb, setFhb]                     = useState(false);
  const [showInstalment, setShowInstalment] = useState(false);

  // ── LVR calculations ───────────────────────────────────
  const lvr          = loanAmount / propertyValue * 100;
  const deposit      = propertyValue - loanAmount;
  const depositPct   = deposit / propertyValue * 100;
  const lmi          = estimateLMI(propertyValue, loanAmount);
  const monthly      = calcMonthlyRepayment(loanAmount, interestRate / 100, loanTerm);
  const lvrColor     = lvr <= 60 ? C.green : lvr <= 80 ? C.yellow : lvr <= 90 ? C.gold : C.red;
  const extraFor80   = Math.max(0, loanAmount - propertyValue * 0.80);

  const lvrProjection = useMemo(() => Array.from({ length: loanTerm }, (_, i) => {
    const yr      = i + 1;
    const balance = calcLoanBalance(loanAmount, interestRate / 100, loanTerm, yr);
    const propVal = propertyValue * Math.pow(1 + growthRate / 100, yr);
    const lvrYr   = (balance / propVal) * 100;
    return { yr, balance, propVal, lvrYr, equity: propVal - balance, equityPct: ((propVal - balance) / propVal) * 100 };
  }), [loanAmount, interestRate, loanTerm, propertyValue, growthRate]);

  const yr80 = lvrProjection.find(r => r.lvrYr <= 80);
  const yr60 = lvrProjection.find(r => r.lvrYr <= 60);

  // ── Stamp duty calculations ────────────────────────────
  const duty = useMemo(() => calcStampDuty(propertyValue, selectedState, fhb), [propertyValue, selectedState, fhb]);

  const allStates = useMemo(() => STATES.map(s => {
    const d = calcStampDuty(propertyValue, s, fhb);
    return { state: s, duty: d, pct: d / propertyValue * 100 };
  }).sort((a, b) => a.duty - b.duty), [propertyValue, fhb]);

  const cheapest    = allStates[0];
  const saving      = duty - cheapest.duty;
  const dutyColor   = duty === 0 ? C.green : duty < propertyValue * 0.03 ? C.yellow : C.red;
  const annualInst  = duty / 5;
  const monthlyInst = duty / 60;

  return (
    <div className="tab-content" style={{ fontFamily: "'Sora', sans-serif", color: C.text }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>LVR Tracker & Stamp Duty Calculator</h2>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
            Loan-to-Value Ratio · LMI estimator · All 8 states stamp duty · FHB concessions
          </p>
        </div>
      </div>

      {/* ── Shared input: Property Value ── */}
      <div style={{ ...S.card({ marginBottom: 20, background: `${C.accent}0a`, borderColor: `${C.accent}30` }) }}>
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "center" }}>
          <InputField label="Property Value (shared by both sections)" value={propertyValue}
            onChange={setPropertyValue} prefix="$"
            note="Changing this updates both LVR Tracker and Stamp Duty Calculator below" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <KPICard label="Property Value" value={fmt.currency(propertyValue)} color={C.accent} />
            <KPICard label="Current LVR" value={fmt.pct(lvr)} color={lvrColor}
              badge={lvr > 80 ? { text: "LMI APPLIES", bg: `${C.red}20`, color: C.red } : { text: "NO LMI", bg: `${C.green}20`, color: C.green }} />
            <KPICard label={`Stamp Duty — ${selectedState}`} value={duty === 0 ? "FREE ✓" : fmt.currency(duty)} color={dutyColor}
              sub={duty === 0 ? "FHB exemption" : fmt.pct(duty / propertyValue * 100) + " of price"} />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          SECTION 1 — LVR TRACKER
      ════════════════════════════════════════════════════ */}
      <SectionDivider title="LVR Tracker" icon="📉" />

      {/* LVR alert */}
      {lvr > 80 ? (
        <div style={{ background: `${C.red}12`, border: `1px solid ${C.red}35`, borderRadius: 10, padding: "13px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ fontSize: 12, color: C.mutedHi }}>
            <strong style={{ color: C.red }}>LVR above 80% — LMI applies.</strong>{" "}
            Estimated LMI: <strong style={{ color: C.gold }}>{fmt.currency(lmi)}</strong>.
            Reduce loan by <strong style={{ color: C.yellow }}>{fmt.currency(extraFor80)}</strong> to reach the 80% threshold.
            {yr80 && ` At ${growthRate}% growth, you'll cross 80% in Year ${yr80.yr}.`}
          </div>
        </div>
      ) : (
        <div style={{ background: `${C.green}0d`, border: `1px solid ${C.green}30`, borderRadius: 10, padding: "13px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <div style={{ fontSize: 12, color: C.mutedHi }}>
            <strong style={{ color: C.green }}>LVR below 80% — No LMI required.</strong>{" "}
            You have <strong style={{ color: C.greenFg }}>{fmt.currency(deposit)}</strong> equity ({fmt.pct(depositPct, 1)}).
            {yr60 && ` At ${growthRate}% growth, you'll reach the ideal 60% LVR in Year ${yr60.yr}.`}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, marginBottom: 20 }}>

        {/* LVR inputs */}
        <div>
          <div style={S.card()}>
            <div style={S.sectionTitle}>Loan Details</div>
            <InputField label="Loan Amount" value={loanAmount} onChange={setLoanAmount} prefix="$"
              note={`Deposit: ${fmt.currency(deposit)} (${fmt.pct(depositPct, 1)})`} />
            <InputField label="Interest Rate" value={interestRate} onChange={setInterestRate} suffix="% p.a." />
            <InputField label="Loan Term" value={loanTerm} onChange={setLoanTerm} suffix="years" />
            <InputField label="Capital Growth Rate" value={growthRate} onChange={setGrowthRate} suffix="% p.a."
              note="Used to project future property value" />

            {/* LMI detail if applicable */}
            {lvr > 80 && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 10 }}>LMI Estimate</div>
                {[
                  ["LVR",              fmt.pct(lvr)],
                  ["LMI Rate",         lvr <= 85 ? "0.66%" : lvr <= 90 ? "1.32%" : lvr <= 95 ? "2.48%" : "3.50%"],
                  ["Estimated LMI",    fmt.currency(lmi)],
                  ["LMI Capitalised",  fmt.currency(lmi * 1.1)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}18` }}>
                    <span style={{ fontSize: 11, color: C.muted }}>{k}</span>
                    <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: C.text }}>{v}</span>
                  </div>
                ))}
                <div style={{ fontSize: 9, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>
                  Based on Genworth/QBE tiered rates. Actual LMI varies by lender.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LVR right panel */}
        <div>
          {/* Gauge + KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, marginBottom: 14 }}>
            <div style={S.card({ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 24px" })}>
              <LVRGauge lvr={lvr} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KPICard label="Current LVR"        value={fmt.pct(lvr)}            color={lvrColor}
                badge={lvr > 80 ? { text: "LMI APPLIES", bg: `${C.red}20`, color: C.red } : { text: "NO LMI", bg: `${C.green}20`, color: C.green }} />
              <KPICard label="Equity"              value={fmt.currency(deposit)}   color={C.gold}   sub={fmt.pct(depositPct) + " of property"} />
              <KPICard label="Monthly Repayment"   value={fmt.currency(monthly)}   color={C.accent} sub="Principal & Interest" />
              <KPICard label="LMI Cost"            value={lvr > 80 ? fmt.currency(lmi) : "$0"} color={lvr > 80 ? C.red : C.green}
                sub={lvr > 80 ? "Estimated premium" : "Below 80% threshold"} />
            </div>
          </div>

          {/* Milestones */}
          <div style={S.card({ marginBottom: 14 })}>
            <div style={S.sectionTitle}>LVR Milestones</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { threshold: 90, label: "Below 90%", note: "Lower LMI tier",   color: C.gold },
                { threshold: 80, label: "Below 80%", note: "No LMI required",  color: C.yellow },
                { threshold: 60, label: "Below 60%", note: "Ideal LVR",        color: C.green },
              ].map(m => {
                const reached     = lvr <= m.threshold;
                const yearReached = lvrProjection.find(r => r.lvrYr <= m.threshold);
                return (
                  <div key={m.threshold} style={{
                    background: reached ? `${m.color}15` : C.surface,
                    border: `1px solid ${reached ? m.color + "40" : C.border}`,
                    borderRadius: 8, padding: "12px 14px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{reached ? "✅" : "🔒"}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: reached ? m.color : C.muted }}>{m.label}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{m.note}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: reached ? m.color : C.mutedHi, marginTop: 6 }}>
                      {reached ? "Achieved now" : yearReached ? `Year ${yearReached.yr}` : "Beyond term"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LVR bar chart over time */}
          <div style={S.card()}>
            <div style={S.sectionTitle}>LVR Progress Over Time</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 72, marginBottom: 8 }}>
              {lvrProjection
                .filter((_, i) => i % Math.ceil(loanTerm / 20) === 0 || i === loanTerm - 1)
                .map(r => {
                  const h   = Math.max(3, (r.lvrYr / 100) * 65);
                  const col = r.lvrYr <= 60 ? C.green : r.lvrYr <= 80 ? C.yellow : r.lvrYr <= 90 ? C.gold : C.red;
                  return (
                    <div key={r.yr} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <div style={{ width: "100%", height: h, background: col, borderRadius: "3px 3px 0 0", opacity: 0.85 }} />
                      <span style={{ fontSize: 8, color: C.muted }}>{r.yr}</span>
                    </div>
                  );
                })}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {[{ c: C.red, l: ">90%" }, { c: C.gold, l: "80–90%" }, { c: C.yellow, l: "60–80%" }, { c: C.green, l: "<60%" }].map(({ c, l }) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 10, height: 10, background: c, borderRadius: 2 }} />
                  <span style={{ fontSize: 10, color: C.muted }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* LVR projection table */}
      <div style={{ ...S.card({ padding: 0 }), marginBottom: 8 }}>
        <div style={{ ...S.sectionTitle, padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}` }}>
          Year-by-Year LVR Projection
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Year", "Property Value", "Loan Balance", "LVR", "Equity", "Equity %"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.08em", color: C.muted, background: C.surface, textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lvrProjection.map(r => {
                const col   = r.lvrYr <= 60 ? C.green : r.lvrYr <= 80 ? C.yellow : r.lvrYr <= 90 ? C.gold : C.red;
                const isKey = [5, 10, 15, 20, 25, 30].includes(r.yr);
                return (
                  <tr key={r.yr} style={{ background: isKey ? `${C.surface}80` : "transparent", borderBottom: `1px solid ${C.border}18` }}>
                    <td style={{ padding: "8px 14px", fontSize: 12, textAlign: "right", fontWeight: isKey ? 700 : 400, color: isKey ? C.text : C.muted, fontFamily: "'JetBrains Mono', monospace" }}>{r.yr}</td>
                    <td style={{ padding: "8px 14px", fontSize: 12, textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: C.text }}>{fmt.currency(r.propVal)}</td>
                    <td style={{ padding: "8px 14px", fontSize: 12, textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: C.muted }}>{fmt.currency(r.balance)}</td>
                    <td style={{ padding: "8px 14px", fontSize: 12, textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: col }}>{fmt.pct(r.lvrYr)}</td>
                    <td style={{ padding: "8px 14px", fontSize: 12, textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: C.gold }}>{fmt.currency(r.equity)}</td>
                    <td style={{ padding: "8px 14px", fontSize: 12, textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: C.green }}>{fmt.pct(r.equityPct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          SECTION 2 — STAMP DUTY CALCULATOR
      ════════════════════════════════════════════════════ */}
      <SectionDivider title="Stamp Duty Calculator" icon="🏛️" />

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>

        {/* Stamp duty inputs */}
        <div>
          <div style={{ ...S.card({ marginBottom: 14 }) }}>
            <div style={S.sectionTitle}>Options</div>

            {/* State buttons */}
            <div style={{ marginBottom: 14 }}>
              <div style={S.label}>State</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {STATES.map(s => (
                  <button key={s} onClick={() => setSelectedState(s)} style={{
                    padding: "7px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.15s",
                    background: selectedState === s ? `${C.green}20` : C.surface,
                    border: `1px solid ${selectedState === s ? C.green : C.border}`,
                    color: selectedState === s ? C.green : C.muted,
                  }}>{s}</button>
                ))}
              </div>
            </div>

            <Toggle label="First Home Buyer" value={fhb} onChange={setFhb} note="Apply state FHB concessions" />
            <Toggle label="Show Instalment Plan" value={showInstalment} onChange={setShowInstalment} note="5-year payment breakdown" />
          </div>

          {/* Source note */}
          <div style={{ ...S.card({ background: `${C.gold}08`, borderColor: `${C.gold}25` }) }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>⚖ Source</div>
            <div style={{ fontSize: 11, color: C.mutedHi, lineHeight: 1.7 }}>{STATE_SOURCES[selectedState]}</div>
          </div>
        </div>

        {/* Stamp duty results */}
        <div>
          {/* Hero result */}
          <div style={{ ...S.card({ marginBottom: 14, background: duty === 0 ? `${C.green}0d` : C.card, borderColor: duty === 0 ? `${C.green}40` : C.border }) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 6 }}>
                  Stamp Duty — {STATE_NAMES[selectedState]}
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: dutyColor, letterSpacing: "-0.02em" }}>
                  {duty === 0 ? "FREE ✓" : fmt.currency(duty)}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  {fmt.pct(duty / propertyValue * 100)} of {fmt.currency(propertyValue)}
                  {fhb ? " · FHB concession applied" : " · Standard rate"}
                </div>
                {duty === 0 && (
                  <div style={{ fontSize: 12, color: C.green, marginTop: 6, fontWeight: 600 }}>
                    Full FHB exemption at this price point
                  </div>
                )}
              </div>
              {saving > 100 && selectedState !== cheapest.state && (
                <div style={{ background: `${C.red}15`, border: `1px solid ${C.red}30`, borderRadius: 8, padding: "10px 14px", textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Extra vs cheapest</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: C.red, marginTop: 4 }}>+{fmt.currency(saving)}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>vs {cheapest.state} ({fmt.currency(cheapest.duty)})</div>
                </div>
              )}
            </div>
          </div>

          {/* Instalment plan */}
          {showInstalment && (
            <div style={{ ...S.card({ marginBottom: 14 }) }}>
              <div style={S.sectionTitle}>Instalment / Payment Breakdown</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
                {[
                  ["Lump Sum",        fmt.currency(duty),       C.gold],
                  ["Annual (5 yrs)",  fmt.currency(annualInst), C.yellow],
                  ["Monthly (5 yrs)", fmt.currency(monthlyInst),C.green],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ background: C.surface, padding: "12px 14px", borderRadius: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{k}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: c }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
                NSW allows 5-year deferral for off-the-plan purchases. QLD allows instalments for eligible buyers.
                Confirm instalment availability with your solicitor and state revenue office.
              </div>
            </div>
          )}

          {/* All states table */}
          <div style={S.card({ padding: 0 })}>
            <div style={{ ...S.sectionTitle, padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}` }}>
              All 8 States — {fmt.currency(propertyValue)}{fhb ? " · FHB" : ""}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Rank", "State", "Stamp Duty", "% of Price", ""].map(h => (
                    <th key={h} style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.08em", color: C.muted, background: C.surface,
                      textAlign: h === "State" || h === "Rank" ? "left" : "right", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allStates.map((row, idx) => {
                  const isCurrent  = row.state === selectedState;
                  const barWidth   = allStates[allStates.length - 1].duty > 0 ? (row.duty / allStates[allStates.length - 1].duty) * 100 : 0;
                  const col        = row.duty === 0 ? C.green : idx < 2 ? C.green : idx < 5 ? C.yellow : C.red;
                  return (
                    <tr key={row.state} style={{
                      background: isCurrent ? `${C.green}0d` : idx % 2 === 0 ? "transparent" : `${C.surface}40`,
                      borderBottom: `1px solid ${C.border}18`,
                      outline: isCurrent ? `1px solid ${C.green}30` : "none",
                    }}>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: C.muted }}>
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: isCurrent ? C.green : C.text }}>{row.state}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{STATE_NAMES[row.state]}</div>
                        {isCurrent && <div style={{ fontSize: 9, color: C.green, fontWeight: 700, letterSpacing: "0.06em", marginTop: 2 }}>▶ SELECTED</div>}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: col }}>
                        {row.duty === 0 ? <span style={{ color: C.green }}>FREE ✓</span> : fmt.currency(row.duty)}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.muted }}>
                        {fmt.pct(row.pct)}
                      </td>
                      <td style={{ padding: "10px 20px", minWidth: 120 }}>
                        <div style={{ height: 8, background: C.surface, borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${barWidth}%`, background: col, borderRadius: 4, transition: "width 0.4s" }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, background: `${C.green}08` }}>
              <div style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>
                🏆 Cheapest: <strong>{STATE_NAMES[cheapest.state]}</strong> — {fmt.currency(cheapest.duty)}
                {saving > 100 && selectedState !== cheapest.state && (
                  <span style={{ color: C.muted, fontWeight: 400 }}> · You'd save {fmt.currency(saving)} vs {selectedState}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useCallback, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nigxjhhsyxcywtjwhbjp.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZ3hqaGhzeXhjeXd0andoYmpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMDMxNDUsImV4cCI6MjA4ODY3OTE0NX0.FDoOPCm9L44pJy_EnVd_7MTdJTtJVyddQqdMpwuzmNA';
const db = createClient(SUPABASE_URL, SUPABASE_ANON);
const APP_PASSCODE = '2025Property#';
import RentalYieldCalculator from "./RentalYieldCalculator";
import LVRAndStampDuty from "./LVRAndStampDuty";
import BorrowingMortgage from "./BorrowingMortgage";
import CGTAndRenovation from "./CGTAndRenovation";
import OffsetAndStressTest from "./OffsetAndStressTest";
import RentVsBuyPortfolio from "./RentVsBuyPortfolio";
import PortfolioView from "./PortfolioView";

/* ═══════════════════════════════════════════════════════════════
   AUSTRALIAN PROPERTY INVESTMENT ANALYSER
   ATO FY2025-26 | All states stamp duty | IRR/DCF/NPV
   ═══════════════════════════════════════════════════════════════ */

// ── Google Fonts ──────────────────────────────────────────────
const FONT_LINK = document.createElement("link");
FONT_LINK.rel = "stylesheet";
FONT_LINK.href = "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap";
document.head.appendChild(FONT_LINK);

// ── Colour system ─────────────────────────────────────────────
const C = {
  bg:       "#070d1a",
  surface:  "#0d1829",
  card:     "#111e33",
  border:   "#1a2d4a",
  borderHi: "#1e3a5f",
  green:    "#00c896",
  greenDim: "#00a878",
  greenFg:  "#00ffbc",
  gold:     "#f5a623",
  red:      "#ff4d6a",
  redDim:   "#cc2944",
  yellow:   "#ffd666",
  text:     "#e8eef8",
  muted:    "#6b8aaa",
  mutedHi:  "#8aa5c2",
  navy:     "#0a1628",
  accent:   "#2563eb",
};

// ── Global styles ─────────────────────────────────────────────
const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; background: ${C.bg}; color: ${C.text}; font-family: 'Sora', sans-serif; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: ${C.surface}; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: ${C.borderHi}; }
  input, select { font-family: 'Sora', sans-serif; }
  input[type=number] { -moz-appearance: textfield; }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
  @keyframes slideIn { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:none; } }
  .tab-content { animation: fadeIn 0.2s ease; }
  .kpi-card { transition: border-color 0.2s, transform 0.15s; }
  .kpi-card:hover { border-color: ${C.borderHi} !important; transform: translateY(-1px); }
  @media print {
    .no-print { display: none !important; }
    body { background: white !important; color: black !important; }
  }
`;
document.head.appendChild(style);

// ═══════════════════════════════════════════════════════════════
// CALCULATION ENGINE
// ═══════════════════════════════════════════════════════════════

// ATO FY2025-26 tax brackets
function calcMarginalRate(income) {
  if (income <= 18200)   return 0;
  if (income <= 45000)   return 0.16;
  if (income <= 135000)  return 0.30;
  if (income <= 190000)  return 0.37;
  return 0.45;
}
function calcIncomeTax(income) {
  if (income <= 18200)   return 0;
  if (income <= 45000)   return (income - 18200) * 0.16;
  if (income <= 135000)  return 4288 + (income - 45000) * 0.30;
  if (income <= 190000)  return 31288 + (income - 135000) * 0.37;
  return 51638 + (income - 190000) * 0.45;
}

// Stamp duty — state-specific formulas
function calcStampDuty(price, state, fhb) {
  const p = price;
  let duty = 0;
  switch (state) {
    case "NSW":
      if (fhb && p <= 800000) return 0;
      if (fhb && p <= 1000000) { duty = calcNSWDuty(p); return duty * (1000000 - p) / 200000; }
      return calcNSWDuty(p);
    case "VIC":
      if (fhb && p <= 600000) return 0;
      if (fhb && p <= 750000) return calcVICDuty(p) * (p - 600000) / 150000;
      return calcVICDuty(p);
    case "QLD":
      if (fhb && p <= 500000) return 0;
      return calcQLDDuty(p);
    case "SA":  return calcSADuty(p, fhb);
    case "WA":  return calcWADuty(p, fhb);
    case "TAS": return calcTASDuty(p);
    case "ACT": return calcACTDuty(p, fhb);
    case "NT":  return calcNTDuty(p);
    default:    return calcNSWDuty(p);
  }
}

function calcNSWDuty(p) {
  if (p <= 16000)    return p * 0.0125;
  if (p <= 35000)    return 200 + (p - 16000) * 0.015;
  if (p <= 93000)    return 485 + (p - 35000) * 0.0175;
  if (p <= 351000)   return 1500 + (p - 93000) * 0.035;
  if (p <= 1168000)  return 10530 + (p - 351000) * 0.045;
  if (p <= 3505000)  return 47295 + (p - 1168000) * 0.055;
  return 175370 + (p - 3505000) * 0.07;
}

function calcVICDuty(p) {
  if (p <= 25000)    return p * 0.014 * (Math.min(p,25000)/25000) * 0.5 + p * 0.01 * 0.5;
  // Simplified VIC sliding scale
  if (p <= 130000)   return 2870 + (p - 130000) * 0.05;
  if (p <= 960000)   return 0 + p * 0.055;
  if (p <= 2000000)  return p * 0.06;
  return p * 0.065;
}

function calcVICDutyProper(p) {
  if (p <= 25000)     return 1.4 * p / 100;
  if (p <= 130000)    return 350 + (p - 25000) * 2.4 / 100;
  if (p <= 960000)    return 2870 + (p - 130000) * 6 / 100;
  if (p <= 2000000)   return p * 5.5 / 100;
  return 110000 + (p - 2000000) * 6.5 / 100;
}

function calcQLDDuty(p) {
  if (p <= 5000)      return 0;
  if (p <= 75000)     return (p - 5000) * 0.015;
  if (p <= 540000)    return 1050 + (p - 75000) * 0.035;
  if (p <= 1000000)   return 17325 + (p - 540000) * 0.045;
  return 38025 + (p - 1000000) * 0.0575;
}

function calcSADuty(p, fhb) {
  if (fhb && p <= 650000) return 0;
  if (p <= 12000)     return p * 1 / 100;
  if (p <= 30000)     return 120 + (p - 12000) * 2 / 100;
  if (p <= 50000)     return 480 + (p - 30000) * 3 / 100;
  if (p <= 100000)    return 1080 + (p - 50000) * 3.5 / 100;
  if (p <= 200000)    return 2830 + (p - 100000) * 4 / 100;
  if (p <= 250000)    return 6830 + (p - 200000) * 4.25 / 100;
  if (p <= 300000)    return 8955 + (p - 250000) * 4.75 / 100;
  if (p <= 500000)    return 11330 + (p - 300000) * 5 / 100;
  return 21330 + (p - 500000) * 5.5 / 100;
}

function calcWADuty(p, fhb) {
  const base = (() => {
    if (p <= 120000)   return p * 1.9 / 100;
    if (p <= 150000)   return 2280 + (p - 120000) * 2.85 / 100;
    if (p <= 360000)   return 3135 + (p - 150000) * 3.8 / 100;
    if (p <= 725000)   return 11115 + (p - 360000) * 4.75 / 100;
    return 28440 + (p - 725000) * 5.15 / 100;
  })();
  if (fhb && p <= 430000) return 0;
  if (fhb && p <= 530000) return base * (p - 430000) / 100000;
  return base;
}

function calcTASDuty(p) {
  if (p <= 3000)      return 50;
  if (p <= 25000)     return 50 + (p - 3000) * 1.75 / 100;
  if (p <= 75000)     return 435 + (p - 25000) * 2.25 / 100;
  if (p <= 200000)    return 1560 + (p - 75000) * 3.5 / 100;
  if (p <= 375000)    return 5935 + (p - 200000) * 4 / 100;
  if (p <= 725000)    return 12935 + (p - 375000) * 4.25 / 100;
  return 27810 + (p - 725000) * 4.5 / 100;
}

function calcACTDuty(p, fhb) {
  if (fhb && p <= 1000000) return 0;
  if (p <= 200000)   return p * 0.6 / 100;
  if (p <= 300000)   return 1200 + (p - 200000) * 2.2 / 100;
  if (p <= 500000)   return 3400 + (p - 300000) * 3.4 / 100;
  if (p <= 750000)   return 10200 + (p - 500000) * 4.32 / 100;
  if (p <= 1000000)  return 21000 + (p - 750000) * 5.9 / 100;
  if (p <= 1500000)  return 35750 + (p - 1000000) * 6.4 / 100;
  return 67750 + (p - 1500000) * 7.0 / 100;
}

function calcNTDuty(p) {
  // NT uses a formula: D = (0.06571441 × V² + 15V) / 1000, where V = price/1000
  const V = p / 1000;
  if (p <= 525000) return Math.max(0, (0.06571441 * V * V + 15 * V) / 1000 * 1000);
  return p * 4.95 / 100;
}

// Monthly mortgage repayment (P&I)
function calcMonthlyRepayment(principal, annualRate, termYears) {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

// Loan balance after N years
function calcLoanBalance(principal, annualRate, termYears, yearsElapsed) {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  const n = termYears * 12;
  const p = yearsElapsed * 12;
  if (r === 0) return principal * (1 - p / n);
  const pmt = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  return principal * Math.pow(1 + r, p) - pmt * (Math.pow(1 + r, p) - 1) / r;
}

// Annual interest for year N (approximation via mid-year balance)
function calcAnnualInterest(principal, annualRate, termYears, year) {
  const balStart = calcLoanBalance(principal, annualRate, termYears, year - 1);
  const balEnd   = calcLoanBalance(principal, annualRate, termYears, year);
  const annualPmt = calcMonthlyRepayment(principal, annualRate, termYears) * 12;
  return Math.max(0, annualPmt - (balStart - balEnd));
}

// IRR via Newton-Raphson
function calcIRR(cashflows, guess = 0.1) {
  let rate = guess;
  for (let i = 0; i < 1000; i++) {
    let npv = 0, dnpv = 0;
    for (let t = 0; t < cashflows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npv  += cashflows[t] / denom;
      dnpv -= t * cashflows[t] / (denom * (1 + rate));
    }
    if (Math.abs(dnpv) < 1e-10) break;
    const newRate = rate - npv / dnpv;
    if (Math.abs(newRate - rate) < 1e-8) { rate = newRate; break; }
    rate = newRate;
  }
  return isFinite(rate) ? rate : null;
}

// NPV
function calcNPV(cashflows, rate) {
  return cashflows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + rate, t), 0);
}

// 10-year projection
function build10YearProjection(inputs, overrides = {}) {
  const {
    purchasePrice, depositPct, interestRate, loanTerm,
    weeklyRent, expensesPct, capitalGrowth,
    depreciation, cashInvested
  } = { ...inputs, ...overrides };

  const loan = purchasePrice * (1 - depositPct / 100);
  const annualMortgage = calcMonthlyRepayment(loan, interestRate / 100, loanTerm) * 12;
  const rows = [];

  for (let yr = 1; yr <= 10; yr++) {
    const propValue = purchasePrice * Math.pow(1 + capitalGrowth / 100, yr);
    const grossRent = weeklyRent * 52 * Math.pow(1.03, yr - 1);
    const expenses  = grossRent * (expensesPct / 100);
    const netRent   = grossRent - expenses;
    const loanBal   = calcLoanBalance(loan, interestRate / 100, loanTerm, yr);
    const equity    = propValue - loanBal;
    const netCashFlow = netRent - annualMortgage;
    const prevCumCF = rows.length > 0 ? rows[rows.length - 1].cumCashFlow : 0;
    const cumCashFlow = prevCumCF + netCashFlow;
    const totalReturn = equity + cumCashFlow - cashInvested;
    rows.push({ yr, propValue, grossRent, expenses, annualMortgage, netCashFlow, cumCashFlow, loanBal, equity, totalReturn });
  }
  return rows;
}

// Compute IRR for a set of inputs
function computeIRR(inputs, overrides = {}) {
  const merged = { ...inputs, ...overrides };
  const { purchasePrice, depositPct, interestRate, loanTerm, weeklyRent, expensesPct, capitalGrowth, cashInvested, stampDuty, legalFees, inspectionFee, loanEstFee } = merged;
  const loan = purchasePrice * (1 - depositPct / 100);
  const annualMortgage = calcMonthlyRepayment(loan, interestRate / 100, loanTerm) * 12;

  const initialCash = -(cashInvested || (purchasePrice * depositPct / 100 + stampDuty + (legalFees || 2000) + (inspectionFee || 600) + (loanEstFee || 800)));
  const cfs = [initialCash];

  for (let yr = 1; yr <= 10; yr++) {
    const grossRent = (weeklyRent * 52) * Math.pow(1.03, yr - 1);
    const expenses  = grossRent * (expensesPct / 100);
    const netCF     = grossRent - expenses - annualMortgage;
    if (yr < 10) { cfs.push(netCF); }
    else {
      const saleProceeds = purchasePrice * Math.pow(1 + capitalGrowth / 100, 10);
      const loanBal      = calcLoanBalance(loan, interestRate / 100, loanTerm, 10);
      cfs.push(netCF + saleProceeds - loanBal);
    }
  }
  return calcIRR(cfs);
}

// Net yield for sensitivity
function computeNetYield(inputs, overrides = {}) {
  const merged = { ...inputs, ...overrides };
  const { purchasePrice, weeklyRent, expensesPct } = merged;
  if (!purchasePrice) return 0;
  const grossRent = weeklyRent * 52;
  const netRent = grossRent * (1 - expensesPct / 100);
  return (netRent / purchasePrice) * 100;
}

// ═══════════════════════════════════════════════════════════════
// FORMATTING HELPERS
// ═══════════════════════════════════════════════════════════════
const fmt = {
  currency: v => {
    if (v === null || v === undefined || isNaN(v)) return "—";
    const abs = Math.abs(v);
    let s;
    if (abs >= 1e6) s = "$" + (abs / 1e6).toFixed(2) + "M";
    else if (abs >= 1e3) s = "$" + Math.round(abs).toLocaleString("en-AU");
    else s = "$" + Math.round(abs).toLocaleString("en-AU");
    return v < 0 ? `-${s}` : s;
  },
  pct: (v, dp = 2) => v === null || isNaN(v) ? "—" : v.toFixed(dp) + "%",
  num: (v, dp = 2) => v === null || isNaN(v) ? "—" : Number(v.toFixed(dp)).toLocaleString("en-AU"),
  x:   v => v === null || isNaN(v) ? "—" : v.toFixed(2) + "×",
};

// ═══════════════════════════════════════════════════════════════
// STYLE HELPERS
// ═══════════════════════════════════════════════════════════════
const S = {
  card: (extra = {}) => ({
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "20px 22px",
    ...extra,
  }),
  label: { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, marginBottom: 5 },
  input: {
    width: "100%", background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 6, padding: "8px 12px", color: C.text, fontSize: 13,
    fontFamily: "'JetBrains Mono', monospace", outline: "none",
    transition: "border-color 0.15s",
  },
  select: {
    width: "100%", background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 6, padding: "8px 12px", color: C.text, fontSize: 13,
    fontFamily: "'Sora', sans-serif", outline: "none", cursor: "pointer",
    appearance: "none", transition: "border-color 0.15s",
  },
  sectionTitle: {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.12em", color: C.muted, marginBottom: 14,
    paddingBottom: 8, borderBottom: `1px solid ${C.border}`,
  },
  th: {
    padding: "10px 14px", fontSize: 10, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.08em",
    color: C.muted, background: C.surface, textAlign: "right",
    whiteSpace: "nowrap",
  },
  td: { padding: "9px 14px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", textAlign: "right", borderBottom: `1px solid ${C.border}10` },
};

// ═══════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════════

function InputField({ label, value, onChange, type = "number", prefix, suffix, note, min, max, step, readOnly }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={S.label}>{label}</div>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {prefix && <span style={{ position: "absolute", left: 10, fontSize: 12, color: C.muted, pointerEvents: "none", fontFamily: "'JetBrains Mono', monospace" }}>{prefix}</span>}
        <input
          type={type} value={value}
          onChange={e => onChange && onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          min={min} max={max} step={step}
          readOnly={readOnly}
          style={{
            ...S.input,
            paddingLeft: prefix ? 22 : 12,
            paddingRight: suffix ? 30 : 12,
            borderColor: focused ? C.green : C.border,
            opacity: readOnly ? 0.7 : 1,
            cursor: readOnly ? "default" : "auto",
          }}
        />
        {suffix && <span style={{ position: "absolute", right: 10, fontSize: 11, color: C.muted, pointerEvents: "none" }}>{suffix}</span>}
      </div>
      {note && <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{note}</div>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, note }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={S.label}>{label}</div>
      <div style={{ position: "relative" }}>
        <select value={value} onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ ...S.select, borderColor: focused ? C.green : C.border }}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.muted, fontSize: 10 }}>▾</div>
      </div>
      {note && <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{note}</div>}
    </div>
  );
}

function Toggle({ label, value, onChange, note }) {
  return (
    <div style={{ marginBottom: 12 }}>
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
          <div style={{
            position: "absolute", top: 3, left: value ? 21 : 3,
            width: 16, height: 16, borderRadius: "50%", background: "white",
            transition: "left 0.2s",
          }} />
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, sub, color, badge }) {
  return (
    <div className="kpi-card" style={{
      ...S.card(), display: "flex", flexDirection: "column", gap: 4,
      borderLeft: `3px solid ${color || C.green}`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: color || C.green, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.mutedHi }}>{sub}</div>}
      {badge && <div style={{ fontSize: 9, background: badge.bg, color: badge.color, padding: "2px 7px", borderRadius: 4, fontWeight: 700, letterSpacing: "0.06em", alignSelf: "flex-start", marginTop: 2 }}>{badge.text}</div>}
    </div>
  );
}

function SectionDivider({ title, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 14px" }}>
      {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: C.mutedHi }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function RatioBenchmark({ label, value, fmt: fmtFn, thresholds, reverse, note, ato }) {
  const display = fmtFn ? fmtFn(value) : value;
  const [good, avg] = thresholds || [0, 0];
  let status = "POOR";
  let statusColor = C.red;
  if (!reverse) {
    if (value >= good)      { status = "GOOD"; statusColor = C.green; }
    else if (value >= avg)  { status = "AVG";  statusColor = C.yellow; }
  } else {
    if (value <= good)      { status = "GOOD"; statusColor = C.green; }
    else if (value <= avg)  { status = "AVG";  statusColor = C.yellow; }
  }
  return (
    <div style={{ ...S.card(), display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: C.mutedHi, fontWeight: 600, marginBottom: 3 }}>{label}</div>
        {note && <div style={{ fontSize: 10, color: C.muted, lineHeight: 1.5 }}>{note}</div>}
        {ato && <div style={{ fontSize: 9, color: C.muted, marginTop: 4, fontStyle: "italic" }}>Source: {ato}</div>}
      </div>
      <div style={{ textAlign: "right", marginLeft: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: statusColor }}>{display}</div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: statusColor, marginTop: 3,
          background: `${statusColor}18`, padding: "2px 7px", borderRadius: 3, display: "inline-block" }}>{status}</div>
      </div>
    </div>
  );
}

function ExportBtn({ tabName }) {
  return (
    <button className="no-print" onClick={() => window.print()} style={{
      background: "transparent", border: `1px solid ${C.border}`,
      color: C.mutedHi, fontSize: 11, fontWeight: 600, padding: "6px 14px",
      borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
      fontFamily: "'Sora', sans-serif", transition: "all 0.15s",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.color = C.green; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.mutedHi; }}>
      ⬇ Export PDF
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// INPUTS PANEL (sidebar)
// ═══════════════════════════════════════════════════════════════
function InputsPanel({ inputs, setInputs, showP2, p2Inputs, setP2Inputs }) {
  const upd = (k, v) => setInputs(p => ({ ...p, [k]: v }));
  const upd2 = (k, v) => setP2Inputs(p => ({ ...p, [k]: v }));
  const marginalRate = calcMarginalRate(inputs.personalIncome);

  const stateOptions = ["NSW","VIC","QLD","SA","WA","TAS","ACT","NT"].map(s => ({ value: s, label: s }));

  const panel = (inp, up, num) => (
    <div>
      {num === 2 && <SectionDivider title="Property 2 — Comparison" icon="🔵" />}
      <InputField label={num === 2 ? "Property 2 Nickname" : "Property Nickname"} value={inp.nickname} onChange={v => up("nickname", v)} type="text" />
      <InputField label="Purchase Price" value={inp.purchasePrice} onChange={v => up("purchasePrice", v)} prefix="$" />
      <SelectField label="State (Stamp Duty)" value={inp.state} onChange={v => up("state", v)} options={stateOptions} />
      <InputField label="Deposit" value={inp.depositPct} onChange={v => up("depositPct", v)} suffix="%" min={0} max={100} step={0.5} note={`Loan: ${fmt.currency(inp.purchasePrice * (1 - inp.depositPct / 100))}`} />
      <InputField label="Interest Rate" value={inp.interestRate} onChange={v => up("interestRate", v)} suffix="% p.a." step={0.05} />
      <InputField label="Loan Term" value={inp.loanTerm} onChange={v => up("loanTerm", v)} suffix="years" min={5} max={30} />
      <InputField label="Weekly Rent" value={inp.weeklyRent} onChange={v => up("weeklyRent", v)} prefix="$" />
      <InputField label="Property Expenses" value={inp.expensesPct} onChange={v => up("expensesPct", v)} suffix="% of rent" step={1} note="Management, rates, insurance, maintenance" />
      <InputField label="Capital Growth Rate" value={inp.capitalGrowth} onChange={v => up("capitalGrowth", v)} suffix="% p.a." step={0.5} />
      {num !== 2 && <>
        <SectionDivider title="Tax & Analysis" icon="🧾" />
        <InputField label="Personal Income" value={inp.personalIncome} onChange={v => upd("personalIncome", v)} prefix="$"
          note={`Marginal rate: ${(calcMarginalRate(inp.personalIncome) * 100).toFixed(0)}% (ATO FY2025-26)`} />
        <InputField label="Discount Rate (DCF)" value={inp.discountRate} onChange={v => upd("discountRate", v)} suffix="%" step={0.5} note="Required rate of return for NPV" />
        <InputField label="Depreciation (Div 43 p.a.)" value={inp.depreciation} onChange={v => upd("depreciation", v)} prefix="$" note="2.5% of construction cost. Div 43, ITAA 1997 s.43-20" />
        <InputField label="Construction Cost (Div 43)" value={inp.constructionCost} onChange={v => upd("constructionCost", v)} prefix="$"
          note={`2.5% = ${fmt.currency(inp.constructionCost * 0.025)} p.a. depreciation`} />
        <SectionDivider title="Buying Costs" icon="💰" />
        <InputField label="Legal / Conveyancing" value={inp.legalFees} onChange={v => upd("legalFees", v)} prefix="$" />
        <InputField label="Building Inspection" value={inp.inspectionFee} onChange={v => upd("inspectionFee", v)} prefix="$" />
        <InputField label="Loan Establishment" value={inp.loanEstFee} onChange={v => upd("loanEstFee", v)} prefix="$" />
        <Toggle label="First Home Buyer" value={inp.isFirstHomeBuyer} onChange={v => upd("isFirstHomeBuyer", v)} note="Applies stamp duty concessions" />
      </>}
    </div>
  );

  return (
    <div style={{ ...S.card({ padding: "20px", overflowY: "auto", height: "100%" }) }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <span>⚙</span> INPUTS
      </div>
      {panel(inputs, upd, 1)}
      {showP2 && panel(p2Inputs, upd2, 2)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 1 — PURCHASE COSTS
// ═══════════════════════════════════════════════════════════════
function Tab1PurchaseCosts({ inputs }) {
  const { purchasePrice, state, depositPct, isFirstHomeBuyer, legalFees, inspectionFee, loanEstFee } = inputs;
  const deposit = purchasePrice * depositPct / 100;
  const stampDuty = calcStampDuty(purchasePrice, state, isFirstHomeBuyer);
  const totalCosts = stampDuty + legalFees + inspectionFee + loanEstFee;
  const cashRequired = deposit + totalCosts;

  const rows = [
    { label: "Purchase Price",            value: purchasePrice,  muted: true },
    { label: "Deposit (" + depositPct + "%)", value: deposit,   muted: true },
    null,
    { label: `Stamp Duty — ${state}${isFirstHomeBuyer ? " (FHB concession applied)" : ""}`, value: stampDuty, highlight: true },
    { label: "Legal / Conveyancing Fees", value: legalFees },
    { label: "Building & Pest Inspection",value: inspectionFee },
    { label: "Loan Establishment Fee",    value: loanEstFee },
    null,
    { label: "Total Transaction Costs",   value: totalCosts, bold: true, color: C.yellow },
    { label: "CASH REQUIRED TO PURCHASE", value: cashRequired, bold: true, color: C.green, big: true },
  ];

  const stateNotes = {
    NSW: "NSW OSR: Revenue NSW Schedule 1, Duties Act 1997. FHB: exemption ≤$800k, concession $800k–$1M.",
    VIC: "VIC SRO: Duties Act 2000. FHB: exemption ≤$600k, concession $600k–$750k.",
    QLD: "QLD OSR: Duties Act 2001. FHB: exemption ≤$500k.",
    SA:  "SA RevenueSA: Stamp Duties Act 1923. FHB: Grant & concession from July 2023.",
    WA:  "WA RevWA: Duties Act 2008. FHB: exemption ≤$430k, concession $430k–$530k.",
    TAS: "TAS SRO: Duties Act 2001. Standard rates apply.",
    ACT: "ACT Revenue: Duties Act 1999. FHB: exemption ≤$1M from July 2023.",
    NT:  "NT Treasury: Stamp Duty Act. Formula-based calculation.",
  };

  return (
    <div className="tab-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Purchase Costs</h2>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{inputs.nickname || "Property"} — {state} — {fmt.currency(purchasePrice)}</p>
        </div>
        <ExportBtn tabName="Purchase Costs" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KPICard label="Stamp Duty" value={fmt.currency(stampDuty)} color={C.yellow} sub={fmt.pct(stampDuty / purchasePrice * 100) + " of price"} />
        <KPICard label="Total Costs" value={fmt.currency(totalCosts)} color={C.red} sub="Excl. deposit" />
        <KPICard label="Cash Required" value={fmt.currency(cashRequired)} color={C.green} sub="Deposit + all costs" />
        <KPICard label="LVR" value={fmt.pct((1 - depositPct / 100) * 100)} color={depositPct >= 20 ? C.green : C.yellow} sub={depositPct < 20 ? "LMI may apply" : "No LMI"} />
      </div>

      <div style={{ ...S.card(), marginBottom: 20 }}>
        <div style={S.sectionTitle}>Cost Breakdown</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {rows.map((row, i) => {
              if (row === null) return <tr key={i}><td colSpan={2} style={{ height: 8 }} /></tr>;
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}20` }}>
                  <td style={{ padding: "10px 14px", fontSize: row.big ? 14 : 13, fontWeight: row.bold ? 700 : 400,
                    color: row.muted ? C.muted : row.color || C.text, paddingLeft: row.highlight ? 24 : 14 }}>
                    {row.highlight && <span style={{ color: C.yellow, marginRight: 8, fontSize: 10 }}>▶</span>}
                    {row.label}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontSize: row.big ? 16 : 13,
                    fontWeight: row.bold ? 700 : 400, fontFamily: "'JetBrains Mono', monospace",
                    color: row.muted ? C.muted : row.color || C.text }}>
                    {fmt.currency(row.value)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stamp Duty Breakdown Visual */}
      <div style={{ ...S.card(), marginBottom: 20 }}>
        <div style={S.sectionTitle}>Stamp Duty Bar</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 24, background: C.surface, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, stampDuty / purchasePrice * 100 / 0.06 * 100)}%`,
              background: `linear-gradient(90deg, ${C.yellow}, ${C.gold})`, borderRadius: 4, transition: "width 0.4s",
              display: "flex", alignItems: "center", paddingLeft: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#000", whiteSpace: "nowrap" }}>
                {fmt.pct(stampDuty / purchasePrice * 100)}
              </span>
            </div>
          </div>
          <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: C.yellow, minWidth: 90, textAlign: "right" }}>
            {fmt.currency(stampDuty)}
          </span>
        </div>
      </div>

      <div style={{ ...S.card({ background: `${C.gold}10`, borderColor: `${C.gold}30` }) }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          ⚖ ATO / State Revenue Source
        </div>
        <div style={{ fontSize: 11, color: C.mutedHi, lineHeight: 1.7 }}>
          {stateNotes[state]}
          {isFirstHomeBuyer && " First Home Buyer concession applied."}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2 — KEY RATIOS
// ═══════════════════════════════════════════════════════════════
function Tab2KeyRatios({ inputs, stampDuty }) {
  const { purchasePrice, depositPct, interestRate, loanTerm, weeklyRent, expensesPct, legalFees, inspectionFee, loanEstFee } = inputs;
  const grossRentAnnual = weeklyRent * 52;
  const netRentAnnual   = grossRentAnnual * (1 - expensesPct / 100);
  const loan     = purchasePrice * (1 - depositPct / 100);
  const annualMortgage = calcMonthlyRepayment(loan, interestRate / 100, loanTerm) * 12;
  const noi      = netRentAnnual;
  const cashInvested = purchasePrice * depositPct / 100 + (stampDuty || 0) + (legalFees || 2000) + (inspectionFee || 600) + (loanEstFee || 800);
  const annualCashFlow = netRentAnnual - annualMortgage;
  const grossYield  = grossRentAnnual / purchasePrice * 100;
  const netYield    = netRentAnnual / purchasePrice * 100;
  const capRate     = noi / purchasePrice * 100;
  const cocReturn   = cashInvested > 0 ? annualCashFlow / cashInvested * 100 : 0;
  const dscr        = annualMortgage > 0 ? noi / annualMortgage : 0;
  const priceToRent = grossRentAnnual > 0 ? purchasePrice / grossRentAnnual : 0;
  const lvr         = (1 - depositPct / 100) * 100;
  const rentalAfford= grossRentAnnual / (50000 * 0.3) * 100; // % of median earner's 30% threshold

  return (
    <div className="tab-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Key Investment Ratios</h2>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{inputs.nickname || "Property"} — {fmt.currency(purchasePrice)}</p>
        </div>
        <ExportBtn />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Cash Flow",    value: fmt.currency(annualCashFlow) + "/yr", color: annualCashFlow >= 0 ? C.green : C.red, sub: annualCashFlow >= 0 ? "Positively geared" : "Negatively geared" },
          { label: "Gross Yield",  value: fmt.pct(grossYield),  color: grossYield >= 5 ? C.green : grossYield >= 3.5 ? C.yellow : C.red },
          { label: "Net Yield",    value: fmt.pct(netYield),    color: netYield >= 4 ? C.green : netYield >= 2.5 ? C.yellow : C.red },
          { label: "LVR",          value: fmt.pct(lvr),         color: lvr <= 80 ? C.green : lvr <= 90 ? C.yellow : C.red },
        ].map((k, i) => <KPICard key={i} {...k} />)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <RatioBenchmark label="Gross Rental Yield" value={grossYield}
            fmt={v => fmt.pct(v)} thresholds={[5, 3.5]}
            note="Annual gross rent ÷ purchase price. Good: >5% | Avg: 3.5–5% | Poor: <3.5%"
            ato="ATO Property Investment Guide 2024" />
          <RatioBenchmark label="Net Rental Yield" value={netYield}
            fmt={v => fmt.pct(v)} thresholds={[4, 2.5]}
            note="Annual net rent (after expenses) ÷ purchase price. Good: >4% | Avg: 2.5–4% | Poor: <2.5%" />
          <RatioBenchmark label="Cap Rate (Capitalisation Rate)" value={capRate}
            fmt={v => fmt.pct(v)} thresholds={[5, 3]}
            note="NOI ÷ purchase price (income potential excl. financing). Good: >5% | Poor: <3%" />
          <RatioBenchmark label="Cash-on-Cash Return" value={cocReturn}
            fmt={v => fmt.pct(v)} thresholds={[5, 0]}
            note="Annual cash flow ÷ total cash invested. Good: >5% | Avg: 0–5% | Poor: <0%" />
        </div>
        <div>
          <RatioBenchmark label="Debt Service Coverage Ratio" value={dscr}
            fmt={v => fmt.num(v, 2) + "×"} thresholds={[1.25, 1.0]}
            note="NOI ÷ annual mortgage payment. >1.25× strong | 1–1.25× OK | <1 at risk" />
          <RatioBenchmark label="Price-to-Rent Ratio" value={priceToRent}
            fmt={v => fmt.num(v, 1) + "×"} thresholds={[15, 25]} reverse
            note="Purchase price ÷ annual rent. Lower is better. <15× buy, 15–25× average, >25× rent" />
          <RatioBenchmark label="LVR (Loan to Value Ratio)" value={lvr}
            fmt={v => fmt.pct(v)} thresholds={[80, 90]} reverse
            note="Loan ÷ property value. ≤80% avoids LMI. APRA prudential limit for banks: 80%"
            ato="APRA Prudential Standard APS 112" />
          <RatioBenchmark label="Rental Affordability Index" value={rentalAfford}
            fmt={v => fmt.pct(v)} thresholds={[30, 50]} reverse
            note="% of median household income (est. $50k) needed for rent. <30% affordable, >50% stressed" />
        </div>
      </div>

      <div style={{ ...S.card({ marginTop: 16, background: `${C.green}08`, borderColor: `${C.green}25` }) }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          {[
            ["Annual Gross Rent", fmt.currency(grossRentAnnual)],
            ["Annual Net Rent",   fmt.currency(netRentAnnual)],
            ["Annual Mortgage",   fmt.currency(annualMortgage)],
            ["Net Cash Flow p.a.",fmt.currency(annualCashFlow)],
            ["Cash Invested",     fmt.currency(cashInvested)],
            ["Loan Amount",       fmt.currency(loan)],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{k}</div>
              <div style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: C.text }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 3 — 10 YEAR CASH FLOW PROJECTION
// ═══════════════════════════════════════════════════════════════
function Tab3CashFlow({ inputs, stampDuty }) {
  const cashInvested = inputs.purchasePrice * inputs.depositPct / 100 + (stampDuty || 0) + inputs.legalFees + inputs.inspectionFee + inputs.loanEstFee;
  const rows = build10YearProjection({ ...inputs, cashInvested });

  const cols = ["Yr", "Property Value", "Gross Rent", "Expenses", "Mortgage (P&I)", "Net Cash Flow", "Cumul. CF", "Loan Balance", "Equity", "Total Return"];

  return (
    <div className="tab-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>10-Year Cash Flow Projection</h2>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Rent grows 3% p.a. · Capital growth {inputs.capitalGrowth}% p.a.</p>
        </div>
        <ExportBtn />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
        {(() => {
          const yr10 = rows[9];
          return [
            { label: "Property Value (Yr 10)", value: fmt.currency(yr10.propValue), color: C.green },
            { label: "Equity (Yr 10)",         value: fmt.currency(yr10.equity),    color: C.green },
            { label: "Cumul. Cash Flow",        value: fmt.currency(yr10.cumCashFlow), color: yr10.cumCashFlow >= 0 ? C.green : C.red },
            { label: "Total Return (Yr 10)",    value: fmt.currency(yr10.totalReturn), color: C.gold },
          ].map((k, i) => <KPICard key={i} {...k} />);
        })()}
      </div>

      <div style={{ overflowX: "auto", ...S.card({ padding: 0 }) }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c} style={{ ...S.th, textAlign: c === "Yr" ? "center" : "right", paddingLeft: c === "Yr" ? 14 : undefined }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pos = r.netCashFlow >= 0;
              const rowBg = pos ? `${C.green}06` : `${C.red}06`;
              return (
                <tr key={r.yr} style={{ background: rowBg, borderBottom: `1px solid ${C.border}30` }}>
                  <td style={{ ...S.td, textAlign: "center", fontWeight: 700, color: C.mutedHi }}>{r.yr}</td>
                  <td style={{ ...S.td, color: C.text }}>{fmt.currency(r.propValue)}</td>
                  <td style={{ ...S.td, color: C.mutedHi }}>{fmt.currency(r.grossRent)}</td>
                  <td style={{ ...S.td, color: C.red }}>{fmt.currency(r.expenses)}</td>
                  <td style={{ ...S.td, color: C.red }}>{fmt.currency(r.annualMortgage)}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: pos ? C.green : C.red }}>
                    {pos ? "+" : ""}{fmt.currency(r.netCashFlow)}
                  </td>
                  <td style={{ ...S.td, color: r.cumCashFlow >= 0 ? C.greenDim : C.red }}>{fmt.currency(r.cumCashFlow)}</td>
                  <td style={{ ...S.td, color: C.muted }}>{fmt.currency(r.loanBal)}</td>
                  <td style={{ ...S.td, color: C.gold }}>{fmt.currency(r.equity)}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: r.totalReturn >= 0 ? C.gold : C.red }}>{fmt.currency(r.totalReturn)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mini cashflow chart using CSS bars */}
      <div style={{ ...S.card({ marginTop: 16 }) }}>
        <div style={S.sectionTitle}>Net Cash Flow by Year</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
          {rows.map(r => {
            const maxAbs = Math.max(...rows.map(x => Math.abs(x.netCashFlow)));
            const height = maxAbs > 0 ? Math.abs(r.netCashFlow) / maxAbs * 70 : 4;
            const pos = r.netCashFlow >= 0;
            return (
              <div key={r.yr} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", height: height, background: pos ? C.green : C.red,
                  borderRadius: "3px 3px 0 0", opacity: 0.85, minHeight: 3, transition: "height 0.3s" }} />
                <span style={{ fontSize: 9, color: C.muted }}>{r.yr}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, background: C.green, borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: C.muted }}>Positive (gain)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, background: C.red, borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: C.muted }}>Negative (cost)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 4 — IRR & DCF ANALYSIS
// ═══════════════════════════════════════════════════════════════
function Tab4IRRDCF({ inputs, stampDuty }) {
  const { purchasePrice, depositPct, interestRate, loanTerm, weeklyRent, expensesPct, capitalGrowth, discountRate, legalFees, inspectionFee, loanEstFee } = inputs;
  const loan = purchasePrice * (1 - depositPct / 100);
  const annualMortgage = calcMonthlyRepayment(loan, interestRate / 100, loanTerm) * 12;
  const cashInvested = purchasePrice * depositPct / 100 + (stampDuty || 0) + legalFees + inspectionFee + loanEstFee;

  // Build cashflows array for IRR/NPV
  const cfs = [-cashInvested];
  for (let yr = 1; yr <= 10; yr++) {
    const grossRent = weeklyRent * 52 * Math.pow(1.03, yr - 1);
    const expenses  = grossRent * (expensesPct / 100);
    const netCF     = grossRent - expenses - annualMortgage;
    if (yr < 10) { cfs.push(netCF); }
    else {
      const saleProceeds = purchasePrice * Math.pow(1 + capitalGrowth / 100, 10);
      const loanBal      = calcLoanBalance(loan, interestRate / 100, loanTerm, 10);
      const cgtEstimate  = (saleProceeds - purchasePrice) * 0.5 * 0.30; // 50% CGT discount, 30% marginal estimate
      cfs.push(netCF + saleProceeds - loanBal - cgtEstimate);
    }
  }

  const irr = calcIRR(cfs);
  const npv = calcNPV(cfs, discountRate / 100);
  const saleValue = purchasePrice * Math.pow(1 + capitalGrowth / 100, 10);
  const loanBalFinal = calcLoanBalance(loan, interestRate / 100, loanTerm, 10);
  const totalCumCF = cfs.slice(1, 10).reduce((s, c) => s + c, 0);
  const totalEquityGain = saleValue - purchasePrice;
  const totalReturn = npv / cashInvested * 100;
  const annualisedReturn = irr !== null ? irr * 100 : null;
  const equityMultiple = cashInvested > 0 ? (cashInvested + totalEquityGain + totalCumCF) / cashInvested : 0;
  const isGoodInvestment = npv > 0;

  return (
    <div className="tab-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>IRR & DCF Analysis</h2>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>10-year hold, sale at Year 10. Discount rate: {discountRate}%</p>
        </div>
        <ExportBtn />
      </div>

      {/* Verdict banner */}
      <div style={{
        background: isGoodInvestment ? `${C.green}15` : `${C.red}15`,
        border: `1px solid ${isGoodInvestment ? C.green : C.red}40`,
        borderRadius: 10, padding: "16px 20px", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <span style={{ fontSize: 28 }}>{isGoodInvestment ? "✅" : "⚠️"}</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: isGoodInvestment ? C.green : C.red }}>
            At your discount rate of {discountRate}%, this property {isGoodInvestment ? "IS" : "IS NOT"} a good investment
          </div>
          <div style={{ fontSize: 12, color: C.mutedHi, marginTop: 3 }}>
            NPV of {fmt.currency(npv)} — {isGoodInvestment ? "positive NPV means returns exceed your hurdle rate" : "negative NPV means returns fall short of your required rate"}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KPICard label="IRR" value={annualisedReturn !== null ? fmt.pct(annualisedReturn) : "—"} color={annualisedReturn >= 10 ? C.green : annualisedReturn >= 5 ? C.yellow : C.red} sub="Internal Rate of Return" />
        <KPICard label="NPV" value={fmt.currency(npv)} color={npv >= 0 ? C.green : C.red} sub={`@ ${discountRate}% discount`} />
        <KPICard label="Equity Multiple" value={fmt.x(equityMultiple)} color={equityMultiple >= 2 ? C.green : equityMultiple >= 1.5 ? C.yellow : C.red} sub="Total value ÷ cash in" />
        <KPICard label="10-Yr Sale Value" value={fmt.currency(saleValue)} color={C.gold} sub={`${capitalGrowth}% growth p.a.`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={S.card()}>
          <div style={S.sectionTitle}>DCF Summary</div>
          {[
            ["Initial Cash Invested",    -cashInvested, C.red],
            ["PV of Annual Cash Flows",  calcNPV(cfs.slice(0, 10).map((c, i) => i === 0 ? 0 : c), discountRate / 100), C.green],
            ["PV of Year 10 Sale",       cfs[10] / Math.pow(1 + discountRate / 100, 10), C.gold],
            ["Net Present Value (NPV)",  npv, npv >= 0 ? C.green : C.red],
          ].map(([k, v, c]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.border}30` }}>
              <span style={{ fontSize: 12, color: C.mutedHi }}>{k}</span>
              <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: c }}>{fmt.currency(v)}</span>
            </div>
          ))}
        </div>

        <div style={S.card()}>
          <div style={S.sectionTitle}>Returns Summary</div>
          {[
            ["Total Cash Invested",      fmt.currency(cashInvested),   C.mutedHi],
            ["Estimated Sale Proceeds",  fmt.currency(saleValue),       C.gold],
            ["Loan Balance at Yr 10",    fmt.currency(loanBalFinal),    C.muted],
            ["Equity at Sale",           fmt.currency(saleValue - loanBalFinal), C.green],
            ["Cumulative Cash Flow",     fmt.currency(totalCumCF),     totalCumCF >= 0 ? C.green : C.red],
            ["IRR (10-Year)",            annualisedReturn !== null ? fmt.pct(annualisedReturn) : "—", annualisedReturn >= 10 ? C.green : C.yellow],
            ["Equity Multiple",          fmt.x(equityMultiple),         equityMultiple >= 2 ? C.green : C.yellow],
          ].map(([k, v, c]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.border}30` }}>
              <span style={{ fontSize: 12, color: C.mutedHi }}>{k}</span>
              <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: c }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Year-by-year DCF table */}
      <div style={{ ...S.card({ marginTop: 16, padding: 0 }) }}>
        <div style={{ ...S.sectionTitle, padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}` }}>Year-by-Year Cash Flows (for IRR calculation)</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr>
                {["Year", "Cash Flow", "PV Factor", "Present Value"].map(h => (
                  <th key={h} style={{ ...S.th }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cfs.map((cf, t) => {
                const pvFactor = 1 / Math.pow(1 + discountRate / 100, t);
                const pv = cf * pvFactor;
                return (
                  <tr key={t} style={{ borderBottom: `1px solid ${C.border}20`, background: t === 0 ? `${C.red}08` : cf >= 0 ? `${C.green}04` : `${C.red}04` }}>
                    <td style={{ ...S.td, textAlign: "center", color: C.mutedHi }}>{t === 0 ? "Init" : t}</td>
                    <td style={{ ...S.td, color: cf >= 0 ? C.green : C.red, fontWeight: 600 }}>{fmt.currency(cf)}</td>
                    <td style={{ ...S.td, color: C.muted }}>{pvFactor.toFixed(4)}</td>
                    <td style={{ ...S.td, color: pv >= 0 ? C.greenDim : C.red }}>{fmt.currency(pv)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...S.card({ marginTop: 14, background: `${C.accent}08`, borderColor: `${C.accent}25` }) }}>
        <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Methodology Note</div>
        <div style={{ fontSize: 11, color: C.mutedHi, lineHeight: 1.7 }}>
          IRR calculated via Newton-Raphson iteration on undiscounted cashflow stream. NPV uses your specified discount rate of {discountRate}%.
          Year 10 terminal value assumes sale at capital growth rate with estimated CGT (50% discount, 30% marginal rate). Loan balance calculated via standard amortisation.
          ATO reference: ITAA 1997 Div 110 (CGT), ATO Rental Income Guide 2024.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 5 — NEGATIVE GEARING & TAX
// ═══════════════════════════════════════════════════════════════
function Tab5NegativeGearing({ inputs, stampDuty }) {
  const { purchasePrice, depositPct, interestRate, loanTerm, weeklyRent, expensesPct, personalIncome, constructionCost, depreciation, legalFees, inspectionFee, loanEstFee } = inputs;
  const loan = purchasePrice * (1 - depositPct / 100);
  const annualMortgage = calcMonthlyRepayment(loan, interestRate / 100, loanTerm) * 12;
  const grossRentAnnual = weeklyRent * 52;
  const expensesAnnual  = grossRentAnnual * (expensesPct / 100);
  const div43Deduction  = constructionCost * 0.025;

  // Year 1 interest (approximation)
  const annualInterest = calcAnnualInterest(loan, interestRate / 100, loanTerm, 1);
  const marginalRate   = calcMarginalRate(personalIncome);

  const netRentalIncome = grossRentAnnual - annualInterest - expensesAnnual - div43Deduction;
  const taxRefund       = netRentalIncome < 0 ? Math.abs(netRentalIncome) * marginalRate : 0;
  const taxPayable      = netRentalIncome > 0 ? netRentalIncome * marginalRate : 0;
  const cashFlow        = grossRentAnnual - annualMortgage - expensesAnnual;
  const afterTaxCashFlow = cashFlow + taxRefund - taxPayable;
  const taxSavingPerYear = taxRefund;

  const taxBase = calcIncomeTax(personalIncome);
  const taxWithProperty = calcIncomeTax(Math.max(0, personalIncome + Math.min(0, netRentalIncome)));
  const actualTaxSaving = taxBase - taxWithProperty;

  const rows = [
    { label: "Annual Gross Rental Income",    value: grossRentAnnual,   color: C.green, bold: true },
    { label: "Less: Interest Expense (Yr 1)", value: -annualInterest,   color: C.red },
    { label: "Less: Property Expenses",       value: -expensesAnnual,   color: C.red },
    { label: "Less: Depreciation (Div 43)",   value: -div43Deduction,   color: C.red, italic: true },
    null,
    { label: "Net Rental Income / (Loss)",    value: netRentalIncome,   color: netRentalIncome >= 0 ? C.green : C.red, bold: true, big: true },
    null,
    { label: `Tax Refund at ${(marginalRate*100).toFixed(0)}% marginal rate`, value: taxRefund, color: C.green, bold: true },
    { label: "Pre-Tax Cash Flow",             value: cashFlow,          color: cashFlow >= 0 ? C.green : C.red },
    { label: "After-Tax Cash Flow",           value: afterTaxCashFlow,  color: afterTaxCashFlow >= 0 ? C.green : C.red, bold: true },
  ];

  return (
    <div className="tab-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Negative Gearing & Tax Analysis</h2>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Income: {fmt.currency(personalIncome)} p.a. — Marginal rate: {(marginalRate*100).toFixed(0)}% — ATO FY2025-26</p>
        </div>
        <ExportBtn />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KPICard label="Net Rental P&L" value={fmt.currency(netRentalIncome)} color={netRentalIncome >= 0 ? C.green : C.red}
          sub={netRentalIncome < 0 ? "Negatively geared" : "Positively geared"}
          badge={netRentalIncome < 0 ? { text: "TAX DEDUCTIBLE", bg: `${C.green}20`, color: C.green } : undefined} />
        <KPICard label="Tax Saving p.a." value={fmt.currency(actualTaxSaving)} color={C.gold} sub="From negative gearing" />
        <KPICard label="After-Tax Cash Flow" value={fmt.currency(afterTaxCashFlow)} color={afterTaxCashFlow >= 0 ? C.green : C.red} />
        <KPICard label="5-Year Tax Saving" value={fmt.currency(actualTaxSaving * 5)} color={C.gold} sub="Cumulative estimate" />
      </div>

      {netRentalIncome < 0 && (
        <div style={{ background: `${C.green}12`, border: `1px solid ${C.green}30`, borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12 }}>
          <span style={{ fontSize: 22 }}>💰</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>
              This property saves you {fmt.currency(actualTaxSaving)} in tax per year
            </div>
            <div style={{ fontSize: 12, color: C.mutedHi, marginTop: 3 }}>
              The rental loss of {fmt.currency(Math.abs(netRentalIncome))} is offset against your {fmt.currency(personalIncome)} salary, reducing your taxable income.
              Over 5 years: {fmt.currency(actualTaxSaving * 5)} in tax savings (before rent growth).
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={S.card()}>
          <div style={S.sectionTitle}>Rental P&L Statement (Year 1)</div>
          {rows.map((row, i) => {
            if (row === null) return <div key={i} style={{ height: 8, borderBottom: `1px solid ${C.border}30` }} />;
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}20` }}>
                <span style={{ fontSize: 12, color: C.mutedHi, fontStyle: row.italic ? "italic" : "normal" }}>{row.label}</span>
                <span style={{ fontSize: row.big ? 15 : 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: row.bold ? 700 : 400, color: row.color }}>
                  {row.value >= 0 ? "" : "−"}{fmt.currency(Math.abs(row.value))}
                </span>
              </div>
            );
          })}
        </div>

        <div>
          <div style={S.card()}>
            <div style={S.sectionTitle}>Depreciation Schedule (Division 43)</div>
            {[
              ["Construction Cost",        fmt.currency(constructionCost)],
              ["Div 43 Rate",              "2.5% per annum"],
              ["Annual Depreciation",      fmt.currency(div43Deduction)],
              ["Tax Saving from Depr.",    fmt.currency(div43Deduction * marginalRate)],
              ["Depr. Remaining (40yr)",   fmt.currency(constructionCost)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}20` }}>
                <span style={{ fontSize: 12, color: C.mutedHi }}>{k}</span>
                <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: C.text }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ ...S.card({ marginTop: 12 }) }}>
            <div style={S.sectionTitle}>5-Year Tax Saving Projection</div>
            {Array.from({ length: 5 }, (_, i) => {
              const yr = i + 1;
              const rentGrowth = Math.pow(1.03, i);
              const grossR = grossRentAnnual * rentGrowth;
              const expR   = grossR * (expensesPct / 100);
              const intR   = calcAnnualInterest(loan, interestRate / 100, loanTerm, yr);
              const netR   = grossR - intR - expR - div43Deduction;
              const saving = netR < 0 ? calcIncomeTax(personalIncome) - calcIncomeTax(Math.max(0, personalIncome + netR)) : 0;
              return (
                <div key={yr} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.border}20` }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Year {yr}</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: C.gold }}>{fmt.currency(saving)}</span>
                    <span style={{ fontSize: 10, color: C.muted, marginLeft: 8 }}>loss: {fmt.currency(Math.abs(Math.min(0, netR)))}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ ...S.card({ marginTop: 16, background: `${C.gold}08`, borderColor: `${C.gold}30` }) }}>
        <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>⚖ ATO Reference</div>
        <div style={{ fontSize: 11, color: C.mutedHi, lineHeight: 1.7 }}>
          <strong>Negative gearing:</strong> ITAA 1997 s.8-1. Rental losses deductible against other income if property genuinely available for rent. |{" "}
          <strong>Division 43 depreciation:</strong> ITAA 1997 s.43-20 — 2.5% p.a. on eligible construction costs for residential property. |{" "}
          <strong>Tax brackets:</strong> ATO Individual Tax Rates FY2025-26. |{" "}
          <strong>CGT discount:</strong> ITAA 1997 s.115-A — 50% discount for assets held >12 months.
          Seek qualified tax advice for your specific situation.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 6 — SENSITIVITY ANALYSIS
// ═══════════════════════════════════════════════════════════════
function Tab6Sensitivity({ inputs, stampDuty }) {
  const cashInvested = inputs.purchasePrice * inputs.depositPct / 100 + (stampDuty || 0) + inputs.legalFees + inputs.inspectionFee + inputs.loanEstFee;
  const growthRates = [2, 3, 4, 5, 6];
  const interestRates = [5, 5.5, 6, 6.5, 7];
  const rentMultipliers = [-10, -5, 0, 5, 10];
  const priceMultipliers = [-10, -5, 0, 5, 10];

  // IRR matrix: rows = growth, cols = interest rate
  const irrMatrix = growthRates.map(g =>
    interestRates.map(r => {
      const irr = computeIRR({ ...inputs, cashInvested, stampDuty }, { capitalGrowth: g, interestRate: r });
      return irr !== null ? irr * 100 : null;
    })
  );

  // Net yield matrix: rows = rent ±%, cols = price ±%
  const yieldMatrix = rentMultipliers.map(rm =>
    priceMultipliers.map(pm => {
      const adjRent  = inputs.weeklyRent * (1 + rm / 100);
      const adjPrice = inputs.purchasePrice * (1 + pm / 100);
      return computeNetYield({ ...inputs }, { weeklyRent: adjRent, purchasePrice: adjPrice });
    })
  );

  const irrColor = (v) => {
    if (v === null) return C.muted;
    if (v >= 10) return C.green;
    if (v >= 5)  return C.yellow;
    return C.red;
  };
  const irrBg = (v) => {
    if (v === null) return "transparent";
    if (v >= 10) return `${C.green}20`;
    if (v >= 5)  return `${C.yellow}18`;
    return `${C.red}18`;
  };
  const yieldColor = (v) => {
    if (v >= 5)  return C.green;
    if (v >= 3)  return C.yellow;
    return C.red;
  };
  const yieldBg = (v) => {
    if (v >= 5)  return `${C.green}18`;
    if (v >= 3)  return `${C.yellow}18`;
    return `${C.red}18`;
  };

  const cellStyle = (bg, color, isActive = false) => ({
    padding: "10px 8px", textAlign: "center",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
    color, background: bg,
    border: isActive ? `2px solid ${C.green}` : `1px solid ${C.border}30`,
    transition: "background 0.2s",
  });

  const theadCell = {
    padding: "8px 10px", fontSize: 10, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.07em",
    color: C.muted, background: C.surface, textAlign: "center",
    borderBottom: `1px solid ${C.border}`,
  };

  return (
    <div className="tab-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Sensitivity Analysis</h2>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>How changes in key variables affect returns</p>
        </div>
        <ExportBtn />
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        {[
          { color: C.green, bg: `${C.green}20`, label: "Strong (IRR >10% / Yield >5%)" },
          { color: C.yellow, bg: `${C.yellow}18`, label: "Average (IRR 5–10% / Yield 3–5%)" },
          { color: C.red, bg: `${C.red}18`, label: "Weak (IRR <5% / Yield <3%)" },
        ].map(({ color, bg, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 14, height: 14, background: bg, border: `1px solid ${color}`, borderRadius: 3 }} />
            <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Matrix 1: IRR by Growth × Interest Rate */}
      <div style={S.card({ marginBottom: 20 })}>
        <div style={S.sectionTitle}>IRR Sensitivity — Capital Growth × Interest Rate</div>
        <p style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
          10-year IRR across different capital growth (rows) and interest rate (columns) combinations.
          Highlighted cell = your current inputs ({inputs.capitalGrowth}% / {inputs.interestRate}%).
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 480 }}>
            <thead>
              <tr>
                <th style={{ ...theadCell, textAlign: "right", paddingRight: 14 }}>Growth ↓ Rate →</th>
                {interestRates.map(r => (
                  <th key={r} style={{ ...theadCell, color: r === inputs.interestRate ? C.green : C.muted }}>
                    {r}%
                    {r === inputs.interestRate && <div style={{ fontSize: 7, color: C.green }}>▲ CURRENT</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {growthRates.map((g, gi) => (
                <tr key={g}>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: g === inputs.capitalGrowth ? C.green : C.mutedHi, background: C.surface, whiteSpace: "nowrap" }}>
                    {g}% growth{g === inputs.capitalGrowth ? " ◀" : ""}
                  </td>
                  {irrMatrix[gi].map((v, ci) => {
                    const isActive = growthRates[gi] === inputs.capitalGrowth && interestRates[ci] === inputs.interestRate;
                    return (
                      <td key={ci} style={cellStyle(irrBg(v), irrColor(v), isActive)}>
                        {v !== null ? v.toFixed(1) + "%" : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matrix 2: Net Yield by Rent × Price */}
      <div style={S.card()}>
        <div style={S.sectionTitle}>Net Yield Sensitivity — Rent × Purchase Price</div>
        <p style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
          Net rental yield across rent (rows) and purchase price (columns) variations. Base: {fmt.currency(inputs.weeklyRent)}/wk rent, {fmt.currency(inputs.purchasePrice)} price.
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 480 }}>
            <thead>
              <tr>
                <th style={{ ...theadCell, textAlign: "right", paddingRight: 14 }}>Rent ↓ Price →</th>
                {priceMultipliers.map(pm => (
                  <th key={pm} style={{ ...theadCell, color: pm === 0 ? C.green : C.muted }}>
                    {pm === 0 ? "Base" : (pm > 0 ? "+" : "") + pm + "%"}
                    {pm === 0 && <div style={{ fontSize: 7, color: C.green }}>▲ BASE</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rentMultipliers.map((rm, ri) => (
                <tr key={rm}>
                  <td style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: rm === 0 ? C.green : C.mutedHi, background: C.surface, whiteSpace: "nowrap" }}>
                    Rent {rm === 0 ? "Base" : (rm > 0 ? "+" : "") + rm + "%"}{rm === 0 ? " ◀" : ""}
                  </td>
                  {yieldMatrix[ri].map((v, ci) => {
                    const isActive = rm === 0 && priceMultipliers[ci] === 0;
                    return (
                      <td key={ci} style={cellStyle(yieldBg(v), yieldColor(v), isActive)}>
                        {v.toFixed(2)}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 7 — COMPARE TWO PROPERTIES
// ═══════════════════════════════════════════════════════════════
function Tab7Compare({ inputs, p2Inputs }) {
  const computeAll = (inp) => {
    const sd = calcStampDuty(inp.purchasePrice, inp.state, inp.isFirstHomeBuyer);
    const loan = inp.purchasePrice * (1 - inp.depositPct / 100);
    const annualMortgage = calcMonthlyRepayment(loan, inp.interestRate / 100, inp.loanTerm) * 12;
    const grossRent = inp.weeklyRent * 52;
    const netRent   = grossRent * (1 - inp.expensesPct / 100);
    const cashInvested = inp.purchasePrice * inp.depositPct / 100 + sd + inp.legalFees + inp.inspectionFee + inp.loanEstFee;
    const cashFlow  = netRent - annualMortgage;
    const grossYield = grossRent / inp.purchasePrice * 100;
    const netYield   = netRent / inp.purchasePrice * 100;
    const capRate    = netRent / inp.purchasePrice * 100;
    const coC        = cashInvested > 0 ? cashFlow / cashInvested * 100 : 0;
    const dscr       = annualMortgage > 0 ? netRent / annualMortgage : 0;
    const priceToRent = grossRent > 0 ? inp.purchasePrice / grossRent : 0;
    const lvr        = (1 - inp.depositPct / 100) * 100;
    const irr        = computeIRR({ ...inp, cashInvested, stampDuty: sd }, {}) || 0;
    const irrPct     = irr * 100;
    const rows10     = build10YearProjection({ ...inp, cashInvested });
    const yr10       = rows10[9];

    // Negative gearing
    const interest1 = calcAnnualInterest(loan, inp.interestRate / 100, inp.loanTerm, 1);
    const div43 = inp.constructionCost * 0.025;
    const netRentalLoss = grossRent - interest1 - grossRent * inp.expensesPct / 100 - div43;
    const margRate = calcMarginalRate(inp.personalIncome);
    const taxSaving = netRentalLoss < 0
      ? calcIncomeTax(inp.personalIncome) - calcIncomeTax(Math.max(0, inp.personalIncome + netRentalLoss))
      : 0;

    return { sd, cashInvested, grossYield, netYield, capRate, coC, dscr, priceToRent, lvr, irrPct, cashFlow, yr10, taxSaving };
  };

  const a = computeAll(inputs);
  const b = computeAll(p2Inputs);

  const metrics = [
    { label: "Purchase Price",          a: fmt.currency(inputs.purchasePrice),   b: fmt.currency(p2Inputs.purchasePrice),  winner: inputs.purchasePrice < p2Inputs.purchasePrice ? "a" : "b", lowerBetter: true },
    { label: "Stamp Duty",              a: fmt.currency(a.sd),                   b: fmt.currency(b.sd),                    winner: a.sd < b.sd ? "a" : "b", lowerBetter: true },
    { label: "Cash Required",           a: fmt.currency(a.cashInvested),         b: fmt.currency(b.cashInvested),          winner: a.cashInvested < b.cashInvested ? "a" : "b", lowerBetter: true },
    { label: "Gross Rental Yield",      a: fmt.pct(a.grossYield),                b: fmt.pct(b.grossYield),                 winner: a.grossYield > b.grossYield ? "a" : "b", numA: a.grossYield, numB: b.grossYield },
    { label: "Net Rental Yield",        a: fmt.pct(a.netYield),                  b: fmt.pct(b.netYield),                   winner: a.netYield > b.netYield ? "a" : "b", numA: a.netYield, numB: b.netYield },
    { label: "Cap Rate",                a: fmt.pct(a.capRate),                   b: fmt.pct(b.capRate),                    winner: a.capRate > b.capRate ? "a" : "b", numA: a.capRate, numB: b.capRate },
    { label: "Cash-on-Cash Return",     a: fmt.pct(a.coC),                       b: fmt.pct(b.coC),                        winner: a.coC > b.coC ? "a" : "b", numA: a.coC, numB: b.coC },
    { label: "Annual Cash Flow",        a: fmt.currency(a.cashFlow),             b: fmt.currency(b.cashFlow),              winner: a.cashFlow > b.cashFlow ? "a" : "b", numA: a.cashFlow, numB: b.cashFlow },
    { label: "DSCR",                    a: fmt.num(a.dscr) + "×",               b: fmt.num(b.dscr) + "×",                 winner: a.dscr > b.dscr ? "a" : "b", numA: a.dscr, numB: b.dscr },
    { label: "LVR",                     a: fmt.pct(a.lvr),                       b: fmt.pct(b.lvr),                        winner: a.lvr < b.lvr ? "a" : "b", lowerBetter: true },
    { label: "IRR (10-Year)",           a: fmt.pct(a.irrPct),                    b: fmt.pct(b.irrPct),                     winner: a.irrPct > b.irrPct ? "a" : "b", numA: a.irrPct, numB: b.irrPct },
    { label: "Equity at Year 10",       a: fmt.currency(a.yr10.equity),          b: fmt.currency(b.yr10.equity),           winner: a.yr10.equity > b.yr10.equity ? "a" : "b", numA: a.yr10.equity, numB: b.yr10.equity },
    { label: "Tax Saving p.a.",         a: fmt.currency(a.taxSaving),            b: fmt.currency(b.taxSaving),             winner: a.taxSaving > b.taxSaving ? "a" : "b", numA: a.taxSaving, numB: b.taxSaving },
    { label: "Total Return (Yr 10)",    a: fmt.currency(a.yr10.totalReturn),     b: fmt.currency(b.yr10.totalReturn),      winner: a.yr10.totalReturn > b.yr10.totalReturn ? "a" : "b", numA: a.yr10.totalReturn, numB: b.yr10.totalReturn },
  ];

  const aWins = metrics.filter(m => m.winner === "a").length;
  const bWins = metrics.filter(m => m.winner === "b").length;
  const winner = aWins > bWins ? "a" : "b";
  const winnerName = winner === "a" ? (inputs.nickname || "Property 1") : (p2Inputs.nickname || "Property 2");
  const loserName  = winner === "a" ? (p2Inputs.nickname || "Property 2") : (inputs.nickname || "Property 1");
  const winMetrics = winner === "a"
    ? metrics.filter(m => m.winner === "a").map(m => m.label).slice(0, 3).join(", ")
    : metrics.filter(m => m.winner === "b").map(m => m.label).slice(0, 3).join(", ");

  return (
    <div className="tab-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Property Comparison</h2>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
            {inputs.nickname || "Property 1"} vs {p2Inputs.nickname || "Property 2"}
          </p>
        </div>
        <ExportBtn />
      </div>

      {/* Header cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        {[
          { inp: inputs, stats: a, label: "Property 1", num: 1 },
          { inp: p2Inputs, stats: b, label: "Property 2", num: 2 },
        ].map(({ inp, stats, label, num }) => (
          <div key={num} style={{
            ...S.card(),
            borderTop: `3px solid ${num === 1 ? C.green : C.accent}`,
            background: num === parseInt(winner.replace("a","1").replace("b","2")) ? `${C.green}08` : C.card,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: num === 1 ? C.green : C.accent }}>{inp.nickname || label}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{inp.state} — {fmt.currency(inp.purchasePrice)}</div>
              </div>
              {((num === 1 && winner === "a") || (num === 2 && winner === "b")) && (
                <div style={{ background: `${C.green}25`, color: C.green, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, letterSpacing: "0.06em", height: "fit-content" }}>
                  ★ WINNER
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                ["IRR", fmt.pct(stats.irrPct)],
                ["Net Yield", fmt.pct(stats.netYield)],
                ["Cash Flow", fmt.currency(stats.cashFlow)],
                ["Yr 10 Equity", fmt.currency(stats.yr10.equity)],
              ].map(([k, v]) => (
                <div key={k} style={{ background: C.surface, padding: "8px 10px", borderRadius: 6 }}>
                  <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: C.text, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div style={{ ...S.card({ padding: 0 }), marginBottom: 20 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...S.th, textAlign: "left", paddingLeft: 16 }}>Metric</th>
                <th style={{ ...S.th, color: C.green }}>
                  {inputs.nickname || "Property 1"}
                  <div style={{ fontSize: 8 }}>{inputs.state} — {fmt.currency(inputs.purchasePrice)}</div>
                </th>
                <th style={{ ...S.th, color: C.accent }}>
                  {p2Inputs.nickname || "Property 2"}
                  <div style={{ fontSize: 8 }}>{p2Inputs.state} — {fmt.currency(p2Inputs.purchasePrice)}</div>
                </th>
                <th style={{ ...S.th, textAlign: "center" }}>Winner</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => (
                <tr key={m.label} style={{ borderBottom: `1px solid ${C.border}20`, background: i % 2 === 0 ? "transparent" : `${C.surface}40` }}>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: C.mutedHi }}>{m.label}</td>
                  <td style={{ ...S.td, color: m.winner === "a" ? C.green : C.text, fontWeight: m.winner === "a" ? 700 : 400,
                    background: m.winner === "a" ? `${C.green}08` : "transparent" }}>
                    {m.a} {m.winner === "a" && "✓"}
                  </td>
                  <td style={{ ...S.td, color: m.winner === "b" ? C.accent : C.text, fontWeight: m.winner === "b" ? 700 : 400,
                    background: m.winner === "b" ? `${C.accent}08` : "transparent" }}>
                    {m.b} {m.winner === "b" && "✓"}
                  </td>
                  <td style={{ ...S.td, textAlign: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: m.winner === "a" ? C.green : C.accent,
                      background: m.winner === "a" ? `${C.green}18` : `${C.accent}18`,
                      padding: "2px 8px", borderRadius: 4 }}>
                      {m.winner === "a" ? (inputs.nickname || "P1") : (p2Inputs.nickname || "P2")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${C.border}` }}>
                <td style={{ padding: "10px 16px", fontSize: 12, fontWeight: 700, color: C.text }}>Score</td>
                <td style={{ ...S.td, fontWeight: 800, fontSize: 15, color: C.green }}>{aWins} / {metrics.length}</td>
                <td style={{ ...S.td, fontWeight: 800, fontSize: 15, color: C.accent }}>{bWins} / {metrics.length}</td>
                <td style={{ ...S.td, textAlign: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: C.green }}>
                    {winner === "a" ? (inputs.nickname || "P1") : (p2Inputs.nickname || "P2")} WINS
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Recommendation */}
      <div style={{ background: `${C.green}12`, border: `1px solid ${C.green}35`, borderRadius: 12, padding: "18px 22px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 8 }}>
          ★ Recommendation: {winnerName} is the better investment
        </div>
        <div style={{ fontSize: 12, color: C.mutedHi, lineHeight: 1.7 }}>
          <strong style={{ color: C.text }}>{winnerName}</strong> wins {winner === "a" ? aWins : bWins} out of {metrics.length} metrics compared to {loserName}.
          Key advantages include superior performance in: <strong style={{ color: C.greenFg }}>{winMetrics}</strong>.
          {" "}{winner === "a" ? (a.irrPct > b.irrPct ? `The IRR of ${fmt.pct(a.irrPct)} vs ${fmt.pct(b.irrPct)} represents a significant advantage in long-term returns.` : "") : (b.irrPct > a.irrPct ? `The IRR of ${fmt.pct(b.irrPct)} vs ${fmt.pct(a.irrPct)} represents a significant advantage in long-term returns.` : "")}
          {" "}This comparison is based on the inputs provided. Always seek independent financial advice before investing.
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>
          Scores: {inputs.nickname || "P1"} {aWins} wins · {p2Inputs.nickname || "P2"} {bWins} wins
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
const DEFAULT_INPUTS = {
  nickname: "Sydney Unit",
  purchasePrice: 750000,
  state: "NSW",
  depositPct: 20,
  interestRate: 6,
  loanTerm: 30,
  weeklyRent: 650,
  expensesPct: 25,
  capitalGrowth: 4,
  personalIncome: 120000,
  discountRate: 7,
  constructionCost: 200000,
  depreciation: 5000,
  legalFees: 2000,
  inspectionFee: 600,
  loanEstFee: 800,
  isFirstHomeBuyer: false,
};

const DEFAULT_P2 = {
  ...DEFAULT_INPUTS,
  nickname: "Melbourne House",
  purchasePrice: 850000,
  state: "VIC",
  weeklyRent: 720,
  capitalGrowth: 3.5,
};

const TABS = [
  { id: "costs",       label: "1. Purchase Costs",    icon: "🏠" },
  { id: "ratios",      label: "2. Key Ratios",         icon: "📊" },
  { id: "cashflow",    label: "3. Cash Flow",          icon: "💵" },
  { id: "irr",         label: "4. IRR & DCF",          icon: "📈" },
  { id: "tax",         label: "5. Neg. Gearing",       icon: "🧾" },
  { id: "sensitivity", label: "6. Sensitivity",        icon: "🔢" },
  { id: "compare",     label: "7. Compare",            icon: "⚖️" },
  { id: "rental",      label: "8. Rental Yield",       icon: "🏘️" },
   { id: "lvrstamp", label: "9. LVR & Stamp Duty", icon: "📉" },
   { id: "borrowing",  label: "10. Borrowing & Mortgage", icon: "💰" },
{ id: "cgt",        label: "11. CGT & Renovation",     icon: "🧾" },
{ id: "offset",     label: "12. Offset & Stress Test", icon: "📊" },
{ id: "planning",   label: "13. Rent vs Buy",          icon: "🏠" },
   { id: "portfolio", label: "14. Portfolio", icon: "🏘️" },
];

export default function App() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [p2Inputs, setP2Inputs] = useState(DEFAULT_P2);
  const [activeTab, setActiveTab] = useState("costs");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const stampDuty = useMemo(() => calcStampDuty(inputs.purchasePrice, inputs.state, inputs.isFirstHomeBuyer), [inputs.purchasePrice, inputs.state, inputs.isFirstHomeBuyer]);
  const cashInvested = useMemo(() => inputs.purchasePrice * inputs.depositPct / 100 + stampDuty + inputs.legalFees + inputs.inspectionFee + inputs.loanEstFee, [inputs, stampDuty]);

  const renderTab = () => {
    const props = { inputs, stampDuty, cashInvested };
    switch (activeTab) {
      case "costs":       return <Tab1PurchaseCosts {...props} />;
      case "ratios":      return <Tab2KeyRatios {...props} />;
      case "cashflow":    return <Tab3CashFlow {...props} />;
      case "irr":         return <Tab4IRRDCF {...props} />;
      case "tax":         return <Tab5NegativeGearing {...props} />;
      case "sensitivity": return <Tab6Sensitivity {...props} />;
      case "compare":     return <Tab7Compare inputs={inputs} p2Inputs={p2Inputs} />;
      case "rental": return <RentalYieldCalculator />;
         case "lvrstamp": return <LVRAndStampDuty />;
      case "borrowing": return <BorrowingMortgage />;
case "cgt":       return <CGTAndRenovation />;
case "offset":    return <OffsetAndStressTest />;
case "planning":  return <RentVsBuyPortfolio />;   
   case "portfolio": return <PortfolioView />;
      default:            return null;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

      {/* ── Top header bar ── */}
      <header style={{
        background: C.navy,
        borderBottom: `1px solid ${C.border}`,
        padding: "0 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 52,
        flexShrink: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, fontSize: 13,
              padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontFamily: "'Sora', sans-serif" }}
          >
            {sidebarOpen ? "◀" : "▶"} Inputs
          </button>
          <div style={{ width: 1, height: 24, background: C.border }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${C.green}, ${C.greenDim})`,
              borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🏘</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: "0.02em", lineHeight: 1 }}>
                AUS PROPERTY ANALYSER
              </div>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Investment Analysis Tool · ATO FY2025-26
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, color: C.muted, textAlign: "right" }}>
            <div style={{ color: C.text, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{inputs.nickname || "—"}</div>
            <div>{inputs.state} · {fmt.currency(inputs.purchasePrice)} · {fmt.pct(calcMarginalRate(inputs.personalIncome) * 100, 0)} tax</div>
          </div>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <div style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        overflowX: "auto",
        flexShrink: 0,
        padding: "0 20px",
      }}>
        {TABS.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              background: "transparent",
              border: "none",
              borderBottom: isActive ? `2px solid ${C.green}` : "2px solid transparent",
              color: isActive ? C.green : C.muted,
              fontSize: 11, fontWeight: isActive ? 700 : 500,
              padding: "12px 14px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "'Sora', sans-serif",
              letterSpacing: "0.03em",
              transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 5,
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = C.muted; }}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Body: sidebar + content ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{
            width: 280, flexShrink: 0,
            borderRight: `1px solid ${C.border}`,
            background: C.surface,
            overflowY: "auto",
            padding: 14,
          }}>
            <InputsPanel
              inputs={inputs} setInputs={setInputs}
              showP2={activeTab === "compare"}
              p2Inputs={p2Inputs} setP2Inputs={setP2Inputs}
            />
          </div>
        )}

        {/* Main content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "24px 28px", background: C.bg }}>
          {renderTab()}
        </main>
      </div>

      {/* ── Footer ── */}
      <footer style={{
        background: C.navy,
        borderTop: `1px solid ${C.border}`,
        padding: "8px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, color: C.muted }}>
          ATO FY2025-26 tax brackets · All state stamp duty formulas · ITAA 1997 Div 43 depreciation · APRA APS 112
        </div>
        <div style={{ fontSize: 10, color: C.muted }}>
          ⚠ General information only — not financial advice. Always consult a qualified financial adviser.
        </div>
      </footer>
    </div>
  );
}

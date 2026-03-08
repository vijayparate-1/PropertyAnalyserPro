import { useState, useCallback } from "react";

const formatCurrency = (val) =>
  val === "" || val === null || isNaN(val)
    ? "—"
    : new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
        maximumFractionDigits: 0,
      }).format(val);

const formatPct = (val) =>
  val === null || isNaN(val) ? "—" : `${val.toFixed(2)}%`;

const InputField = ({ label, value, onChange, prefix, suffix, hint }) => (
  <div style={{ marginBottom: "18px" }}>
    <label
      style={{
        display: "block",
        fontSize: "12px",
        fontWeight: "600",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#7c8fa6",
        marginBottom: "6px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {label}
    </label>
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {prefix && (
        <span
          style={{
            position: "absolute",
            left: "13px",
            color: "#94a3b8",
            fontSize: "14px",
            fontWeight: "500",
            pointerEvents: "none",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {prefix}
        </span>
      )}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: `11px ${suffix ? "44px" : "14px"} 11px ${prefix ? "28px" : "14px"}`,
          background: "#0f1923",
          border: "1px solid #1e2d3d",
          borderRadius: "8px",
          color: "#e2eaf4",
          fontSize: "14px",
          fontFamily: "'DM Mono', monospace",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
        onBlur={(e) => (e.target.style.borderColor = "#1e2d3d")}
      />
      {suffix && (
        <span
          style={{
            position: "absolute",
            right: "13px",
            color: "#94a3b8",
            fontSize: "13px",
            fontWeight: "500",
            pointerEvents: "none",
          }}
        >
          {suffix}
        </span>
      )}
    </div>
    {hint && (
      <p style={{ fontSize: "11px", color: "#4a5f73", marginTop: "4px", fontFamily: "'DM Sans', sans-serif" }}>
        {hint}
      </p>
    )}
  </div>
);

const ResultCard = ({ label, value, sub, highlight, accent }) => (
  <div
    style={{
      background: highlight ? "linear-gradient(135deg, #1a3a5c 0%, #1e2d3d 100%)" : "#0f1923",
      border: `1px solid ${highlight ? "#3b82f6" : "#1e2d3d"}`,
      borderRadius: "10px",
      padding: "18px 20px",
      position: "relative",
      overflow: "hidden",
    }}
  >
    {highlight && (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
        }}
      />
    )}
    <div
      style={{
        fontSize: "11px",
        fontWeight: "600",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#7c8fa6",
        marginBottom: "8px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: highlight ? "26px" : "20px",
        fontWeight: "700",
        color: accent || (highlight ? "#60a5fa" : "#e2eaf4"),
        fontFamily: "'DM Mono', monospace",
        lineHeight: 1.1,
      }}
    >
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: "11px", color: "#4a5f73", marginTop: "5px", fontFamily: "'DM Sans', sans-serif" }}>
        {sub}
      </div>
    )}
  </div>
);

const yieldRating = (gross) => {
  if (gross === null || isNaN(gross)) return null;
  if (gross >= 7) return { label: "Excellent", color: "#22c55e" };
  if (gross >= 5.5) return { label: "Good", color: "#84cc16" };
  if (gross >= 4) return { label: "Average", color: "#f59e0b" };
  return { label: "Below Average", color: "#ef4444" };
};

export default function RentalYieldCalculator() {
  const [propertyValue, setPropertyValue] = useState("750000");
  const [weeklyRent, setWeeklyRent] = useState("650");
  const [vacancyRate, setVacancyRate] = useState("4");
  const [managementFee, setManagementFee] = useState("8");
  const [annualExpenses, setAnnualExpenses] = useState("5000");
  const [loanAmount, setLoanAmount] = useState("562500");
  const [interestRate, setInterestRate] = useState("6.5");

  const calc = useCallback(() => {
    const pv = parseFloat(propertyValue) || 0;
    const wr = parseFloat(weeklyRent) || 0;
    const vac = parseFloat(vacancyRate) / 100 || 0;
    const mgmt = parseFloat(managementFee) / 100 || 0;
    const expenses = parseFloat(annualExpenses) || 0;
    const loan = parseFloat(loanAmount) || 0;
    const ir = parseFloat(interestRate) / 100 || 0;

    if (pv === 0 || wr === 0) return null;

    const annualGrossRent = wr * 52;
    const effectiveRent = annualGrossRent * (1 - vac);
    const mgmtCost = effectiveRent * mgmt;
    const interestCost = loan * ir;
    const totalExpenses = mgmtCost + expenses + interestCost;
    const netIncome = effectiveRent - totalExpenses;

    const grossYield = (annualGrossRent / pv) * 100;
    const netYield = (netIncome / pv) * 100;
    const cashOnCashYield = (netIncome / (pv - loan)) * 100;
    const weeklyExpenses = totalExpenses / 52;
    const weeklyCashflow = (effectiveRent - totalExpenses) / 52;

    return {
      annualGrossRent,
      effectiveRent,
      mgmtCost,
      interestCost,
      totalExpenses,
      netIncome,
      grossYield,
      netYield,
      cashOnCashYield,
      weeklyExpenses,
      weeklyCashflow,
    };
  }, [propertyValue, weeklyRent, vacancyRate, managementFee, annualExpenses, loanAmount, interestRate]);

  const results = calc();
  const rating = results ? yieldRating(results.grossYield) : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#070d14",
        color: "#e2eaf4",
        fontFamily: "'DM Sans', sans-serif",
        padding: "32px 20px",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div style={{ maxWidth: "960px", margin: "0 auto 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}
          >
            🏘️
          </div>
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#3b82f6", fontWeight: "600" }}>
              Property Analyser Pro
            </div>
            <h1 style={{ fontSize: "22px", fontWeight: "700", margin: 0, color: "#e2eaf4" }}>
              Rental Yield Calculator
            </h1>
          </div>
        </div>
        <p style={{ color: "#4a5f73", fontSize: "13px", margin: 0 }}>
          Calculate gross yield, net yield, and cash-on-cash return for your investment property.
        </p>
      </div>

      <div style={{ maxWidth: "960px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        
        {/* Left — Inputs */}
        <div>
          {/* Property */}
          <div
            style={{
              background: "#0a1520",
              border: "1px solid #1e2d3d",
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "16px",
            }}
          >
            <h2 style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "#3b82f6", margin: "0 0 18px" }}>
              Property Details
            </h2>
            <InputField label="Property Value" value={propertyValue} onChange={setPropertyValue} prefix="$" />
            <InputField label="Weekly Rent" value={weeklyRent} onChange={setWeeklyRent} prefix="$" hint="Expected weekly rental income" />
            <InputField label="Vacancy Rate" value={vacancyRate} onChange={setVacancyRate} suffix="%" hint="Typical AU vacancy: 2–5%" />
          </div>

          {/* Expenses */}
          <div
            style={{
              background: "#0a1520",
              border: "1px solid #1e2d3d",
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "16px",
            }}
          >
            <h2 style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "#3b82f6", margin: "0 0 18px" }}>
              Expenses
            </h2>
            <InputField label="Property Management Fee" value={managementFee} onChange={setManagementFee} suffix="%" hint="% of collected rent (typically 7–10%)" />
            <InputField label="Annual Expenses" value={annualExpenses} onChange={setAnnualExpenses} prefix="$" hint="Rates, insurance, maintenance, strata" />
          </div>

          {/* Financing */}
          <div
            style={{
              background: "#0a1520",
              border: "1px solid #1e2d3d",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <h2 style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "#3b82f6", margin: "0 0 18px" }}>
              Financing (Optional)
            </h2>
            <InputField label="Loan Amount" value={loanAmount} onChange={setLoanAmount} prefix="$" hint="For cash-on-cash & net yield calculations" />
            <InputField label="Interest Rate" value={interestRate} onChange={setInterestRate} suffix="%" hint="Annual interest rate (interest-only)" />
          </div>
        </div>

        {/* Right — Results */}
        <div>
          {/* Yield Rating Badge */}
          {rating && (
            <div
              style={{
                background: "#0a1520",
                border: `1px solid ${rating.color}33`,
                borderRadius: "12px",
                padding: "16px 20px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#7c8fa6", marginBottom: "4px" }}>
                  Yield Rating
                </div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: rating.color }}>
                  {rating.label}
                </div>
              </div>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  border: `3px solid ${rating.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                }}
              >
                {rating.label === "Excellent" ? "🌟" : rating.label === "Good" ? "✅" : rating.label === "Average" ? "⚠️" : "🔴"}
              </div>
            </div>
          )}

          {/* Key Yields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <ResultCard
              label="Gross Yield"
              value={results ? formatPct(results.grossYield) : "—"}
              sub="Before expenses"
              highlight
            />
            <ResultCard
              label="Net Yield"
              value={results ? formatPct(results.netYield) : "—"}
              sub="After all expenses"
              highlight
              accent={results && results.netYield < 0 ? "#ef4444" : "#60a5fa"}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <ResultCard
              label="Cash-on-Cash Return"
              value={results ? formatPct(results.cashOnCashYield) : "—"}
              sub="Net income ÷ equity invested"
              accent={results && results.cashOnCashYield < 0 ? "#ef4444" : "#a78bfa"}
            />
          </div>

          {/* Income Breakdown */}
          <div
            style={{
              background: "#0a1520",
              border: "1px solid #1e2d3d",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "16px",
            }}
          >
            <h2 style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "#7c8fa6", margin: "0 0 14px" }}>
              Annual Income Breakdown
            </h2>
            {[
              { label: "Gross Annual Rent", value: results?.annualGrossRent, color: "#22c55e" },
              { label: `Vacancy Loss (${vacancyRate}%)`, value: results ? -(results.annualGrossRent - results.effectiveRent) : null, color: "#ef4444" },
              { label: "Effective Rental Income", value: results?.effectiveRent, color: "#60a5fa", bold: true },
              { label: `Mgmt Fees (${managementFee}%)`, value: results ? -results.mgmtCost : null, color: "#f87171" },
              { label: "Other Expenses", value: -parseFloat(annualExpenses) || 0, color: "#f87171" },
              { label: `Interest Cost (${interestRate}%)`, value: results ? -results.interestCost : null, color: "#f87171" },
              { label: "Net Annual Income", value: results?.netIncome, color: results?.netIncome >= 0 ? "#22c55e" : "#ef4444", bold: true, divider: true },
            ].map((row, i) => (
              <div key={i}>
                {row.divider && <div style={{ borderTop: "1px solid #1e2d3d", margin: "10px 0" }} />}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "5px 0",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: row.bold ? "#c4d0df" : "#7c8fa6",
                      fontWeight: row.bold ? "600" : "400",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {row.label}
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: row.bold ? "700" : "500",
                      color: row.value === null ? "#4a5f73" : row.color,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {row.value === null ? "—" : formatCurrency(row.value)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Weekly Cashflow */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <ResultCard
              label="Weekly Rent Received"
              value={results ? formatCurrency(results.effectiveRent / 52) : "—"}
              sub="After vacancy"
            />
            <ResultCard
              label="Weekly Net Cashflow"
              value={results ? formatCurrency(results.weeklyCashflow) : "—"}
              sub="After all costs"
              accent={results && results.weeklyCashflow < 0 ? "#ef4444" : "#22c55e"}
            />
          </div>

          {/* Benchmark note */}
          <div
            style={{
              marginTop: "16px",
              background: "#0a1520",
              border: "1px solid #1e2d3d",
              borderRadius: "10px",
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "#7c8fa6", marginBottom: "8px" }}>
              AU Yield Benchmarks
            </div>
            {[
              { range: "≥ 7%", label: "Excellent", color: "#22c55e" },
              { range: "5.5 – 7%", label: "Good", color: "#84cc16" },
              { range: "4 – 5.5%", label: "Average", color: "#f59e0b" },
              { range: "< 4%", label: "Below Average", color: "#ef4444" },
            ].map((b) => (
              <div key={b.label} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                <span style={{ fontSize: "12px", color: "#4a5f73", fontFamily: "'DM Mono', monospace" }}>{b.range}</span>
                <span style={{ fontSize: "12px", color: b.color, fontWeight: "600" }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

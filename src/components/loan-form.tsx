"use client";

import { useMemo, useState } from "react";

type LoanFormProps = {
  action: (formData: FormData) => void | Promise<void>;
};

const percentagePresets = [10, 15, 20, 25, 30, 35, 40, 50];

function parseMoney(value: string): number {
  const cleaned = value.replaceAll(".", "").replaceAll(",", "").trim();
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parsePercentage(value: string): number {
  const cleaned = value.replace(",", ".").trim();
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function LoanForm({ action }: LoanFormProps) {
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("20");

  const totalAmount = useMemo(() => {
    const principal = parseMoney(principalAmount);
    const rate = parsePercentage(interestRate);
    if (!principal || !rate) {
      return 0;
    }

    return Math.round(principal * (1 + rate / 100));
  }, [principalAmount, interestRate]);

  const totalFormatter = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  return (
    <form action={action} className="app-surface flex flex-col gap-4 p-8">
      <h2 className="text-xl font-bold text-emerald-900 mb-2">Registrar nuevo préstamo</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Fecha del préstamo</label>
          <input name="loanDate" type="date" required className="input-field" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Nombre completo</label>
          <input name="fullName" required placeholder="Nombre completo" className="input-field" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Valor del préstamo</label>
          <input
            name="principalAmount"
            required
            placeholder="Ej: 500000"
            className="input-field"
            value={principalAmount}
            onChange={(event) => setPrincipalAmount(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Porcentaje de cobro</label>
          <input
            name="interestRate"
            required
            list="percentage-presets"
            placeholder="Escribe o elige el porcentaje"
            className="input-field"
            value={interestRate}
            onChange={(event) => setInterestRate(event.target.value)}
          />
          <datalist id="percentage-presets">
            {percentagePresets.map((preset) => (
              <option key={preset} value={preset} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Valor de la cuota</label>
          <input name="installmentAmount" required placeholder="Ej: 30000" className="input-field" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Fecha de la primera cuota</label>
          <input name="firstInstallmentDate" type="date" required className="input-field" />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Total a pagar calculado</label>
          <input
            name="totalAmountPreview"
            readOnly
            tabIndex={-1}
            value={totalAmount ? totalFormatter.format(totalAmount) : "Ingresa valor y porcentaje"}
            className="input-field bg-[#f4efe6] text-slate-700"
          />
          <p className="text-xs text-slate-500">El total se calcula automáticamente según el porcentaje que escribas.</p>
        </div>
      </div>
      <button type="submit" className="btn-primary mt-4">Registrar préstamo</button>
    </form>
  );
}

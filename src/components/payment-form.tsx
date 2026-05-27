"use client";

import { useMemo, useRef, useState } from "react";

type PaymentLoan = {
  id: number;
  totalAmount: number;
  installmentAmount: number;
  client: {
    fullName: string;
  };
  payments: Array<{
    amount: number;
  }>;
};

type PaymentFormProps = {
  loans: PaymentLoan[];
  action: (formData: FormData) => void | Promise<void>;
};

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function PaymentForm({ loans, action }: PaymentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loanId, setLoanId] = useState<string>("");

  async function handleSubmit(formData: FormData) {
    await action(formData);
    handleClearForm();
  }

  function handleClearForm() {
    formRef.current?.reset();
    setLoanId("");
  }

  const selectedLoan = useMemo(
    () => loans.find((loan) => loan.id.toString() === loanId) ?? null,
    [loanId, loans],
  );

  const paid = selectedLoan
    ? selectedLoan.payments.reduce((sum, payment) => sum + payment.amount, 0)
    : 0;
  const pending = selectedLoan ? Math.max(selectedLoan.totalAmount - paid, 0) : 0;

  return (
    <form ref={formRef} action={handleSubmit} className="app-surface flex flex-col gap-4 p-8">
      <h2 className="text-xl font-bold text-emerald-900 mb-2">Registrar pago de cuota</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Selecciona préstamo activo</label>
          <select
            name="loanId"
            required
            className="input-field"
            value={loanId}
            onChange={(event) => setLoanId(event.target.value)}
          >
            <option value="">Selecciona un préstamo</option>
            {loans.map((loan) => {
              const loanPaid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
              const loanPending = Math.max(loan.totalAmount - loanPaid, 0);

              return (
                <option key={loan.id} value={loan.id.toString()}>
                  {loan.client.fullName} - Saldo {currencyFormatter.format(loanPending)}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Saldo restante del cliente seleccionado</label>
          <input
            readOnly
            tabIndex={-1}
            value={selectedLoan ? currencyFormatter.format(pending) : "Selecciona un préstamo para ver el saldo"}
            className="input-field bg-[#f4efe6] text-slate-700"
          />
          <p className="text-xs text-slate-500">
            Se actualiza automáticamente con el préstamo que elijas.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Valor de la cuota pagada</label>
          <input name="amount" required placeholder="Ej: 30000" className="input-field" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Fecha de pago</label>
          <input name="paymentDate" type="date" required className="input-field" />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Nota (opcional)</label>
          <input name="note" placeholder="Ej: abono extra, pago parcial..." className="input-field" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" className="btn-primary">Registrar pago</button>
        <button
          type="button"
          onClick={handleClearForm}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Limpiar formulario
        </button>
      </div>
    </form>
  );
}

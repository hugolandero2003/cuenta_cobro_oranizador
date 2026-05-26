"use client";

import { useMemo, useState } from "react";
import { deleteClientAction } from "@/app/actions";

type LoanStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

type ClientHistory = {
  id: number;
  fullName: string;
  phone: string | null;
  loans: Array<{
    id: number;
    principalAmount: number;
    totalAmount: number;
    installmentAmount: number;
    status: LoanStatus;
    createdAt: string;
    payments: Array<{
      id: number;
      amount: number;
      paidAt: string;
      note: string | null;
    }>;
  }>;
};

type Props = {
  clients: ClientHistory[];
};

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const statusLabels: Record<LoanStatus, string> = {
  ACTIVE: "Activo",
  COMPLETED: "Finalizado",
  CANCELLED: "Cancelado",
};

const statusColors: Record<LoanStatus, string> = {
  ACTIVE: "bg-amber-500",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-rose-400",
};

export function ClientHistoryPanel({ clients }: Props) {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const modalMetrics = useMemo(() => {
    if (!selectedClient) {
      return null;
    }

    const loans = selectedClient.loans;
    const active = loans.filter((loan) => loan.status === "ACTIVE").length;
    const completed = loans.filter((loan) => loan.status === "COMPLETED").length;
    const cancelled = loans.filter((loan) => loan.status === "CANCELLED").length;
    const totalPaid = loans.reduce(
      (sum, loan) => sum + loan.payments.reduce((inner, payment) => inner + payment.amount, 0),
      0,
    );
    const totalPending = loans.reduce((sum, loan) => {
      const paid = loan.payments.reduce((inner, payment) => inner + payment.amount, 0);
      return sum + Math.max(loan.totalAmount - paid, 0);
    }, 0);

    return { active, completed, cancelled, totalPaid, totalPending };
  }, [selectedClient]);

  return (
    <>
      <section className="app-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-emerald-900">Clientes registrados</h2>
          <p className="text-sm text-slate-500">Detalle y eliminación rápida por cliente.</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {clients.length === 0 ? (
            <p className="text-sm text-slate-500">No hay clientes registrados.</p>
          ) : (
            clients.map((client) => {
              const totalLoans = client.loans.length;
              const activeLoans = client.loans.filter((loan) => loan.status === "ACTIVE").length;
              const totalPending = client.loans.reduce((sum, loan) => {
                const paid = loan.payments.reduce((inner, payment) => inner + payment.amount, 0);
                return sum + Math.max(loan.totalAmount - paid, 0);
              }, 0);

              return (
                <article key={client.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900">{client.fullName}</h3>
                      <p className="text-xs text-slate-500">{totalLoans} préstamo(s) · {activeLoans} activo(s)</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-700">{currencyFormatter.format(totalPending)}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setSelectedClientId(client.id)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                      Detalle
                    </button>
                    <form action={deleteClientAction}>
                      <input type="hidden" name="clientId" value={client.id.toString()} />
                      <button type="submit" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                        Eliminar
                      </button>
                    </form>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {selectedClient ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="app-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="panel-kicker">Detalle de cliente</p>
                <h3 className="mt-1 text-2xl font-black text-slate-900">{selectedClient.fullName}</h3>
                <p className="text-sm text-slate-500">Historial, estado y resumen visual de préstamos.</p>
              </div>
              <button type="button" onClick={() => setSelectedClientId(null)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Cerrar
              </button>
            </div>

            {modalMetrics ? (
              <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <article className="panel-card">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Activos</p>
                  <p className="mt-2 text-2xl font-extrabold text-emerald-900">{modalMetrics.active}</p>
                </article>
                <article className="panel-card">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Finalizados</p>
                  <p className="mt-2 text-2xl font-extrabold text-emerald-900">{modalMetrics.completed}</p>
                </article>
                <article className="panel-card">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pagado</p>
                  <p className="mt-2 text-2xl font-extrabold text-emerald-900">{currencyFormatter.format(modalMetrics.totalPaid)}</p>
                </article>
                <article className="panel-card">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pendiente</p>
                  <p className="mt-2 text-2xl font-extrabold text-amber-700">{currencyFormatter.format(modalMetrics.totalPending)}</p>
                </article>
              </section>
            ) : null}

            {modalMetrics ? (
              <section className="mt-5 grid gap-5 lg:grid-cols-2">
                <article className="app-surface p-5">
                  <h4 className="text-lg font-bold text-slate-900">Estado del cliente</h4>
                  <div className="mt-4 space-y-4">
                    {[
                      { label: "Activo", value: modalMetrics.active, color: "bg-amber-500" },
                      { label: "Finalizado", value: modalMetrics.completed, color: "bg-emerald-500" },
                      { label: "Cancelado", value: modalMetrics.cancelled, color: "bg-rose-400" },
                    ].map((item) => {
                      const max = Math.max(modalMetrics.active, modalMetrics.completed, modalMetrics.cancelled, 1);
                      return (
                        <div key={item.label}>
                          <div className="mb-1 flex items-center justify-between text-sm font-semibold">
                            <span>{item.label}</span>
                            <span>{item.value}</span>
                          </div>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>

                <article className="app-surface p-5">
                  <h4 className="text-lg font-bold text-slate-900">Resumen de historial</h4>
                  <p className="mt-1 text-sm text-slate-500">Préstamos y últimos movimientos registrados.</p>
                  <div className="mt-4 space-y-3">
                    {selectedClient.loans.length === 0 ? (
                      <p className="text-sm text-slate-500">Sin historial de préstamos.</p>
                    ) : (
                      selectedClient.loans.map((loan) => {
                        const paid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
                        const pending = Math.max(loan.totalAmount - paid, 0);

                        return (
                          <div key={loan.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-slate-800">Préstamo #{loan.id}</p>
                              <span className={`rounded-full px-2 py-1 text-xs font-semibold text-white ${statusColors[loan.status]}`}>{statusLabels[loan.status]}</span>
                            </div>
                            <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                              <p>Total: <span className="font-semibold">{currencyFormatter.format(loan.totalAmount)}</span></p>
                              <p>Pagado: <span className="font-semibold">{currencyFormatter.format(paid)}</span></p>
                              <p>Saldo: <span className="font-semibold">{currencyFormatter.format(pending)}</span></p>
                            </div>
                            <div className="mt-2 text-xs text-slate-500">
                              {loan.payments.length === 0 ? (
                                <p>Sin pagos registrados.</p>
                              ) : (
                                loan.payments.slice(0, 4).map((payment) => (
                                  <p key={payment.id}>
                                    {new Date(payment.paidAt).toLocaleDateString("es-CO")} - {currencyFormatter.format(payment.amount)}
                                    {payment.note ? ` (${payment.note})` : ""}
                                  </p>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </article>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

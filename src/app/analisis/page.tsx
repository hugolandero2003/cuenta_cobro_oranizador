import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "@/app/auth-actions";
import { requireAuth } from "@/lib/auth";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

type StatusType = "ACTIVE" | "COMPLETED" | "CANCELLED";

function getStatusBadge(status: StatusType): string {
  if (status === "ACTIVE") {
    return "bg-amber-100 text-amber-800 border-amber-300";
  }

  if (status === "COMPLETED") {
    return "bg-emerald-100 text-emerald-800 border-emerald-300";
  }

  return "bg-rose-100 text-rose-800 border-rose-300";
}

function getStatusText(status: StatusType): string {
  if (status === "ACTIVE") {
    return "Activo";
  }

  if (status === "COMPLETED") {
    return "Finalizado";
  }

  return "Cancelado";
}

export const dynamic = "force-dynamic";

export default async function AnalisisPage() {
  await requireAuth();

  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      loans: {
        orderBy: { createdAt: "desc" },
        include: {
          payments: {
            orderBy: { paidAt: "desc" },
            select: {
              id: true,
              amount: true,
              paidAt: true,
              note: true,
            },
          },
        },
      },
    },
  });

  const allLoans = clients.flatMap((client) => client.loans);

  const totalPrestado = allLoans.reduce((sum, loan) => sum + loan.principalAmount, 0);
  const totalProgramado = allLoans.reduce((sum, loan) => sum + loan.totalAmount, 0);
  const totalRecibido = allLoans.reduce(
    (sum, loan) => sum + loan.payments.reduce((inner, payment) => inner + payment.amount, 0),
    0,
  );
  const saldoPrestado = Math.max(totalProgramado - totalRecibido, 0);
  const ganancias = allLoans.reduce((sum, loan) => sum + (loan.totalAmount - loan.principalAmount), 0);

  const maxMetric = Math.max(ganancias, saldoPrestado, totalRecibido, 1);
  const collectionPercent = totalProgramado > 0 ? Math.min((totalRecibido / totalProgramado) * 100, 100) : 0;

  const topClientes = clients
    .map((client) => {
      const pendiente = client.loans.reduce((sum, loan) => {
        const pagado = loan.payments.reduce((inner, payment) => inner + payment.amount, 0);
        return sum + Math.max(loan.totalAmount - pagado, 0);
      }, 0);

      return {
        id: client.id,
        fullName: client.fullName,
        pendiente,
      };
    })
    .filter((client) => client.pendiente > 0)
    .sort((a, b) => b.pendiente - a.pendiente)
    .slice(0, 6);

  return (
    <div className="app-shell pb-20 text-slate-900">
      <div className="app-light app-light-a" />
      <div className="app-light app-light-b" />

      <main className="app-container relative flex w-full max-w-7xl flex-col gap-6 pt-8">
        <header className="app-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="panel-kicker">Analisis financiero</p>
              <h1 className="mt-1 text-3xl font-black sm:text-4xl">Panel de métricas y rendimiento</h1>
              <p className="mt-2 text-sm text-slate-600 sm:text-base">Seguimiento de ganancias, saldo prestado, saldo recibido e historial de clientes.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/" className="btn-primary">
                Volver al panel principal
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Cerrar sesion
                </button>
              </form>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="panel-card">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ganancias</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-700">{currencyFormatter.format(ganancias)}</p>
          </article>
          <article className="panel-card">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Saldo prestado</p>
            <p className="mt-2 text-2xl font-extrabold text-amber-700">{currencyFormatter.format(saldoPrestado)}</p>
          </article>
          <article className="panel-card">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Saldo recibido</p>
            <p className="mt-2 text-2xl font-extrabold text-cyan-700">{currencyFormatter.format(totalRecibido)}</p>
          </article>
          <article className="panel-card">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Capital prestado</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-800">{currencyFormatter.format(totalPrestado)}</p>
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <article className="app-surface p-5 xl:col-span-2">
            <h2 className="text-lg font-bold">Gráfica comparativa</h2>
            <p className="text-sm text-slate-500">Comparación entre ganancias, saldo prestado y saldo recibido.</p>
            <div className="mt-5 space-y-4">
              {[
                { label: "Ganancias", value: ganancias, color: "bg-emerald-500" },
                { label: "Saldo prestado", value: saldoPrestado, color: "bg-amber-500" },
                { label: "Saldo recibido", value: totalRecibido, color: "bg-cyan-500" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-sm font-semibold">
                    <span>{item.label}</span>
                    <span>{currencyFormatter.format(item.value)}</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-700`}
                      style={{ width: `${Math.max((item.value / maxMetric) * 100, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="app-surface p-5">
            <h2 className="text-lg font-bold">Progreso de cobro</h2>
            <p className="text-sm text-slate-500">Porcentaje recibido frente al total programado.</p>
            <div className="mt-5 flex items-center justify-center">
              <div
                className="relative grid h-44 w-44 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#0f766e ${collectionPercent}%, #e2e8f0 ${collectionPercent}% 100%)`,
                }}
              >
                <div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center shadow-inner">
                  <p className="text-3xl font-black text-emerald-700">{Math.round(collectionPercent)}%</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Recuperado</p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="app-surface p-5">
            <h2 className="text-lg font-bold">Clientes con mayor saldo pendiente</h2>
            <div className="mt-4 space-y-3">
              {topClientes.length === 0 ? (
                <p className="text-sm text-slate-500">No hay saldos pendientes actualmente.</p>
              ) : (
                topClientes.map((client) => (
                  <div key={client.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-800">{client.fullName}</p>
                      <p className="text-sm font-bold text-amber-700">{currencyFormatter.format(client.pendiente)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="app-surface p-5">
            <h2 className="text-lg font-bold">Resumen de cartera</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-600">Total programado a cobrar</span>
                <span className="font-semibold">{currencyFormatter.format(totalProgramado)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-600">Total recibido</span>
                <span className="font-semibold">{currencyFormatter.format(totalRecibido)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-600">Saldo pendiente actual</span>
                <span className="font-semibold text-amber-700">{currencyFormatter.format(saldoPrestado)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-600">Ganancia proyectada (20%)</span>
                <span className="font-semibold text-emerald-700">{currencyFormatter.format(ganancias)}</span>
              </div>
            </div>
          </article>
        </section>

        <section className="app-surface p-5">
          <h2 className="text-lg font-bold">Historial de clientes y estado de préstamos</h2>
          <div className="mt-4 space-y-4">
            {clients.length === 0 ? (
              <p className="text-sm text-slate-500">No hay clientes registrados.</p>
            ) : (
              clients.map((client) => (
                <article key={client.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-800">{client.fullName}</h3>
                    <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                      {client.loans.length} préstamo(s)
                    </span>
                  </div>

                  <div className="mt-3 space-y-3">
                    {client.loans.length === 0 ? (
                      <p className="text-sm text-slate-500">Sin historial de préstamos.</p>
                    ) : (
                      client.loans.map((loan) => {
                        const paid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
                        const pending = Math.max(loan.totalAmount - paid, 0);

                        return (
                          <div key={loan.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-700">
                                Préstamo #{loan.id} - {currencyFormatter.format(loan.principalAmount)}
                              </p>
                              <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${getStatusBadge(loan.status)}`}>
                                {getStatusText(loan.status)}
                              </span>
                            </div>
                            <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                              <p>Total: <span className="font-semibold">{currencyFormatter.format(loan.totalAmount)}</span></p>
                              <p>Pagado: <span className="font-semibold">{currencyFormatter.format(paid)}</span></p>
                              <p>Saldo: <span className="font-semibold">{currencyFormatter.format(pending)}</span></p>
                            </div>
                            <div className="mt-2 text-xs text-slate-500">
                              <p className="font-semibold text-slate-600">Últimos pagos:</p>
                              {loan.payments.length === 0 ? (
                                <p>Sin pagos registrados.</p>
                              ) : (
                                loan.payments.slice(0, 3).map((payment) => (
                                  <p key={payment.id}>
                                    {payment.paidAt.toLocaleDateString("es-CO")} - {currencyFormatter.format(payment.amount)}
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
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

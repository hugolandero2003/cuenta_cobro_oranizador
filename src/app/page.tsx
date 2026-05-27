import { createLoanAction, markCollectionAlertHandledAction, registerPaymentAction } from "./actions";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { logoutAction } from "./auth-actions";
import { requireAuth } from "@/lib/auth";
import { LoanForm } from "@/components/loan-form";
import { ClientHistoryPanel } from "@/components/client-history-panel";
import { PaymentForm } from "@/components/payment-form";

type DashboardData = {
  clients: Array<{
    id: number;
    fullName: string;
    phone: string | null;
    loans: Array<{
      id: number;
      principalAmount: number;
      totalAmount: number;
      installmentAmount: number;
      status: "ACTIVE" | "COMPLETED" | "CANCELLED";
      createdAt: Date;
      payments: Array<{
        id: number;
        amount: number;
        paidAt: Date;
        note: string | null;
      }>;
    }>;
  }>;
  activeLoans: Array<{
    id: number;
    totalAmount: number;
    installmentAmount: number;
    installmentsCount: number;
    firstInstallmentDate: Date | null;
    lastHandledDueInstallment: number | null;
    lastHandledAt: Date | null;
    createdAt: Date;
    client: {
      fullName: string;
    };
    payments: Array<{ amount: number }>;
  }>;
};

type CollectionAlert = {
  loanId: number;
  clientName: string;
  pendingAmount: number;
  nextDueDate: Date;
  dueInstallments: number;
  isOverdue: boolean;
  overdueDays: number;
};

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function normalizeDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
}

function addMonthsKeepingDay(date: Date, months: number): Date {
  return normalizeDateOnly(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), 12, 0, 0)));
}

function elapsedMonths(startDate: Date, endDate: Date): number {
  let months =
    (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    (endDate.getUTCMonth() - startDate.getUTCMonth());

  if (endDate.getUTCDate() < startDate.getUTCDate()) {
    months -= 1;
  }

  return months;
}

function buildCollectionAlerts(activeLoans: DashboardData["activeLoans"]): CollectionAlert[] {
  const today = normalizeDateOnly(new Date());
  const dayMs = 1000 * 60 * 60 * 24;

  const alerts = activeLoans
    .map((loan) => {
      const startDate = normalizeDateOnly(loan.firstInstallmentDate ?? loan.createdAt);
      if (today.getTime() < startDate.getTime()) {
        return null;
      }

      const monthsFromStart = elapsedMonths(startDate, today);
      const dueInstallments = Math.min(loan.installmentsCount, Math.max(monthsFromStart + 1, 0));
      const expectedPaid = Math.min(dueInstallments * loan.installmentAmount, loan.totalAmount);
      const paidAmount = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const pendingAmount = Math.max(expectedPaid - paidAmount, 0);

      if (pendingAmount <= 0) {
        return null;
      }

      if (loan.lastHandledDueInstallment !== null && loan.lastHandledDueInstallment >= dueInstallments) {
        return null;
      }

      const coveredInstallments = Math.floor(paidAmount / loan.installmentAmount);
      const nextDueInstallmentIndex = Math.min(coveredInstallments, Math.max(loan.installmentsCount - 1, 0));
      const nextDueDate = addMonthsKeepingDay(startDate, nextDueInstallmentIndex);
      const overdueDays = Math.max(Math.floor((today.getTime() - nextDueDate.getTime()) / dayMs), 0);

      return {
        loanId: loan.id,
        clientName: loan.client.fullName,
        pendingAmount,
        nextDueDate,
        dueInstallments,
        isOverdue: overdueDays > 0,
        overdueDays,
      };
    })
    .filter((alert): alert is CollectionAlert => alert !== null)
    .sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) {
        return a.isOverdue ? -1 : 1;
      }

      return a.nextDueDate.getTime() - b.nextDueDate.getTime();
    });

  return alerts;
}

export const dynamic = "force-dynamic";

async function getDashboardData(): Promise<{ data: DashboardData | null; dbError: string | null }> {
  if (!process.env.DATABASE_URL) {
    return {
      data: null,
      dbError: "Configura la variable DATABASE_URL para iniciar la base de datos.",
    };
  }

  try {
    const [clients, activeLoans] = await Promise.all([
      prisma.client.findMany({
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
      }),
      prisma.loan.findMany({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: {
              fullName: true,
            },
          },
          payments: {
            select: {
              amount: true,
            },
          },
        },
      }),
    ]);

    return {
      data: {
        clients,
        activeLoans,
      },
      dbError: null,
    };
  } catch {
    return {
      data: null,
      dbError: "No fue posible consultar la base de datos. Revisa conexion y migraciones.",
    };
  }
}

export default async function Home() {
  await requireAuth();

  const { data, dbError } = await getDashboardData();

  const clients = data?.clients ?? [];
  const activeLoans = data?.activeLoans ?? [];
  const clientHistory = clients.map((client) => ({
    id: client.id,
    fullName: client.fullName,
    phone: client.phone,
    loans: client.loans.map((loan) => ({
      id: loan.id,
      principalAmount: loan.principalAmount,
      totalAmount: loan.totalAmount,
      installmentAmount: loan.installmentAmount,
      status: loan.status,
      createdAt: loan.createdAt.toISOString(),
      payments: loan.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        paidAt: payment.paidAt.toISOString(),
          note: payment.note,
      })),
    })),
  }));
  const totalClients = clients.length;
  const totalActiveLoans = activeLoans.length;
  const collectionAlerts = buildCollectionAlerts(activeLoans);
  const overdueAlerts = collectionAlerts.filter((alert) => alert.isOverdue);
  const todayAlerts = collectionAlerts.filter(
    (alert) => !alert.isOverdue && normalizeDateOnly(alert.nextDueDate).getTime() === normalizeDateOnly(new Date()).getTime(),
  );
  const activePortfolio = activeLoans.reduce((acc, loan) => {
    const paid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
    return acc + Math.max(loan.totalAmount - paid, 0);
  }, 0);

  return (
    <div className="app-shell pb-20 text-slate-900">
      <div className="app-light app-light-a" />
      <div className="app-light app-light-b" />

      <main className="app-container relative flex w-full max-w-6xl flex-col gap-6 pt-8">
        <header className="app-surface flex flex-col gap-2 p-8">
          <h1 className="text-4xl font-black tracking-tight text-emerald-900 drop-shadow-sm">Panel de Préstamos y Cobros</h1>
          <p className="text-lg text-slate-700 font-medium">Gestión profesional de préstamos personales — registro, cuotas y control automático al 20% mensual.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href="/analisis" className="btn-primary inline-flex items-center justify-center">
              Ir al panel de análisis
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Cerrar sesion
              </button>
            </form>
          </div>
          {dbError ? (
            <p className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{dbError}</p>
          ) : null}
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <article className="panel-card">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Clientes</p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-900">{totalClients}</p>
          </article>
          <article className="panel-card">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Prestamos activos</p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-900">{totalActiveLoans}</p>
          </article>
          <article className="panel-card">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Saldo por cobrar</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-900 sm:text-3xl">{currencyFormatter.format(activePortfolio)}</p>
          </article>
        </section>

        <section className="app-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-emerald-900">Alarmas de cobro</h2>
            <p className="text-sm text-slate-500">Te avisa quién debe pagar hoy o ya está vencido.</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-rose-700">Vencidos</p>
              <p className="mt-1 text-2xl font-black text-rose-700">{overdueAlerts.length}</p>
            </article>
            <article className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-amber-700">Para hoy</p>
              <p className="mt-1 text-2xl font-black text-amber-700">{todayAlerts.length}</p>
            </article>
            <article className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-emerald-700">Total alertas</p>
              <p className="mt-1 text-2xl font-black text-emerald-700">{collectionAlerts.length}</p>
            </article>
          </div>

          <div className="mt-4 max-h-60 space-y-2 overflow-y-auto pr-1">
            {collectionAlerts.length === 0 ? (
              <p className="text-sm text-slate-500">No hay cuotas pendientes para hoy ni vencidas.</p>
            ) : (
              collectionAlerts.map((alert) => (
                <article key={alert.loanId} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800">{alert.clientName}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${alert.isOverdue ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                      {alert.isOverdue ? `Vencido hace ${alert.overdueDays} día(s)` : "Paga hoy"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Fecha de cobro: {dateFormatter.format(alert.nextDueDate)}</p>
                  <p className="text-sm font-semibold text-emerald-700">Monto pendiente de esta cuota: {currencyFormatter.format(alert.pendingAmount)}</p>
                  <form action={markCollectionAlertHandledAction} className="mt-2">
                    <input type="hidden" name="loanId" value={alert.loanId.toString()} />
                    <input type="hidden" name="dueInstallments" value={alert.dueInstallments.toString()} />
                    <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                      Atendido
                    </button>
                  </form>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <LoanForm action={createLoanAction} />

          <PaymentForm loans={activeLoans} action={registerPaymentAction} />
        </section>

        <section className="app-surface p-5">
          <h2 className="text-lg font-bold text-emerald-900">Prestamos activos</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.15em] text-slate-500">
                  <th className="px-2 py-2">Cliente</th>
                  <th className="px-2 py-2">Cuota sugerida</th>
                  <th className="px-2 py-2">Total</th>
                  <th className="px-2 py-2">Pagado</th>
                  <th className="px-2 py-2">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {activeLoans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-6 text-center text-slate-500">
                      No hay prestamos activos.
                    </td>
                  </tr>
                ) : (
                  activeLoans.map((loan) => {
                    const paid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
                    const pending = Math.max(loan.totalAmount - paid, 0);
                    return (
                      <tr key={loan.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-2 py-3 font-semibold">{loan.client.fullName}</td>
                        <td className="px-2 py-3">{currencyFormatter.format(loan.installmentAmount)}</td>
                        <td className="px-2 py-3">{currencyFormatter.format(loan.totalAmount)}</td>
                        <td className="px-2 py-3">{currencyFormatter.format(paid)}</td>
                        <td className="px-2 py-3 font-semibold text-emerald-700">{currencyFormatter.format(pending)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <ClientHistoryPanel clients={clientHistory} />
      </main>
    </div>
  );
}

import { createLoanAction, registerPaymentAction } from "./actions";
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
    createdAt: Date;
    client: {
      fullName: string;
    };
    payments: Array<{ amount: number }>;
  }>;
};

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

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

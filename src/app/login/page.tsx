import { loginAction } from "@/app/auth-actions";
import { hasSession } from "@/lib/auth";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await hasSession()) {
    redirect("/");
  }

  const params = (await searchParams) ?? {};
  const error = params.error;

  return (
    <div className="app-shell">
      <div className="app-light app-light-a" />
      <div className="app-light app-light-b" />

      <main className="app-container min-h-screen flex items-center justify-center py-10">
        <section className="app-surface w-full max-w-xl p-8 sm:p-10">
          <p className="panel-kicker">Acceso privado</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">Iniciar sesion</h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Este sistema es de uso personal. Ingresa tus credenciales para acceder a los paneles.
          </p>

          {error ? (
            <p className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </p>
          ) : null}

          <form action={loginAction} className="mt-6 grid gap-4">
            <div className="grid gap-1">
              <label className="text-sm font-medium text-slate-700">Usuario</label>
              <input name="username" required placeholder="Usuario" className="input-field" autoComplete="username" />
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-medium text-slate-700">Contrasena</label>
              <input
                name="password"
                type="password"
                required
                placeholder="Contrasena"
                className="input-field"
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn-primary mt-2">
              Entrar al sistema
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";

export function LoginForm({ authConfigured }: { authConfigured: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const callbackUrl = searchParams.get("callbackUrl") || "/client-portal";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);
    if (result?.error) {
      setError("We could not verify those credentials.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="grid min-h-screen bg-slate-950 text-white lg:grid-cols-[0.95fr_1.05fr]">
      <section className="hidden min-h-screen flex-col justify-between overflow-hidden border-r border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,.24),transparent_30%),linear-gradient(135deg,#061225,#0b1730_45%,#111827)] p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-lg bg-sky-400 font-black text-slate-950">
            S
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-sky-200">Ship Media Digital</p>
            <h1 className="text-2xl font-semibold">Client Management Portal</h1>
          </div>
        </div>

        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-white/10 px-3 py-1 text-sm text-sky-100">
            <ShieldCheck size={16} />
            Secure lead operations
          </div>
          <h2 className="text-5xl font-semibold leading-tight">
            Livablinds leads, sales status, and internal notes in one protected workspace.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Built for fast customer lookup, clean pipeline visibility, and real-time lead sync.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm text-slate-300">
          {["Real-time lead sync", "Encrypted password", "Protected routes"].map((item) => (
            <div key={item} className="rounded-lg border border-white/10 bg-white/5 p-4">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid size-10 place-items-center rounded-lg bg-sky-500 font-black text-white">
              S
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">
                Ship Media Digital
              </p>
              <h1 className="font-semibold">Client Management Portal</h1>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/70 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/20">
            <div className="mb-7">
              <p className="text-sm font-medium text-sky-600 dark:text-sky-300">Authorized access</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Sign in</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Use your portal email and password to access customer records.
              </p>
            </div>

            {!authConfigured ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
                Authentication environment variables are required before login is enabled.
              </div>
            ) : null}

            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Email</span>
                <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-slate-950">
                  <Mail size={18} className="text-slate-400" />
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">Password</span>
                <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-slate-950">
                  <LockKeyhole size={18} className="text-slate-400" />
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </span>
              </label>

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              <button
                className="h-11 w-full rounded-lg bg-slate-950 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-400"
                disabled={loading || !authConfigured}
              >
                {loading ? "Signing in..." : "Open portal"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

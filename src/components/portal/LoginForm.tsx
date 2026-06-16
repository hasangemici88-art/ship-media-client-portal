"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

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
    <div className="grid min-h-screen bg-[#f7f8fb] text-slate-950 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="hidden min-h-screen flex-col justify-between overflow-hidden border-r border-slate-200 bg-white p-10 lg:flex">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-11 w-auto" />
        </div>

        <div className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
            <ShieldCheck size={16} />
            Secure lead operations
          </div>
          <h2 className="text-5xl font-semibold leading-tight tracking-tight text-slate-950">
            Livablinds leads, sales status, and internal notes in one protected workspace.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
            Built for fast customer lookup, clean pipeline visibility, and direct Google Sheets
            synchronization.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm font-semibold text-slate-700">
          {["Google Sheets sync", "Encrypted password", "Protected routes"].map((item) => (
            <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-5 py-10 text-slate-950">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandLogo className="h-9 w-auto" />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/70">
            <div className="mb-7">
              <p className="text-sm font-medium text-sky-600">Authorized access</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Sign in</h2>
              <p className="mt-2 text-sm text-slate-500">
                Use your portal email and password to access customer records.
              </p>
            </div>

            {!authConfigured ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Authentication environment variables are required before login is enabled.
              </div>
            ) : null}

            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Email</span>
                <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
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
                <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
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
                className="h-11 w-full rounded-lg bg-slate-950 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
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

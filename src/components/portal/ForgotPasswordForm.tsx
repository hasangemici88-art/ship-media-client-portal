"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Mail } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setError(body.message || "Could not start reset. Try again shortly.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f7f8fb] px-5 py-10 text-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <BrandLogo className="h-10 w-auto" />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/70">
          <div className="mb-7">
            <p className="text-sm font-medium text-sky-600">Password help</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Forgot password</h2>
            <p className="mt-2 text-sm text-slate-500">
              Enter your portal email. If the address is recognized, we&apos;ll send a reset link that expires in 30 minutes.
            </p>
          </div>

          {submitted ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              If <strong>{email}</strong> is registered, a reset link is on the way. Check your inbox (and spam).
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
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

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              <button
                className="smd-btn smd-btn-primary w-full"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <Link href="/login" className="text-slate-500 hover:text-slate-900">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

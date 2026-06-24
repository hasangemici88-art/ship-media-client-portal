"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("Missing reset token. Open the link from your email again.");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(body.message || "Could not reset password.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
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
            <p className="text-sm font-medium text-sky-600">Set new password</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Reset password</h2>
            <p className="mt-2 text-sm text-slate-500">
              Pick a strong password — at least 10 characters.
            </p>
          </div>

          {done ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Password updated. Redirecting to sign in…
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">New password</span>
                <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <LockKeyhole size={18} className="text-slate-400" />
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={10}
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">Confirm password</span>
                <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <LockKeyhole size={18} className="text-slate-400" />
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    required
                    minLength={10}
                  />
                </span>
              </label>

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              <button
                className="smd-btn smd-btn-primary w-full"
                disabled={loading}
              >
                {loading ? "Saving..." : "Set new password"}
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

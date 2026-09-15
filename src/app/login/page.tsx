"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-off-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-[360px] bg-white border border-warm-grey rounded-[2px] p-8">
        <div className="mb-8 text-center">
          <h1 className="text-[20px] font-black tracking-[-0.01em] uppercase leading-none">
            Arches™
          </h1>
          <p className="text-[10px] uppercase tracking-[0.22em] text-mid-grey mt-2">
            Production ERP
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-[12px] text-center rounded-[2px]">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-dark-grey mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-warm-grey rounded-[2px] px-3 py-2 text-[14px] bg-off-white/50 focus:bg-white focus:outline-none focus:border-near-black transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-dark-grey mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-warm-grey rounded-[2px] px-3 py-2 text-[14px] bg-off-white/50 focus:bg-white focus:outline-none focus:border-near-black transition-colors"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-near-black text-white text-[11px] uppercase tracking-[0.2em] py-3.5 rounded-[2px] mt-2 hover:opacity-85 transition-opacity"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

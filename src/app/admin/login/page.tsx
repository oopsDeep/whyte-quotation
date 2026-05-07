"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        toast.error("Invalid credentials");
      } else {
        router.push("/admin/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-whyte-dark via-whyte-blue to-whyte-dark flex items-center justify-center p-4">
      <Link
        href="/"
        className="absolute top-4 left-4 md:top-6 md:left-6 inline-flex items-center rounded-xl bg-white px-3 py-2 shadow-lg hover:bg-gray-100 transition"
        aria-label="Go to home"
      >
        <Image
          src="/company-logo.png"
          alt="Whyte logo"
          width={160}
          height={40}
          priority
          className="h-8 md:h-9 w-auto object-contain"
        />
      </Link>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 mb-4 shadow-lg">
            <Image
              src="/company-logo.png"
              alt="Whyte logo"
              width={176}
              height={44}
              priority
              className="h-9 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">Whyte Automations</h1>
          <p className="text-white/60 text-sm mt-1">Admin Panel</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Sign In</h2>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Username or Email
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition"
                placeholder="admin"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-whyte-light hover:bg-blue-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/30 disabled:opacity-60 mt-2"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

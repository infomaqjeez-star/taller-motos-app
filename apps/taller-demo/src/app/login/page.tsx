"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Chrome, Mail, Lock, Eye, EyeOff, ArrowLeft, User,
  Loader2, KeyRound, HelpCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<"email" | "username">("email");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);
  const [showForgotUsername, setShowForgotUsername] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Si es login por username, necesitamos buscar el email asociado
    let loginEmail = email;
    if (loginType === "username" && username) {
      // Aquí deberías hacer una consulta a tu API para obtener el email del username
      // Por ahora, asumimos que el username es el email para Supabase
      loginEmail = username;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    if (error) {
      setError(error.message);
    } else {
      setRecoverySent(true);
    }
    setLoading(false);
  };

  if (showRecovery) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
                <span className="text-[#003087] font-black">MJ</span>
              </div>
              <span className="font-bold text-xl text-white">MaqJeez</span>
            </Link>
            <h1 className="text-2xl font-bold text-white mb-2">Recuperar Contraseña</h1>
            <p className="text-gray-400">Te enviaremos un enlace para restablecer tu contraseña</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            {recoverySent ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">¡Email enviado!</h2>
                <p className="text-gray-400 mb-6">Revisa tu bandeja de entrada en {recoveryEmail}</p>
                <button
                  onClick={() => { setShowRecovery(false); setRecoverySent(false); }}
                  className="text-[#FFE600] hover:underline"
                >
                  Volver al login
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordRecovery} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFE600]"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#FFE600] text-[#003087] rounded-xl font-bold hover:bg-[#ffd700] transition disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Enviar Enlace de Recuperación"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowRecovery(false)}
                  className="w-full py-3 text-gray-400 hover:text-white transition"
                >
                  Volver al login
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showForgotUsername) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
                <span className="text-[#003087] font-black">MJ</span>
              </div>
              <span className="font-bold text-xl text-white">MaqJeez</span>
            </Link>
            <h1 className="text-2xl font-bold text-white mb-2">¿Olvidaste tu usuario?</h1>
            <p className="text-gray-400">Ingresa tu email y te enviaremos tu nombre de usuario</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFE600]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#FFE600] text-[#003087] rounded-xl font-bold hover:bg-[#ffd700] transition"
              >
                Recuperar Usuario
              </button>

              <button
                type="button"
                onClick={() => setShowForgotUsername(false)}
                className="w-full py-3 text-gray-400 hover:text-white transition"
              >
                Volver al login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
              <span className="text-[#003087] font-black">MJ</span>
            </div>
            <span className="font-bold text-xl text-white">MaqJeez</span>
          </Link>
          
          <h1 className="text-2xl font-bold text-white mb-2">Bienvenido de vuelta</h1>
          <p className="text-gray-400">Inicia sesión para acceder a tu panel</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Chrome className="w-5 h-5 text-blue-500" />
                Continuar con Google
              </>
            )}
          </button>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-sm text-gray-500">o</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Login Type Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setLoginType("email")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                loginType === "email" 
                  ? "bg-[#FFE600] text-[#003087]" 
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              <Mail className="w-4 h-4 inline mr-2" />
              Email
            </button>
            <button
              type="button"
              onClick={() => setLoginType("username")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                loginType === "username" 
                  ? "bg-[#FFE600] text-[#003087]" 
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Usuario
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {loginType === "email" ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFE600] transition"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nombre de Usuario</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="tu_usuario"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFE600] transition"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFE600] transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#FFE600] text-[#003087] rounded-xl font-bold hover:bg-[#ffd700] transition disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>

          {/* Recovery Links */}
          <div className="mt-6 flex flex-col gap-2 text-center">
            <button
              type="button"
              onClick={() => setShowRecovery(true)}
              className="text-sm text-gray-400 hover:text-[#FFE600] transition flex items-center justify-center gap-1"
            >
              <KeyRound className="w-4 h-4" />
              ¿Olvidaste tu contraseña?
            </button>
            <button
              type="button"
              onClick={() => setShowForgotUsername(true)}
              className="text-sm text-gray-400 hover:text-[#FFE600] transition flex items-center justify-center gap-1"
            >
              <HelpCircle className="w-4 h-4" />
              ¿Olvidaste tu usuario?
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-gray-400">
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="text-[#FFE600] hover:underline font-semibold">
                Regístrate gratis
              </Link>
            </p>
          </div>
        </div>

        {/* Back Link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 mt-8 text-gray-400 hover:text-white transition mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

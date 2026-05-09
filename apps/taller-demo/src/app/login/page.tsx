"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Chrome, Mail, Lock, Eye, EyeOff, ArrowLeft, User,
  Loader2, KeyRound, HelpCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Modo opcional: solo Google (sin email/contraseña en pantalla).
 * Por defecto: mail + Google. Activar con NEXT_PUBLIC_GOOGLE_ONLY_LOGIN=true en el build.
 */
const GOOGLE_ONLY =
  process.env.NEXT_PUBLIC_GOOGLE_ONLY_LOGIN === "true" ||
  process.env.NEXT_PUBLIC_GOOGLE_ONLY_LOGIN === "1";

export default function LoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<"email" | "username">("email");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);
  const [showForgotUsername, setShowForgotUsername] = useState(false);
  /** Tras signUp sin sesión (Supabase pide confirmar email antes de entrar). */
  const [registerEmailSent, setRegisterEmailSent] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const next = new URLSearchParams(window.location.search).get("next") || "/taller";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setRegisterEmailSent(false);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    const mail = email.trim();
    if (!mail) {
      setError("Ingresá un email válido");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: mail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: name || username,
          },
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.session) {
        router.push("/taller");
        return;
      }

      /* Confirmación por email: no hay sesión aún — no redirigir al taller (middleware bloquearía). */
      setRegisterEmailSent(true);
      setIsLogin(true);
      setEmail(mail);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    let loginEmail = email;
    if (loginType === "username" && username) {
      loginEmail = username;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }
      router.push("/");
    } finally {
      setLoading(false);
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

  if (GOOGLE_ONLY && !showRecovery && !showForgotUsername) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link href="/landing" className="mb-6 inline-flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFE600]">
                <span className="font-black text-[#003087]">MJ</span>
              </div>
              <span className="text-xl font-bold text-white">MaqJeez</span>
            </Link>
            <h1 className="mb-2 text-2xl font-bold text-white">Acceso al taller</h1>
            <p className="text-sm text-gray-400">
              Ingresá con tu cuenta de Google. El catálogo de precios es público y no requiere cuenta.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-semibold text-gray-900 transition hover:bg-gray-100 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Chrome className="h-5 w-5 text-blue-500" />
                  Continuar con Google
                </>
              )}
            </button>

            <p className="mt-6 text-center text-xs leading-relaxed text-gray-500">
              Al continuar con Google aceptás los{" "}
              <Link href="/terminos" className="text-[#FFE600] underline underline-offset-2 hover:text-white">
                términos de uso
              </Link>{" "}
              y la{" "}
              <Link href="/privacidad" className="text-[#FFE600] underline underline-offset-2 hover:text-white">
                política de privacidad
              </Link>
              .
            </p>

            <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6 text-center text-sm">
              <Link href="/catalogo" className="font-semibold text-[#FDB71A] hover:underline">
                Ver catálogo público (sin iniciar sesión)
              </Link>
              <Link href="/landing" className="inline-flex items-center justify-center gap-2 text-gray-400 hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Volver a la página principal
              </Link>
            </div>
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
          <Link href="/landing" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center">
              <span className="text-[#003087] font-black">MJ</span>
            </div>
            <span className="font-bold text-xl text-white">MaqJeez</span>
          </Link>
          
          <h1 className="text-2xl font-bold text-white mb-2">
            {isLogin ? "Bienvenido de vuelta" : "Crea tu cuenta"}
          </h1>
          <p className="text-gray-400">
            {isLogin ? "Inicia sesión para acceder a tu panel" : "Regístrate gratis para comenzar"}
          </p>
        </div>

        {/* Login/Register Card */}
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

          <p className="mb-4 mt-4 text-center text-[11px] leading-relaxed text-gray-500">
            Al iniciar sesión aceptás los{" "}
            <Link href="/terminos" className="text-[#FFE600] underline underline-offset-2 hover:text-white">
              términos
            </Link>{" "}
            y la{" "}
            <Link href="/privacidad" className="text-[#FFE600] underline underline-offset-2 hover:text-white">
              privacidad
            </Link>
            .{" "}
            <Link href="/catalogo" className="text-gray-400 hover:text-[#FDB71A]">
              Catálogo público (sin cuenta)
            </Link>
          </p>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-sm text-gray-500">o</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Login/Register Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError("");
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                isLogin 
                  ? "bg-[#FFE600] text-[#003087]" 
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError("");
                setRegisterEmailSent(false);
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                !isLogin 
                  ? "bg-[#FFE600] text-[#003087]" 
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              Registrarse
            </button>
          </div>

          {/* Login/Register Form */}
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {registerEmailSent && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-center text-sm text-green-200">
                Te enviamos un correo a <span className="font-semibold text-white">{email}</span> para confirmar la
                cuenta. Abrí el enlace y después podés iniciar sesión aquí.
              </div>
            )}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nombre completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFE600] transition"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {isLogin && loginType === "username" ? (
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
            ) : (
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
                isLogin ? "Iniciar Sesión" : "Crear Cuenta"
              )}
            </button>
          </form>

          {/* Recovery Links - Solo en modo login */}
          {isLogin && (
            <>
              <div className="mt-6 flex flex-col gap-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowRecovery(true)}
                  className="text-sm text-gray-400 hover:text-[#FFE600] transition flex items-center justify-center gap-1"
                >
                  <KeyRound className="w-4 h-4" />
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </>
          )}
        </div>

        {/* Back Link */}
        <Link
          href="/landing"
          className="mx-auto mt-8 inline-flex items-center gap-2 text-gray-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

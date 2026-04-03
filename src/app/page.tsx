"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Chrome, Mail, Lock, Eye, EyeOff, X, Loader2, CheckCircle,
  ArrowRight, Shield, Zap, TrendingUp, Users
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Verificar si el usuario ya está logueado
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
  }, []);

  const features = [
    { icon: <TrendingUp className="w-6 h-6" />, title: "Gestión Multi-Cuenta", desc: "Conecta todas tus cuentas de Mercado Libre" },
    { icon: <Users className="w-6 h-6" />, title: "Respuestas Automáticas", desc: "IA que responde a tus clientes 24/7" },
    { icon: <Shield className="w-6 h-6" />, title: "Seguridad Total", desc: "Tus datos encriptados y seguros" },
    { icon: <Zap className="w-6 h-6" />, title: "Sincronización", desc: "Actualiza stock y precios en segundos" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/10 sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FFE600] rounded-lg flex items-center justify-center">
              <span className="text-[#003087] font-black text-xs">MJ</span>
            </div>
            <span className="font-bold text-xl">MaqJeez</span>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <Link 
                href="/appjeez" 
                className="px-4 py-2 bg-[#FFE600] text-[#003087] rounded-lg font-semibold text-sm hover:bg-[#ffd700]"
              >
                Ir al Panel
              </Link>
            ) : (
              <>
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="text-sm text-gray-400 hover:text-white transition"
                >
                  Iniciar Sesión
                </button>
                <button 
                  onClick={() => setShowRegisterModal(true)}
                  className="px-4 py-2 bg-[#FFE600] text-[#003087] rounded-lg font-semibold text-sm hover:bg-[#ffd700]"
                >
                  Registrarse
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-col items-center justify-center px-4 py-20">
        <div className="text-center max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm text-gray-400">Nuevo: Sistema Multi-Cuenta</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Gestiona tus cuentas de
            <span className="text-[#FFE600]"> Mercado Libre</span>
          </h1>
          
          <p className="text-gray-400 text-lg mb-8">
            Conecta múltiples cuentas, automatiza respuestas y controla todo desde un solo panel.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link 
                href="/appjeez" 
                className="px-8 py-4 bg-[#FFE600] text-[#003087] rounded-xl font-bold hover:bg-[#ffd700] flex items-center justify-center gap-2"
              >
                Ir al Panel
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <button 
                  onClick={() => setShowRegisterModal(true)}
                  className="px-8 py-4 bg-[#FFE600] text-[#003087] rounded-xl font-bold hover:bg-[#ffd700]"
                >
                  Comenzar Gratis
                </button>
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="px-8 py-4 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20"
                >
                  Ya tengo cuenta
                </button>
              </>
            )}
          </div>

          <div className="mt-12 flex items-center justify-center gap-6 text-sm text-gray-500">
            <span>✓ 14 días gratis</span>
            <span>✓ Sin tarjeta</span>
            <span>✓ Cancela cuando quieras</span>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl">
          {features.map((f, i) => (
            <div key={i} className="p-6 bg-white/5 rounded-xl border border-white/10 text-center">
              <div className="text-[#FFE600] mb-3 flex justify-center">{f.icon}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          © 2024 MaqJeez. Todos los derechos reservados.
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)} 
          onSwitchToRegister={() => {
            setShowLoginModal(false);
            setShowRegisterModal(true);
          }}
        />
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <RegisterModal 
          onClose={() => setShowRegisterModal(false)}
          onSwitchToLogin={() => {
            setShowRegisterModal(false);
            setShowLoginModal(true);
          }}
        />
      )}
    </div>
  );
}

// Login Modal Component
function LoginModal({ onClose, onSwitchToRegister }: { onClose: () => void, onSwitchToRegister: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/appjeez");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl p-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Iniciar Sesión</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Chrome className="w-5 h-5 text-blue-500" />}
          Continuar con Google
        </button>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-sm text-gray-500">o</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFE600]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFE600]"
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
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Iniciar Sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400">
          ¿No tienes cuenta?{" "}
          <button onClick={onSwitchToRegister} className="text-[#FFE600] hover:underline">
            Regístrate gratis
          </button>
        </p>
      </div>
    </div>
  );
}

// Register Modal Component
function RegisterModal({ onClose, onSwitchToLogin }: { onClose: () => void, onSwitchToLogin: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleGoogleRegister = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
        <div className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-4">¡Registro exitoso!</h2>
          <p className="text-gray-400 mb-6">
            Te hemos enviado un email de confirmación. Revisa tu bandeja de entrada.
          </p>
          <button 
            onClick={onSwitchToLogin}
            className="px-6 py-3 bg-[#FFE600] text-[#003087] rounded-xl font-bold hover:bg-[#ffd700]"
          >
            Ir al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Crear Cuenta</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={handleGoogleRegister}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Chrome className="w-5 h-5 text-blue-500" />}
          Continuar con Google
        </button>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-sm text-gray-500">o</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleEmailRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFE600]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#FFE600]"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Confirmar Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
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
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Crear Cuenta Gratis"}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400">
          ¿Ya tienes cuenta?{" "}
          <button onClick={onSwitchToLogin} className="text-[#FFE600] hover:underline">
            Inicia sesión
          </button>
        </p>
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: string;
  onRetry?: () => void;
  showHome?: boolean;
  showBack?: boolean;
}

export function ErrorState({
  title = "Algo salió mal",
  message = "No pudimos cargar los datos. Intentá de nuevo.",
  error,
  onRetry,
  showHome = true,
  showBack = true,
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center"
    >
      {/* Icono animado */}
      <motion.div
        animate={{ 
          rotate: [0, -10, 10, -10, 10, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6"
      >
        <AlertTriangle className="w-10 h-10 text-red-500" />
      </motion.div>

      {/* Título */}
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>

      {/* Mensaje */}
      <p className="text-zinc-400 max-w-md mb-4">{message}</p>

      {/* Error detallado (si existe) */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-6 max-w-lg"
        >
          <code className="text-xs text-red-400 font-mono break-all">{error}</code>
        </motion.div>
      )}

      {/* Botones */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Intentar de nuevo
          </motion.button>
        )}

        {showBack && (
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white font-semibold rounded-xl hover:bg-zinc-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver atrás
          </Link>
        )}

        {showHome && (
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 border border-zinc-700 text-zinc-300 font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </Link>
        )}
      </div>
    </motion.div>
  );
}

export function EmptyState({
  title = "No hay datos",
  message = "No se encontraron resultados.",
  icon: Icon,
  action,
}: {
  title?: string;
  message?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-6">
        {Icon ? (
          <Icon className="w-10 h-10 text-zinc-500" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-zinc-700/50" />
        )}
      </div>

      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-zinc-500 max-w-sm mb-6">{message}</p>

      {action && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className="px-6 py-3 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-300 transition-colors"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}

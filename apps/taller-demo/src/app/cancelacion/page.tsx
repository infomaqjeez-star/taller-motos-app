export default function CancelacionPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <a href="/landing" className="text-[#FFE600] text-sm hover:underline mb-8 block">← Volver al inicio</a>
        <h1 className="text-4xl font-black mb-2">Política de Cancelación y Reembolsos</h1>
        <p className="text-gray-400 text-sm mb-10">Última actualización: mayo de 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Cancelación de Suscripción</h2>
            <p>El usuario puede cancelar su suscripción en cualquier momento desde el panel de control de su cuenta, en la sección "Configuración → Suscripción". La cancelación es inmediata y no requiere justificación.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Acceso Post-Cancelación</h2>
            <p>Al cancelar, el acceso al servicio se mantiene activo hasta el último día del período ya abonado. Una vez vencido ese período, la cuenta se suspenderá automáticamente.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Política de Reembolsos</h2>
            <p>Como regla general, no realizamos reembolsos por períodos no utilizados. Sin embargo, evaluamos caso a caso las siguientes situaciones excepcionales:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>Falla técnica grave del servicio por más de 72 horas consecutivas imputable a AppJeez.</li>
              <li>Cobro duplicado o erróneo por error de nuestra plataforma.</li>
              <li>Usuarios nuevos que soliciten reembolso dentro de las primeras 48 horas del primer pago.</li>
            </ul>
            <p className="mt-2">Para solicitar un reembolso excepcional, envíe un email a <a href="mailto:info@appjeezpro.store" className="text-[#FFE600] hover:underline">info@appjeezpro.store</a> con el asunto "Solicitud de Reembolso" dentro de los 7 días del cobro.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Período de Prueba Gratuito</h2>
            <p>Durante los 14 días de prueba gratuita no se realiza ningún cobro. Al finalizar el período de prueba sin contratar un plan, la cuenta se suspende sin cargo alguno.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Exportación de Datos</h2>
            <p>Antes de cancelar, el usuario puede exportar todos sus datos desde el panel de control. Tras la cancelación, los datos se conservan por 90 días adicionales, durante los cuales el usuario puede solicitar su recuperación. Pasado ese plazo, los datos se eliminan definitivamente.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Cancelación por Incumplimiento</h2>
            <p>AppJeez se reserva el derecho de cancelar o suspender una cuenta sin reembolso en caso de violación de los Términos y Condiciones, uso fraudulento o actividades ilegales.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Contacto</h2>
            <p>Para consultas sobre cancelaciones y reembolsos: <a href="mailto:info@appjeezpro.store" className="text-[#FFE600] hover:underline">info@appjeezpro.store</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}

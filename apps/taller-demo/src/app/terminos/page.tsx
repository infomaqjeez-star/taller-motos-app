export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <a href="/landing" className="text-[#FFE600] text-sm hover:underline mb-8 block">← Volver al inicio</a>
        <h1 className="text-4xl font-black mb-2">Términos y Condiciones</h1>
        <p className="text-gray-400 text-sm mb-10">Última actualización: mayo de 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Aceptación de los Términos</h2>
            <p>Al acceder y utilizar las plataformas AppJeez (AppJeezPro, MadsJeez y MaqJeez), el usuario acepta en su totalidad los presentes Términos y Condiciones. Si no está de acuerdo con alguna de estas condiciones, debe abstenerse de usar el servicio.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Descripción del Servicio</h2>
            <p>AppJeez es un ecosistema de software SaaS (Software as a Service) que comprende tres plataformas:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li><strong className="text-white">AppJeezPro:</strong> Gestión de múltiples cuentas de MercadoLibre.</li>
              <li><strong className="text-white">MadsJeez:</strong> Marketplace para venta de productos físicos y digitales.</li>
              <li><strong className="text-white">MaqJeez:</strong> Sistema de gestión para talleres y servicios técnicos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Registro y Cuenta de Usuario</h2>
            <p>Para utilizar el servicio, el usuario debe registrarse proporcionando información verídica y actualizada. El usuario es responsable de mantener la confidencialidad de sus credenciales de acceso. AppJeez no se responsabiliza por accesos no autorizados derivados del incumplimiento de esta obligación.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Suscripción y Pagos</h2>
            <p>Los precios de suscripción están expresados en pesos argentinos (ARS) e incluyen IVA cuando corresponda. Los planes disponibles son:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>Plan Starter: $9.999/mes</li>
              <li>Plan Pro: $29.999/mes</li>
              <li>Plan Business: $49.999/mes</li>
            </ul>
            <p className="mt-2">Los precios pueden actualizarse con un aviso previo de 30 días. El cobro se realiza de forma mensual al inicio de cada período. Aceptamos Mercado Pago, transferencia bancaria y tarjetas de crédito/débito.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Período de Prueba Gratuito</h2>
            <p>Ofrecemos 14 días de prueba gratuita sin necesidad de tarjeta de crédito. Al finalizar el período de prueba, el acceso se suspenderá automáticamente si no se selecciona un plan de pago.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Cancelación</h2>
            <p>El usuario puede cancelar su suscripción en cualquier momento desde su panel de control. No se realizan reembolsos por períodos no utilizados. El acceso al servicio se mantiene hasta el fin del período abonado.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Uso Aceptable</h2>
            <p>El usuario se compromete a no utilizar el servicio para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>Actividades ilegales o fraudulentas.</li>
              <li>Envío de spam o comunicaciones no solicitadas.</li>
              <li>Vulnerar los sistemas de seguridad de la plataforma.</li>
              <li>Revender o sublicenciar el acceso sin autorización expresa.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Propiedad Intelectual</h2>
            <p>Todo el software, diseño, código fuente, marcas y contenido de AppJeez son propiedad exclusiva de AppJeez y están protegidos por las leyes de propiedad intelectual de la República Argentina y tratados internacionales.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Limitación de Responsabilidad</h2>
            <p>AppJeez no garantiza la disponibilidad ininterrumpida del servicio. En ningún caso AppJeez será responsable por daños indirectos, pérdida de datos, lucro cesante o cualquier otro daño derivado del uso o imposibilidad de uso del servicio, más allá de lo establecido por la legislación argentina vigente.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Modificaciones</h2>
            <p>AppJeez se reserva el derecho de modificar estos términos en cualquier momento. Los usuarios serán notificados por email con al menos 15 días de anticipación ante cambios sustanciales.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">11. Ley Aplicable y Jurisdicción</h2>
            <p>Estos Términos se rigen por las leyes de la República Argentina. Ante cualquier disputa, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Ciudad Autónoma de Buenos Aires, renunciando a cualquier otro fuero que pudiere corresponder.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">12. Contacto</h2>
            <p>Para consultas sobre estos términos: <a href="mailto:info@appjeezpro.store" className="text-[#FFE600] hover:underline">info@appjeezpro.store</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}

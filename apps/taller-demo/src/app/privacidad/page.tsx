export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <a href="/landing" className="text-[#FFE600] text-sm hover:underline mb-8 block">← Volver al inicio</a>
        <h1 className="text-4xl font-black mb-2">Política de Privacidad</h1>
        <p className="text-gray-400 text-sm mb-10">Última actualización: mayo de 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Responsable del Tratamiento</h2>
            <p>AppJeez es responsable del tratamiento de los datos personales recopilados a través de sus plataformas, conforme a la Ley N° 25.326 de Protección de Datos Personales de la República Argentina y el Reglamento General de Protección de Datos (GDPR) de la Unión Europea en lo que resulte aplicable.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Datos que Recopilamos</h2>
            <p>Recopilamos los siguientes datos personales:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>Nombre y apellido</li>
              <li>Dirección de correo electrónico</li>
              <li>Datos de facturación (cuando aplica)</li>
              <li>Información de uso del servicio (logs, métricas de uso)</li>
              <li>Dirección IP y datos del dispositivo</li>
              <li>Datos ingresados voluntariamente en las plataformas (clientes, órdenes, inventario)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Finalidad del Tratamiento</h2>
            <p>Utilizamos los datos para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li>Prestar el servicio contratado.</li>
              <li>Gestionar la facturación y los pagos.</li>
              <li>Enviar comunicaciones sobre el servicio (actualizaciones, mantenimiento).</li>
              <li>Mejorar nuestras plataformas mediante análisis de uso.</li>
              <li>Cumplir con obligaciones legales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Base Legal del Tratamiento</h2>
            <p>El tratamiento de sus datos se basa en: (a) la ejecución del contrato de servicio, (b) el consentimiento otorgado al registrarse, y (c) el cumplimiento de obligaciones legales.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Almacenamiento y Seguridad</h2>
            <p>Los datos se almacenan en servidores seguros de Supabase con encriptación AES-256 en reposo y TLS en tránsito. Realizamos backups automáticos diarios. El acceso a los datos está restringido al personal autorizado bajo estrictos protocolos de seguridad.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Compartición con Terceros</h2>
            <p>No vendemos ni alquilamos sus datos a terceros. Podemos compartir datos con proveedores de servicios necesarios para operar la plataforma (procesadores de pago, infraestructura cloud), quienes están obligados contractualmente a proteger su información. En caso de requerimiento legal, podemos divulgar información a autoridades competentes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Derechos del Usuario</h2>
            <p>Conforme a la Ley 25.326, el usuario tiene derecho a:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
              <li><strong className="text-white">Acceso:</strong> Conocer qué datos tenemos sobre usted.</li>
              <li><strong className="text-white">Rectificación:</strong> Corregir datos inexactos.</li>
              <li><strong className="text-white">Supresión:</strong> Solicitar la eliminación de sus datos.</li>
              <li><strong className="text-white">Oposición:</strong> Oponerse al tratamiento de sus datos.</li>
            </ul>
            <p className="mt-2">Para ejercer estos derechos, envíe un email a <a href="mailto:info@appjeezpro.store" className="text-[#FFE600] hover:underline">info@appjeezpro.store</a>. Responderemos en un plazo máximo de 30 días hábiles.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Cookies</h2>
            <p>Utilizamos cookies técnicas necesarias para el funcionamiento del servicio y cookies analíticas para mejorar la experiencia. Puede gestionar sus preferencias de cookies desde <a href="/cookies" className="text-[#FFE600] hover:underline">nuestra política de cookies</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Retención de Datos</h2>
            <p>Conservamos los datos mientras la cuenta esté activa. Tras la cancelación, los datos se eliminan en un plazo de 90 días, salvo que la ley exija su conservación por mayor tiempo.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Menores de Edad</h2>
            <p>Nuestras plataformas no están dirigidas a menores de 18 años. Si detectamos que hemos recopilado datos de un menor sin consentimiento parental, procederemos a eliminarlos de inmediato.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">11. Contacto y Autoridad de Control</h2>
            <p>Para consultas sobre privacidad: <a href="mailto:info@appjeezpro.store" className="text-[#FFE600] hover:underline">info@appjeezpro.store</a></p>
            <p className="mt-2">Puede presentar reclamaciones ante la Agencia de Acceso a la Información Pública (AAIP) de Argentina: <a href="https://www.argentina.gob.ar/aaip" target="_blank" className="text-[#FFE600] hover:underline">www.argentina.gob.ar/aaip</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}

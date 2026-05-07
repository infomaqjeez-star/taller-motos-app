export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <a href="/landing" className="text-[#FFE600] text-sm hover:underline mb-8 block">← Volver al inicio</a>
        <h1 className="text-4xl font-black mb-2">Política de Cookies</h1>
        <p className="text-gray-400 text-sm mb-10">Última actualización: mayo de 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. ¿Qué son las cookies?</h2>
            <p>Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web. Nos permiten recordar sus preferencias y mejorar su experiencia de uso.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Cookies que utilizamos</h2>
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h3 className="font-bold text-white mb-1">Cookies técnicas (necesarias)</h3>
                <p className="text-gray-400 text-sm">Imprescindibles para el funcionamiento de la plataforma. Gestionan la sesión de usuario y la autenticación. No pueden desactivarse.</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h3 className="font-bold text-white mb-1">Cookies de preferencias</h3>
                <p className="text-gray-400 text-sm">Recuerdan sus configuraciones y preferencias dentro de la plataforma (idioma, tema, etc.).</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h3 className="font-bold text-white mb-1">Cookies analíticas</h3>
                <p className="text-gray-400 text-sm">Nos ayudan a entender cómo se usa la plataforma para mejorarla. Los datos son anónimos y agregados.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Gestión de cookies</h2>
            <p>Puede configurar su navegador para rechazar cookies. Sin embargo, deshabilitar las cookies técnicas puede afectar el funcionamiento de la plataforma. Consulte la ayuda de su navegador para gestionar las cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Contacto</h2>
            <p>Para consultas: <a href="mailto:info@appjeezpro.store" className="text-[#FFE600] hover:underline">info@appjeezpro.store</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}

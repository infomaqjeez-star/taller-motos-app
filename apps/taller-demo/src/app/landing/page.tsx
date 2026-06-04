"use client";

import { useState } from "react";
import {
  Wrench,
  ShoppingBag,
  BarChart3,
  ArrowRight,
  Mail,
  Phone,
  Menu,
  X,
  Check,
  Zap,
  Shield,
  Users,
  Star,
  TrendingUp,
  Package,
  MessageSquare,
  Bell,
  Globe,
  CreditCard,
  Layers,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeApp, setActiveApp] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  const apps = [
    {
      id: "appjeezpro",
      name: "AppJeezPro",
      tagline: "Gestión Multicuentas MercadoLibre",
      description: "Administra todas tus cuentas de MercadoLibre desde un solo lugar. Sincroniza stock, precios, publicaciones y mensajes en tiempo real.",
      color: "#FFE600",
      textColor: "#003087",
      gradient: "from-yellow-400 to-yellow-600",
      icon: <BarChart3 className="w-8 h-8" />,
      features: [
        "Gestión de múltiples cuentas ML",
        "Sincronización de stock en tiempo real",
        "Respuesta automática de preguntas con IA",
        "Etiquetas y logística unificada",
        "Reportes de ventas consolidados",
        "Actualización masiva de precios",
      ],
      badge: "MercadoLibre",
    },
    {
      id: "marketplace",
      name: "MadsJeez",
      tagline: "Marketplace Digital + Físico",
      description: "La combinación perfecta entre MercadoLibre y Hotmart. Vende productos físicos y digitales, cursos, suscripciones y servicios desde una sola plataforma.",
      color: "#7C3AED",
      textColor: "#ffffff",
      gradient: "from-purple-500 to-purple-800",
      icon: <ShoppingBag className="w-8 h-8" />,
      features: [
        "Venta de productos físicos y digitales",
        "Cursos y contenido en suscripción",
        "Pasarela de pagos integrada",
        "Afiliados y comisiones automáticas",
        "Landing pages personalizables",
        "Integraciones con ML y Hotmart",
      ],
      badge: "Marketplace",
    },
    {
      id: "maqjeez",
      name: "MaqJeez",
      tagline: "Gestión de Talleres y Servicios Técnicos",
      description: "Todo lo que necesita tu taller técnico: órdenes de trabajo, inventario, agenda, ventas y equipo. Adaptable a cualquier tipo de servicio técnico.",
      color: "#FDB71A",
      textColor: "#000000",
      gradient: "from-orange-400 to-orange-600",
      icon: <Wrench className="w-8 h-8" />,
      features: [
        "Órdenes de trabajo con seguimiento",
        "Inventario y repuestos",
        "Agenda y turnos",
        "Gestión de equipo con tareas",
        "Ventas y facturación",
        "100% adaptable a tu negocio",
      ],
      badge: "Taller",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center font-black text-[#003087] text-lg">
                MJ
              </div>
              <span className="text-xl font-bold text-white">AppJeez</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection("plataformas")} className="text-gray-400 hover:text-white transition-colors text-sm">Plataformas</button>
              <button onClick={() => scrollToSection("features")} className="text-gray-400 hover:text-white transition-colors text-sm">Características</button>
              <button onClick={() => scrollToSection("pricing")} className="text-gray-400 hover:text-white transition-colors text-sm">Precios</button>
              <button onClick={() => scrollToSection("contact")} className="text-gray-400 hover:text-white transition-colors text-sm">Contacto</button>
              <Link href="/login" className="bg-[#FFE600] hover:bg-[#ffd700] text-[#003087] px-5 py-2 rounded-lg font-bold text-sm transition-all">
                Acceder
              </Link>
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-400">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0a0a0a] border-t border-white/10 px-4 py-4 space-y-3">
            <button onClick={() => scrollToSection("plataformas")} className="block w-full text-left text-gray-400 hover:text-white py-2">Plataformas</button>
            <button onClick={() => scrollToSection("features")} className="block w-full text-left text-gray-400 hover:text-white py-2">Características</button>
            <button onClick={() => scrollToSection("pricing")} className="block w-full text-left text-gray-400 hover:text-white py-2">Precios</button>
            <button onClick={() => scrollToSection("contact")} className="block w-full text-left text-gray-400 hover:text-white py-2">Contacto</button>
            <Link href="/login" className="block w-full bg-[#FFE600] text-[#003087] px-5 py-3 rounded-lg font-bold text-center">Acceder</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-purple-500/5 to-orange-500/5 pointer-events-none" />
        <div className="max-w-7xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8">
            <Zap className="w-4 h-4 text-[#FFE600]" />
            <span className="text-gray-300 text-sm">3 plataformas para dominar tu mercado</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight tracking-tight">
            El ecosistema digital
            <br />
            <span className="text-[#FFE600]">para tu negocio</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Desde administrar multicuentas de MercadoLibre hasta gestionar tu taller técnico y vender productos digitales. Todo integrado, todo en uno.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <Link href="/login" className="bg-[#FFE600] hover:bg-[#ffd700] text-[#003087] px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2">
              Comenzar Gratis <ArrowRight className="w-5 h-5" />
            </Link>
            <button onClick={() => scrollToSection("plataformas")} className="bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 rounded-xl font-semibold text-lg transition-all">
              Ver Plataformas
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[["500+","Empresas"],["50K+","Operaciones/mes"],["3","Plataformas"],["24/7","Soporte"]].map(([n,l]) => (
              <div key={l} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="text-3xl font-black text-[#FFE600]">{n}</div>
                <div className="text-gray-400 text-sm">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plataformas */}
      <section id="plataformas" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Nuestras <span className="text-[#FFE600]">3 Plataformas</span></h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Cada una diseñada para resolver un problema específico de tu negocio</p>
          </div>

          {/* Tab selector */}
          <div className="flex flex-col sm:flex-row gap-3 mb-12 justify-center">
            {apps.map((app, i) => (
              <button
                key={app.id}
                onClick={() => setActiveApp(i)}
                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all border ${
                  activeApp === i
                    ? "border-[#FFE600] bg-[#FFE600]/10 text-[#FFE600]"
                    : "border-white/10 bg-white/5 text-gray-400 hover:text-white hover:border-white/20"
                }`}
              >
                {app.name}
              </button>
            ))}
          </div>

          {/* App detail */}
          {apps.map((app, i) => (
            <div key={app.id} className={`${activeApp === i ? "block" : "hidden"}`}>
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${app.gradient} text-black text-xs font-bold px-3 py-1 rounded-full mb-6`}>
                    {app.badge}
                  </div>
                  <h3 className="text-4xl font-black mb-3">{app.name}</h3>
                  <p className="text-[#FFE600] font-semibold text-lg mb-4">{app.tagline}</p>
                  <p className="text-gray-400 text-lg mb-8 leading-relaxed">{app.description}</p>
                  <ul className="space-y-3 mb-10">
                    {app.features.map(f => (
                      <li key={f} className="flex items-center gap-3 text-gray-300">
                        <div className="w-5 h-5 bg-[#FFE600]/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-[#FFE600]" />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/login" className="inline-flex items-center gap-2 bg-[#FFE600] hover:bg-[#ffd700] text-[#003087] px-6 py-3 rounded-xl font-bold transition-all">
                    Probar {app.name} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className={`bg-gradient-to-br ${app.gradient} rounded-3xl p-1`}>
                  <div className="bg-[#111] rounded-3xl p-8 h-64 flex items-center justify-center">
                    <div className="text-center">
                      <div className={`w-24 h-24 bg-gradient-to-br ${app.gradient} rounded-3xl flex items-center justify-center mx-auto mb-4`}>
                        <div className="text-black scale-150">{app.icon}</div>
                      </div>
                      <div className="text-2xl font-black">{app.name}</div>
                      <div className="text-gray-400">{app.tagline}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Quick cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-20">
            {apps.map((app, i) => (
              <div
                key={app.id}
                onClick={() => setActiveApp(i)}
                className={`cursor-pointer bg-white/5 border rounded-2xl p-6 transition-all hover:border-[#FFE600]/50 ${activeApp === i ? "border-[#FFE600]/50 bg-[#FFE600]/5" : "border-white/10"}`}
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${app.gradient} rounded-xl flex items-center justify-center mb-4 text-black`}>
                  {app.icon}
                </div>
                <h4 className="font-bold text-lg mb-1">{app.name}</h4>
                <p className="text-gray-400 text-sm">{app.tagline}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">¿Por qué <span className="text-[#FFE600]">AppJeez?</span></h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Características que diferencian nuestras plataformas</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Layers className="w-6 h-6 text-[#FFE600]" />, title: "Todo Integrado", desc: "Las 3 plataformas comparten datos. Tu inventario de taller se sincroniza con tu tienda online automáticamente." },
              { icon: <Shield className="w-6 h-6 text-purple-400" />, title: "Seguridad Total", desc: "Autenticación cifrada con email y contraseña, seguridad por tarea y control de accesos por rol para proteger tu negocio." },
              { icon: <TrendingUp className="w-6 h-6 text-green-400" />, title: "Reportes Avanzados", desc: "Estadísticas de ventas, tiempos de taller, rendimiento de equipo y métricas de MercadoLibre unificadas." },
              { icon: <MessageSquare className="w-6 h-6 text-blue-400" />, title: "IA para ML", desc: "Responde preguntas de compradores automáticamente con inteligencia artificial entrenada para tu negocio." },
              { icon: <Globe className="w-6 h-6 text-orange-400" />, title: "Marketplace Propio", desc: "Vende sin depender de terceros. Crea tu propio canal de ventas digital con productos físicos y digitales." },
              { icon: <Star className="w-6 h-6 text-yellow-400" />, title: "100% Personalizable", desc: "Adapta nombres de secciones, categorías y flujos a tu negocio. Desde motos hasta electrodomésticos." },
            ].map(f => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#FFE600]/30 transition-all">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4">{f.icon}</div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Planes <span className="text-[#FFE600]">Flexibles</span></h2>
            <p className="text-gray-400 text-lg">Elige según tu plataforma y tamaño de negocio</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { name:"Starter", price:"$9.999", desc:"Cualquier plataforma", color:"border-white/10", features:["1 plataforma a elegir","Hasta 3 usuarios","Soporte por email","Funciones básicas"] },
              { name:"Pro", price:"$29.999", desc:"Cualquier plataforma", color:"border-[#FFE600]", popular:true, features:["1 plataforma completa","Hasta 10 usuarios","Soporte prioritario","IA para respuestas ML","Reportes avanzados"] },
              { name:"Business", price:"$49.999", desc:"Cualquier plataforma", color:"border-white/10", features:["1 plataforma full","Usuarios ilimitados","Soporte 24/7","Personalización total","Multi-sucursal","API access"] },
            ].map(p => (
              <div key={p.name} className={`bg-white/5 border ${p.color} rounded-2xl p-8 relative ${p.popular ? "bg-[#FFE600]/5" : ""}`}>
                {p.popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FFE600] text-[#003087] text-xs font-black px-4 py-1 rounded-full">MÁS POPULAR</div>}
                <h3 className="text-xl font-black mb-1">{p.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{p.desc}</p>
                <div className="mb-6"><span className="text-4xl font-black">{p.price}</span><span className="text-gray-400">/mes</span></div>
                <ul className="space-y-3 mb-8">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                      <Check className="w-4 h-4 text-[#FFE600] flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" className={`block w-full py-3 rounded-xl font-bold text-center transition-all ${p.popular ? "bg-[#FFE600] text-[#003087] hover:bg-[#ffd700]" : "bg-white/10 hover:bg-white/20 text-white"}`}>
                  Comenzar
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 px-4 sm:px-6 lg:px-8 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">¿Listo para <span className="text-[#FFE600]">crecer?</span></h2>
          <p className="text-gray-400 text-lg mb-12">Contáctanos y te ayudamos a elegir la plataforma ideal para tu negocio</p>
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex items-center gap-4">
              <div className="w-12 h-12 bg-[#FFE600]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-[#FFE600]" />
              </div>
              <div className="text-left">
                <div className="font-bold">Email</div>
                <a href="mailto:info@appjeezpro.store" className="text-gray-400 hover:text-[#FFE600] transition-colors">info@appjeezpro.store</a>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Phone className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-left">
                <div className="font-bold">WhatsApp</div>
                <a href="https://wa.me/message/contact" className="text-gray-400 hover:text-green-400 transition-colors">Enviar mensaje</a>
              </div>
            </div>
          </div>
          <Link href="/login" className="inline-flex items-center gap-2 bg-[#FFE600] hover:bg-[#ffd700] text-[#003087] px-10 py-4 rounded-xl font-black text-lg transition-all">
            Comenzar Ahora Gratis <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Testimonios */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Lo que dicen <span className="text-[#FFE600]">nuestros clientes</span></h2>
            <p className="text-gray-400 text-lg">Negocios reales que ya usan AppJeez</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name:"Carlos M.", role:"Taller de motos, Córdoba", text:"Con MaqJeez organicé todo mi taller. Antes perdía turnos y materiales, ahora tengo todo bajo control. En 2 semanas noté la diferencia.", stars:5 },
              { name:"Lucía R.", role:"Vendedora MercadoLibre, Buenos Aires", text:"AppJeezPro me cambió la vida. Administro 4 cuentas de ML desde un solo lugar. Las respuestas automáticas con IA me ahorran 3 horas por día.", stars:5 },
              { name:"Diego F.", role:"Técnico de celulares, Rosario", text:"El sistema es súper fácil de usar. Mis clientes reciben notificaciones cuando su equipo está listo. El soporte responde rápido, muy recomendable.", stars:5 },
            ].map(t => (
              <div key={t.name} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex gap-1 mb-4">{Array.from({length:t.stars}).map((_,i) => <Star key={i} className="w-4 h-4 fill-[#FFE600] text-[#FFE600]" />)}</div>
                <p className="text-gray-300 mb-6 leading-relaxed italic">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <div className="font-bold">{t.name}</div>
                  <div className="text-gray-400 text-sm">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Preguntas <span className="text-[#FFE600]">frecuentes</span></h2>
          </div>
          <div className="space-y-3">
            {[
              { q:"¿Necesito conocimientos técnicos para usar las plataformas?", a:"No. Todas las plataformas están diseñadas para ser intuitivas. Si sabés usar WhatsApp, podés usar AppJeez. Además, te acompañamos en el onboarding." },
              { q:"¿Puedo cancelar mi suscripción en cualquier momento?", a:"Sí. No hay contratos de permanencia. Podés cancelar cuando quieras desde tu panel. El acceso se mantiene hasta el fin del período pagado." },
              { q:"¿Los precios son en pesos argentinos?", a:"Sí. Todos los precios están expresados en pesos argentinos (ARS). Aceptamos transferencia bancaria, Mercado Pago y tarjetas de crédito/débito." },
              { q:"¿Mis datos están seguros?", a:"Absolutamente. Usamos Supabase con encriptación de datos en reposo y en tránsito, autenticación con email y contraseña, y backups automáticos diarios. Nunca vendemos tus datos a terceros." },
              { q:"¿Puedo usar más de una plataforma?", a:"Sí. Podés contratar cada plataforma por separado. Si usás más de una, contactanos para un precio combinado personalizado." },
              { q:"¿Hay período de prueba gratuito?", a:"Sí. Ofrecemos 14 días de prueba gratuita en cualquier plataforma sin necesidad de tarjeta de crédito. Solo creá tu cuenta y empezá." },
              { q:"¿Qué pasa si tengo un problema técnico?", a:"Tenemos soporte por email y WhatsApp. Los planes Pro y Business tienen soporte prioritario con respuesta en menos de 4 horas hábiles." },
            ].map((faq, i) => (
              <div key={i} className="border border-white/10 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-semibold pr-4">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-[#FFE600] flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-gray-400 leading-relaxed">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[#FFE600]/10 to-purple-500/10 border border-[#FFE600]/20 rounded-3xl p-12 text-center">
            <div className="inline-flex items-center gap-2 bg-[#FFE600]/10 border border-[#FFE600]/20 rounded-full px-4 py-2 mb-6">
              <Zap className="w-4 h-4 text-[#FFE600]" />
              <span className="text-[#FFE600] text-sm font-semibold">14 días gratis, sin tarjeta</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Empezá hoy mismo</h2>
            <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">Creá tu cuenta en minutos y empezá a organizar tu negocio. Sin compromisos, sin letra chica.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login" className="bg-[#FFE600] hover:bg-[#ffd700] text-[#003087] px-10 py-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2">
                Crear Cuenta Gratis <ArrowRight className="w-5 h-5" />
              </Link>
              <button onClick={() => scrollToSection("contact")} className="bg-white/5 hover:bg-white/10 border border-white/10 px-10 py-4 rounded-xl font-semibold text-lg transition-all">
                Hablar con un asesor
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-16 pb-8 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-[#050505]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#FFE600] rounded-xl flex items-center justify-center font-black text-[#003087]">MJ</div>
                <span className="font-bold text-xl">AppJeez</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">Ecosistema de software para negocios argentinos. Soluciones simples para problemas complejos.</p>
              <p className="text-gray-500 text-xs">CUIT: A definir<br />Razón Social: AppJeez SRL<br />Argentina</p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-300">Plataformas</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><button onClick={() => setActiveApp(0)} className="hover:text-[#FFE600] transition-colors">AppJeezPro</button></li>
                <li><button onClick={() => setActiveApp(1)} className="hover:text-[#FFE600] transition-colors">MadsJeez</button></li>
                <li><button onClick={() => setActiveApp(2)} className="hover:text-[#FFE600] transition-colors">MaqJeez</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-300">Empresa</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><button onClick={() => scrollToSection("features")} className="hover:text-white transition-colors">Características</button></li>
                <li><button onClick={() => scrollToSection("pricing")} className="hover:text-white transition-colors">Precios</button></li>
                <li><button onClick={() => scrollToSection("contact")} className="hover:text-white transition-colors">Contacto</button></li>
                <li><a href="mailto:info@appjeezpro.store" className="hover:text-white transition-colors">info@appjeezpro.store</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-300">Legal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="/terminos" className="hover:text-white transition-colors">Términos y Condiciones</a></li>
                <li><a href="/privacidad" className="hover:text-white transition-colors">Política de Privacidad</a></li>
                <li><a href="/cookies" className="hover:text-white transition-colors">Política de Cookies</a></li>
                <li><a href="/cancelacion" className="hover:text-white transition-colors">Política de Cancelación</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-gray-500 text-xs">
              <p>&copy; 2026 AppJeez. Todos los derechos reservados.</p>
              <p className="text-center">El uso de esta plataforma implica la aceptación de nuestros <a href="/terminos" className="underline hover:text-gray-300">Términos y Condiciones</a> y <a href="/privacidad" className="underline hover:text-gray-300">Política de Privacidad</a>.</p>
              <p>Hecho en Argentina 🇦🇷</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useState } from "react";
import { 
  Wrench, 
  Smartphone, 
  ShoppingCart, 
  Edit3, 
  Check, 
  ArrowRight, 
  Mail, 
  Phone,
  Menu,
  X,
  Zap,
  Shield,
  BarChart3,
  Users,
  Clock,
  Star
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold">TechSolutions</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection("apps")} className="text-gray-300 hover:text-white transition-colors">
                Aplicaciones
              </button>
              <button onClick={() => scrollToSection("features")} className="text-gray-300 hover:text-white transition-colors">
                Características
              </button>
              <button onClick={() => scrollToSection("pricing")} className="text-gray-300 hover:text-white transition-colors">
                Precios
              </button>
              <button onClick={() => scrollToSection("contact")} className="text-gray-300 hover:text-white transition-colors">
                Contacto
              </button>
              <Link
                href="/login"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-6 py-2 rounded-lg font-semibold transition-all"
              >
                Acceder
              </Link>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800">
            <div className="px-4 py-4 space-y-3">
              <button onClick={() => scrollToSection("apps")} className="block w-full text-left text-gray-300 hover:text-white">
                Aplicaciones
              </button>
              <button onClick={() => scrollToSection("features")} className="block w-full text-left text-gray-300 hover:text-white">
                Características
              </button>
              <button onClick={() => scrollToSection("pricing")} className="block w-full text-left text-gray-300 hover:text-white">
                Precios
              </button>
              <button onClick={() => scrollToSection("contact")} className="block w-full text-left text-gray-300 hover:text-white">
                Contacto
              </button>
              <Link
                href="/login"
                className="block w-full bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-2 rounded-lg font-semibold text-center"
              >
                Acceder
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">Soluciones completas para tu negocio</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Gestiona tu negocio de
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              {" "}Servicio Técnico
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10">
            Plataformas adaptables para cualquier tipo de taller o servicio técnico. 
            Personaliza cada sección según tu negocio: desmalezadoras, celulares, motos, 
            televisores y mucho más.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
            >
              Comenzar Gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button
              onClick={() => scrollToSection("apps")}
              className="bg-gray-800 hover:bg-gray-700 px-8 py-4 rounded-xl font-semibold text-lg transition-all border border-gray-700"
            >
              Ver Aplicaciones
            </button>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">500+</div>
              <div className="text-gray-400">Empresas Activas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">10K+</div>
              <div className="text-gray-400">Órdenes Procesadas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">99.9%</div>
              <div className="text-gray-400">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">24/7</div>
              <div className="text-gray-400">Soporte</div>
            </div>
          </div>
        </div>
      </section>

      {/* Apps Section */}
      <section id="apps" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Nuestras Aplicaciones
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Soluciones integradas para gestionar cada aspecto de tu negocio
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* App 1: Taller */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 hover:border-blue-500/50 transition-all group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Wrench className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Gestión de Taller</h3>
              <p className="text-gray-400 mb-6">
                Sistema completo para servicio técnico. Gestiona órdenes de trabajo, inventario, 
                tareas del equipo y más. Totalmente personalizable.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Órdenes de trabajo</span>
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Gestión de inventario</span>
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Sistema de tareas</span>
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Personalizable</span>
                </li>
              </ul>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold"
              >
                Probar Gratis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* App 2: Celulares */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 hover:border-purple-500/50 transition-all group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Smartphone className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Reparación de Celulares</h3>
              <p className="text-gray-400 mb-6">
                Especializado en talleres de telefonía. Control de IMEI, stock de repuestos, 
                seguimiento de reparaciones y más.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Control de IMEI</span>
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Gestión de repuestos</span>
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Estado de reparaciones</span>
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Notificaciones WhatsApp</span>
                </li>
              </ul>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-semibold"
              >
                Probar Gratis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* App 3: E-commerce */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 hover:border-green-500/50 transition-all group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Tienda Online</h3>
              <p className="text-gray-400 mb-6">
                Vende tus productos online. Catálogo de productos, gestión de ventas, 
                promociones y envíos integrado con tu taller.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Catálogo de productos</span>
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Gestión de ventas</span>
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Promociones y descuentos</span>
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Integración con inventario</span>
                </li>
              </ul>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 font-semibold"
              >
                Probar Gratis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Características Principales
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Todo lo que necesitas para gestionar tu negocio de servicio técnico
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <Edit3 className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">100% Personalizable</h3>
              <p className="text-gray-400">
                Adapta cada sección a tu negocio. Cambia "Desmalezadoras" por "Celulares", 
                "Motos" o cualquier categoría que necesites. Todo con un clic.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Seguridad por Tarea</h3>
              <p className="text-gray-400">
                Cada tarea tiene su propia contraseña. Protege las acciones de modificar 
                y eliminar mientras permite que cualquiera inicie y complete tareas.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Control de Tiempos</h3>
              <p className="text-gray-400">
                Define tiempos estimados y registra el tiempo real de cada tarea. 
                Analiza el rendimiento de tu equipo con métricas detalladas.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Gestión de Equipo</h3>
              <p className="text-gray-400">
                Asigna tareas a empleados, registra quién inició y completó cada tarea, 
                y lleva un historial detallado de la actividad del equipo.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Historial Completo</h3>
              <p className="text-gray-400">
                Consulta el historial de tareas por día, semana o mes. 
                Visualiza quién creó, inició y completó cada tarea con timestamps.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Escalable</h3>
              <p className="text-gray-400">
                Diseñado para crecer con tu negocio. Desde un pequeño taller hasta 
                una cadena de servicios técnicos, nuestro sistema se adapta.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Planes Flexibles
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Elige el plan que mejor se adapte a tu negocio
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Basic Plan */}
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
              <h3 className="text-xl font-bold mb-2">Básico</h3>
              <p className="text-gray-400 mb-6">Para pequeños talleres</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$29</span>
                <span className="text-gray-400">/mes</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Hasta 3 usuarios</span>
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>100 órdenes/mes</span>
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Soporte por email</span>
                </li>
              </ul>
              <Link
                href="/login"
                className="block w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-xl font-semibold text-center transition-colors"
              >
                Comenzar
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 border border-blue-500 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-sm font-bold px-4 py-1 rounded-full">
                Popular
              </div>
              <h3 className="text-xl font-bold mb-2">Profesional</h3>
              <p className="text-blue-100 mb-6">Para talleres en crecimiento</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$79</span>
                <span className="text-blue-100">/mes</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-white">
                  <Check className="w-5 h-5 text-green-300" />
                  <span>Hasta 10 usuarios</span>
                </li>
                <li className="flex items-center gap-2 text-white">
                  <Check className="w-5 h-5 text-green-300" />
                  <span>Órdenes ilimitadas</span>
                </li>
                <li className="flex items-center gap-2 text-white">
                  <Check className="w-5 h-5 text-green-300" />
                  <span>Soporte prioritario</span>
                </li>
                <li className="flex items-center gap-2 text-white">
                  <Check className="w-5 h-5 text-green-300" />
                  <span>API access</span>
                </li>
              </ul>
              <Link
                href="/login"
                className="block w-full bg-white hover:bg-gray-100 text-black py-3 rounded-xl font-semibold text-center transition-colors"
              >
                Comenzar
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
              <h3 className="text-xl font-bold mb-2">Enterprise</h3>
              <p className="text-gray-400 mb-6">Para grandes operaciones</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$199</span>
                <span className="text-gray-400">/mes</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Usuarios ilimitados</span>
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Multi-sucursal</span>
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Soporte 24/7</span>
                </li>
                <li className="flex items-center gap-2 text-gray-300">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Personalización</span>
                </li>
              </ul>
              <Link
                href="/login"
                className="block w-full bg-gray-700 hover:bg-gray-600 py-3 rounded-xl font-semibold text-center transition-colors"
              >
                Contactar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              ¿Tienes Preguntas?
            </h2>
            <p className="text-gray-400 text-lg">
              Estamos aquí para ayudarte a encontrar la mejor solución para tu negocio
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold">Email</h3>
                  <p className="text-gray-400">contacto@techsolutions.com</p>
                </div>
              </div>
              <a
                href="mailto:contacto@techsolutions.com"
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                Enviar mensaje
              </a>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Phone className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold">Teléfono</h3>
                  <p className="text-gray-400">+1 (555) 123-4567</p>
                </div>
              </div>
              <a
                href="tel:+15551234567"
                className="text-green-400 hover:text-green-300 font-semibold"
              >
                Llamar ahora
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Wrench className="w-6 h-6" />
                </div>
                <span className="text-xl font-bold">TechSolutions</span>
              </div>
              <p className="text-gray-400">
                Soluciones completas para gestión de servicios técnicos
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Producto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#apps" className="hover:text-white">Aplicaciones</a></li>
                <li><a href="#features" className="hover:text-white">Características</a></li>
                <li><a href="#pricing" className="hover:text-white">Precios</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Recursos</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Documentación</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Soporte</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Privacidad</a></li>
                <li><a href="#" className="hover:text-white">Términos</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2026 TechSolutions. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, ArrowLeft, ChevronDown, Mail, MessageCircle, Phone,
  ShoppingBag, UserPlus, KeyRound, Receipt, Truck, Tag, BadgeCheck,
  Users, Wallet, ListChecks, LogIn, BarChart3, Boxes, Calendar,
  Printer, Megaphone, RefreshCw, Wrench, FileText, Bell,
  CreditCard, Clock, MapPin, ShieldCheck, RotateCcw, HelpCircle, Sparkles
} from "lucide-react";

type Paso = string | { titulo: string; detalle: string };
type Tutorial = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  resumen: string;
  pasos: Paso[];
  link?: { href: string; label: string };
};
type TabId = "cliente" | "vendedor" | "taller" | "faq";

const TUTORIALES: Record<TabId, Tutorial[]> = {
  cliente: [
    {
      id: "cliente-catalogo",
      icon: ShoppingBag,
      titulo: "Cómo navegar el catálogo",
      resumen: "Buscá productos por SKU, nombre o categoría sin necesidad de cuenta.",
      pasos: [
        "Entrá a appjeezpro.store/catalogo. No necesitás registrarte para ver precios.",
        "Usá el buscador para encontrar un producto por SKU, nombre o modelo de máquina.",
        "Filtrá por categoría desde el selector \"Todas las categorías\" para acotar resultados.",
        "Tocá una tarjeta para ver detalle, fotos y stock del producto.",
        "Si un precio dice \"Consultar\", contactanos por WhatsApp para cotizar.",
      ],
      link: { href: "/catalogo", label: "Abrir catálogo" },
    },
    {
      id: "cliente-registro",
      icon: UserPlus,
      titulo: "Cómo crear tu cuenta de cliente",
      resumen: "Una sola vez. Te queda historial de pedidos y descuentos.",
      pasos: [
        "Andá a appjeezpro.store/register.",
        "Completá nombre, usuario, email y una contraseña de mínimo 6 caracteres.",
        "Confirmá la contraseña y tocá \"Crear Cuenta Gratis\".",
        "Si la confirmación por email está activa, abrí el correo que te llega y tocá el enlace de confirmación.",
        "Volvé a appjeezpro.store/login e ingresá con tu email y contraseña.",
      ],
      link: { href: "/register", label: "Registrarme" },
    },
    {
      id: "cliente-login",
      icon: LogIn,
      titulo: "Cómo iniciar sesión",
      resumen: "Email + contraseña. Sin Google ni redes sociales.",
      pasos: [
        "Andá a appjeezpro.store/login.",
        "Ingresá el email con el que te registraste.",
        "Escribí tu contraseña. Tocá el ícono del ojo si querés verla mientras la tipeás.",
        "Tocá \"Iniciar Sesión\". Si todo es correcto, entrás a tu panel.",
      ],
      link: { href: "/login", label: "Iniciar sesión" },
    },
    {
      id: "cliente-recuperar",
      icon: KeyRound,
      titulo: "Cómo recuperar tu contraseña",
      resumen: "Si la olvidaste, te mandamos un link al mail para resetearla.",
      pasos: [
        "En la pantalla de login, tocá \"¿Olvidaste tu contraseña?\".",
        "Ingresá el email con el que te registraste.",
        "Revisá tu bandeja de entrada (y la carpeta de spam) en 1 a 2 minutos.",
        "Tocá el enlace del correo y definí una contraseña nueva.",
        "Volvé al login con tu nueva contraseña.",
      ],
    },
    {
      id: "cliente-pedido",
      icon: Receipt,
      titulo: "Cómo hacer un pedido",
      resumen: "Agregás al carrito, completás tus datos, pagás y enviás comprobante.",
      pasos: [
        {
          titulo: "Agregá productos al carrito",
          detalle: "Desde el catálogo, tocá \"Agregar\" en cada producto que quieras. Podés modificar cantidades en el carrito.",
        },
        {
          titulo: "Revisá tu carrito",
          detalle: "Tocá el ícono del carrito (arriba a la derecha). Confirmá cantidades, ofertas aplicadas y total.",
        },
        {
          titulo: "Completá tus datos",
          detalle: "Nombre, DNI, teléfono, dirección y forma de pago. Si ya tenés cuenta, se autocompleta.",
        },
        {
          titulo: "Confirmá el pedido",
          detalle: "Tocá \"Confirmar pedido\". Te asignamos un número de orden y te mostramos los datos para transferencia.",
        },
        {
          titulo: "Pagá y subí comprobante",
          detalle: "Hacé la transferencia y subí la captura del comprobante desde tu panel de cliente para acelerar el despacho.",
        },
      ],
      link: { href: "/catalogo", label: "Empezar pedido" },
    },
    {
      id: "cliente-comprobante",
      icon: BadgeCheck,
      titulo: "Cómo subir el comprobante de pago",
      resumen: "Hasta no recibir tu comprobante el pedido no avanza a despacho.",
      pasos: [
        "Iniciá sesión en appjeezpro.store/login.",
        "Andá a tu dashboard de cliente y abrí el pedido pendiente de pago.",
        "Tocá \"Subir comprobante\" y elegí la imagen o PDF de la transferencia.",
        "Esperá la confirmación visual de carga (tilde verde).",
        "El equipo del taller valida el pago en 1 a 4 horas hábiles y pasa el pedido a despacho.",
      ],
    },
    {
      id: "cliente-estado",
      icon: Truck,
      titulo: "Cómo ver el estado de tu pedido",
      resumen: "Cada pedido tiene 4 estados: pendiente, en preparación, despachado, entregado.",
      pasos: [
        "Iniciá sesión y entrá a tu dashboard.",
        "Verás tus pedidos ordenados del más reciente al más antiguo.",
        "El color del badge indica el estado: gris pendiente, amarillo en preparación, naranja despachado, verde entregado.",
        "Si el pedido fue despachado por correo o transporte, te mostramos el número de seguimiento.",
        "Si pasaron más de 5 días hábiles sin avance, contactanos por WhatsApp.",
      ],
    },
    {
      id: "cliente-descuentos",
      icon: Tag,
      titulo: "Cómo se aplican descuentos y promociones",
      resumen: "Los clientes registrados tienen 3 por ciento extra automático. Las ofertas se aplican solas.",
      pasos: [
        "Los productos con badge naranja (DESCUENTAZO, SUPER DESCUENTO, MEGA DESCUENTO) ya tienen el descuento aplicado en el precio mostrado.",
        "Si iniciás sesión como cliente, se te aplica 3 por ciento adicional sobre el total del carrito (no acumulable con cupones).",
        "Las promociones de envío gratis aparecen automáticamente cuando superás el monto mínimo, indicado arriba del carrito.",
        "No tenés que hacer nada especial: los descuentos se aplican en checkout.",
      ],
    },
  ],

  vendedor: [
    {
      id: "vendedor-login",
      icon: LogIn,
      titulo: "Cómo acceder al panel de vendedor",
      resumen: "URL exclusiva para vendedores con sus credenciales personales.",
      pasos: [
        "Andá a appjeezpro.store/catalogo/vendedor/login.",
        "Ingresá tu nombre de usuario y contraseña asignados por el gerente.",
        "Tocá \"Ingresar\". Entrás a tu dashboard con métricas, clientes y comisiones.",
      ],
      link: { href: "/catalogo/vendedor/login", label: "Login vendedor" },
    },
    {
      id: "vendedor-comisiones",
      icon: Wallet,
      titulo: "Cómo ver tus comisiones",
      resumen: "Comisiones por porcentaje configurado. Se acreditan al confirmar el pago del pedido.",
      pasos: [
        "En tu dashboard de vendedor, abrí la solapa \"Comisiones\".",
        "Vas a ver dos secciones: pendientes (pedidos sin pagar) y liquidadas (pagadas y disponibles para retiro).",
        "Cada fila muestra: número de pedido, cliente, monto del pedido, porcentaje aplicado y comisión calculada.",
        "El gerente marca el pago de las comisiones cuando se liquida.",
      ],
    },
    {
      id: "vendedor-clientes",
      icon: Users,
      titulo: "Cómo asignar un cliente nuevo",
      resumen: "El cliente se registra con tu link de referido. Vos quedás como vendedor asignado.",
      pasos: [
        "En tu dashboard, copiá tu link de referido (botón \"Compartir link\").",
        "Mandale el link al cliente por WhatsApp, mail o cualquier canal.",
        "Cuando el cliente se registra usando ese link, queda asociado a vos automáticamente.",
        "Todos los pedidos que haga ese cliente te generan comisión.",
      ],
    },
    {
      id: "vendedor-pedidos",
      icon: ListChecks,
      titulo: "Cómo ver tus pedidos",
      resumen: "Visibilidad en tiempo real de pedidos de tus clientes.",
      pasos: [
        "En tu dashboard abrí \"Mis pedidos\".",
        "Filtrá por estado: pendientes, en preparación, despachados, entregados.",
        "Tocá un pedido para ver detalle: productos, cliente, monto, comisión proyectada.",
        "Si el cliente tiene problemas con el pago, podés contactarlo directo desde el detalle.",
      ],
    },
    {
      id: "vendedor-gerente",
      icon: BarChart3,
      titulo: "Si sos gerente: cómo administrar el equipo",
      resumen: "Sólo si tu cuenta tiene flag de gerente activo.",
      pasos: [
        "Abrí appjeezpro.store/catalogo/vendedor/gerente.",
        "Verás: total de pedidos del equipo, comisiones pendientes y pagadas, ranking de vendedores.",
        "Podés ajustar el porcentaje de comisión por vendedor.",
        "Para liquidar comisiones, marcá las filas pagadas y tocá \"Confirmar liquidación\".",
      ],
    },
  ],

  taller: [
    {
      id: "taller-dashboard",
      icon: Wrench,
      titulo: "Cómo acceder al panel del taller",
      resumen: "Panel principal con accesos a todas las áreas operativas.",
      pasos: [
        "Andá a appjeezpro.store/login.",
        "Ingresá con tu cuenta de admin.",
        "Una vez dentro entrás directo a /taller, el dashboard.",
        "Desde acá accedés a ventas, inventario, tareas, agenda, mensajes, etiquetas, estadísticas y configuración.",
      ],
      link: { href: "/login", label: "Login admin" },
    },
    {
      id: "taller-ventas",
      icon: Receipt,
      titulo: "Cómo registrar una venta",
      resumen: "Toda venta queda con cliente, repuestos, mano de obra y total.",
      pasos: [
        "Entrá a /ventas desde el panel.",
        "Tocá \"Nueva venta\". Buscá o creá el cliente.",
        "Agregá repuestos: por SKU o por nombre. El stock se descuenta automático.",
        "Si hay mano de obra, agregá la línea correspondiente.",
        "Confirmá. Se genera el ticket imprimible y se descuenta del inventario.",
      ],
      link: { href: "/ventas", label: "Ir a ventas" },
    },
    {
      id: "taller-inventario",
      icon: Boxes,
      titulo: "Cómo gestionar el inventario",
      resumen: "Stock unificado entre taller y catálogo Mercado Libre.",
      pasos: [
        "Entrá a /inventario.",
        "Buscá un repuesto por SKU o nombre. Vas a ver: stock actual, mínimo de alerta y ubicación.",
        "Para ajustar stock, tocá la fila y editá el valor. Queda registrado quién hizo el cambio.",
        "Si un producto cae por debajo del stock mínimo, aparece en la columna roja \"A pedir\".",
        "Configurá alarmas de stock en /configuracion/alarmas.",
      ],
      link: { href: "/inventario", label: "Ir a inventario" },
    },
    {
      id: "taller-tareas",
      icon: ListChecks,
      titulo: "Cómo crear y asignar tareas",
      resumen: "Tablero de tareas pendientes con asignación por persona y prioridad.",
      pasos: [
        "Entrá a /tareas.",
        "Tocá \"Nueva tarea\". Definí título, descripción, prioridad y a quién se asigna.",
        "Si la tarea es recurrente, marcá \"Repetir\" y elegí frecuencia.",
        "La persona asignada la ve en su panel hasta que la marca como completada.",
        "En /tareas/historial revisás todas las completadas.",
      ],
      link: { href: "/tareas", label: "Ir a tareas" },
    },
    {
      id: "taller-agenda",
      icon: Calendar,
      titulo: "Cómo manejar la agenda de clientes",
      resumen: "Turnos de mantenimiento y reparación con recordatorio automático.",
      pasos: [
        "Entrá a /agenda.",
        "Tocá un día y horario libre para crear un turno.",
        "Asigná el cliente, la máquina y el tipo de servicio.",
        "Activá recordatorio si querés que se le mande WhatsApp 24hs antes.",
        "Cuando atendés al cliente, marcá el turno como completado para que pase al historial.",
      ],
      link: { href: "/agenda", label: "Ir a agenda" },
    },
    {
      id: "taller-meli-sync",
      icon: RefreshCw,
      titulo: "Cómo sincronizar Mercado Libre",
      resumen: "Trae publicaciones, preguntas, ventas y movimientos de envíos.",
      pasos: [
        "Entrá a /sincronizar.",
        "Tocá \"Sincronizar todo\" o elegí qué traer (publicaciones, preguntas, ventas, envíos).",
        "La sincronización corre en segundo plano. Vas a ver una barra de progreso.",
        "Cuando termina, /publicaciones y /mensajes quedan actualizadas con lo nuevo.",
        "Configurá sync automático cada 5, 15 o 60 minutos desde /configuracion.",
      ],
      link: { href: "/sincronizar", label: "Sincronizar" },
    },
    {
      id: "taller-publicaciones",
      icon: Megaphone,
      titulo: "Cómo gestionar publicaciones de Mercado Libre",
      resumen: "Editás precio, stock y oferta sin entrar al panel de Mercado Libre.",
      pasos: [
        "Entrá a /publicaciones.",
        "Filtrá por cuenta MeLi si tenés varias, o por estado (activa, pausada).",
        "Tocá una publicación para ver precio, stock, ventas, visitas y conversiones.",
        "Editá precio o stock desde el detalle. Los cambios se mandan a MeLi en menos de 30 segundos.",
        "Para crear promociones masivas usá /promociones.",
      ],
      link: { href: "/publicaciones", label: "Ir a publicaciones" },
    },
    {
      id: "taller-etiquetas",
      icon: Printer,
      titulo: "Cómo imprimir etiquetas de envío",
      resumen: "Etiquetas combinadas de varios pedidos en un solo PDF.",
      pasos: [
        "Entrá a /etiquetas.",
        "Filtrá por fecha o por cuenta MeLi.",
        "Seleccioná los envíos a imprimir tocando el checkbox.",
        "Tocá \"Descargar PDF combinado\". El sistema arma un PDF con todas las etiquetas.",
        "Imprimí en hoja A4 o térmica según tu configuración. Las etiquetas impresas se marcan en /historial-etiquetas.",
      ],
      link: { href: "/etiquetas", label: "Ir a etiquetas" },
    },
    {
      id: "taller-flex",
      icon: Truck,
      titulo: "Cómo manejar entregas Flex",
      resumen: "Asignación de drivers y seguimiento en tiempo real de envíos Flex.",
      pasos: [
        "Entrá a /flex.",
        "Vas a ver los envíos pendientes de despachar.",
        "Asigná driver, hora estimada de salida y ruta.",
        "El driver recibe la ruta en su app móvil y va marcando entregas.",
        "Cada entrega registra firma del receptor o foto del producto en la puerta.",
      ],
      link: { href: "/flex", label: "Ir a Flex" },
    },
    {
      id: "taller-precios",
      icon: Tag,
      titulo: "Cómo actualizar precios masivamente",
      resumen: "Subís un PDF o Excel y se actualizan miles de SKUs de una.",
      pasos: [
        "Entrá a /precios o /catalogo/admin/precios.",
        "Tocá \"Importar precios\". Subí el archivo (PDF, Excel o CSV).",
        "Revisá la previsualización: te muestra cuántos SKUs detectó y cuáles van a cambiar.",
        "Tocá \"Confirmar\". El sistema actualiza los precios y guarda el anterior en \"original_price\" por si querés deshacer.",
        "Si querés aplicar un descuento porcentual global, usá la herramienta de ofertas.",
      ],
      link: { href: "/precios", label: "Ir a precios" },
    },
    {
      id: "taller-stats",
      icon: BarChart3,
      titulo: "Cómo leer estadísticas y reportes",
      resumen: "Ventas, productos top, vendedores top, evolución mensual.",
      pasos: [
        "Entrá a /estadisticas para vista resumen, o /reportes para descarga.",
        "Filtrá por rango de fechas, vendedor o categoría.",
        "Vas a ver: ingresos totales, ticket promedio, productos más vendidos, vendedores top.",
        "En /reportes podés exportar Excel o PDF de ventas, comisiones, stock o pedidos.",
      ],
      link: { href: "/estadisticas", label: "Ir a estadísticas" },
    },
    {
      id: "taller-mensajes",
      icon: Bell,
      titulo: "Cómo responder mensajes de clientes",
      resumen: "Bandeja unificada con mensajes de WhatsApp, Mercado Libre y formulario web.",
      pasos: [
        "Entrá a /mensajes.",
        "Filtrá por canal (WhatsApp, Mercado Libre, formulario) y por estado (sin leer, en curso, cerrado).",
        "Abrí una conversación. Respondé desde el mismo panel. La respuesta se manda por el canal correspondiente.",
        "Marcá como \"En curso\" si requiere seguimiento o \"Cerrado\" si quedó resuelto.",
      ],
      link: { href: "/mensajes", label: "Ir a mensajes" },
    },
  ],

  faq: [
    {
      id: "faq-pago",
      icon: CreditCard,
      titulo: "¿Qué formas de pago aceptan?",
      resumen: "Transferencia, efectivo en local, MercadoPago y tarjetas según el caso.",
      pasos: [
        "Transferencia bancaria a CBU o alias del taller (más rápido).",
        "Efectivo retirando en el local.",
        "MercadoPago: link de pago enviado por WhatsApp después de confirmar el pedido.",
        "Tarjeta de crédito o débito en compras presenciales en el local.",
        "Para mayoristas o cuenta corriente, consultar con el área comercial.",
      ],
    },
    {
      id: "faq-entrega",
      icon: Clock,
      titulo: "¿Cuánto tarda la entrega?",
      resumen: "Entre 2 y 5 días hábiles según destino, una vez confirmado el pago.",
      pasos: [
        "CABA y GBA: 24 a 72 horas hábiles tras confirmación de pago.",
        "Interior del país: 3 a 7 días hábiles según localidad y transporte.",
        "Retiro en local: disponible al confirmar el pedido (en horario comercial).",
        "Si la app marca el catálogo como \"NORMAL\", el plazo es 2 a 5 días hábiles. Si está en \"DEMORA\", consultar.",
      ],
    },
    {
      id: "faq-envios",
      icon: MapPin,
      titulo: "¿Hacen envíos al interior?",
      resumen: "Sí, a todo el país por correo y transporte privado.",
      pasos: [
        "Trabajamos con Correo Argentino, Andreani, Mercado Envíos y transportes regionales.",
        "El costo se calcula al confirmar el pedido según peso, volumen y destino.",
        "Para envíos grandes (más de 30kg) coordinamos transporte privado.",
        "Si tu localidad no aparece en el cálculo automático, contactanos por WhatsApp.",
      ],
    },
    {
      id: "faq-garantia",
      icon: ShieldCheck,
      titulo: "¿Los productos tienen garantía?",
      resumen: "Sí. Garantía de fábrica vigente en todos los productos nuevos.",
      pasos: [
        "Repuestos nuevos: garantía de fábrica según marca (entre 3 y 12 meses).",
        "Productos usados o reparados: garantía limitada de 30 días por defectos de funcionamiento.",
        "Para hacer válida la garantía hay que conservar la factura o ticket.",
        "Daños por mal uso, accidente o instalación incorrecta no entran en garantía.",
      ],
    },
    {
      id: "faq-cambio",
      icon: RotateCcw,
      titulo: "¿Puedo cambiar o devolver un producto?",
      resumen: "Cambios hasta 10 días corridos en producto sin uso.",
      pasos: [
        "El producto debe estar sin uso, con su empaque original y todos sus accesorios.",
        "Tenés hasta 10 días corridos desde la fecha de entrega.",
        "Contactanos por WhatsApp para coordinar el cambio.",
        "El costo de envío del retorno corre por cuenta del comprador, salvo error nuestro.",
        "Devoluciones de dinero: se hacen por el mismo medio de pago original en 5 a 10 días hábiles.",
      ],
    },
    {
      id: "faq-iva",
      icon: FileText,
      titulo: "¿Los precios incluyen IVA?",
      resumen: "Sí. Todos los precios del catálogo son finales con IVA incluido.",
      pasos: [
        "Los precios mostrados en el catálogo son finales para consumidor final.",
        "Si necesitás factura A, indicalo al confirmar el pedido. El precio puede variar según condición fiscal.",
        "Para grandes volúmenes hay descuentos por mayorista. Consultar con el área comercial.",
      ],
    },
    {
      id: "faq-soporte",
      icon: MessageCircle,
      titulo: "¿Cómo contacto soporte?",
      resumen: "WhatsApp, email o formulario web. Respondemos en horario comercial.",
      pasos: [
        "WhatsApp: link de contacto directo desde el footer del sitio.",
        "Email: revisamos casilla cada 4 horas en horario comercial.",
        "Formulario web: desde la sección de contacto del sitio.",
        "Horario: lunes a viernes de 9 a 18hs. Sábados de 9 a 13hs. Domingos cerrado.",
      ],
    },
    {
      id: "faq-cuenta",
      icon: HelpCircle,
      titulo: "Tengo problemas con mi cuenta, ¿qué hago?",
      resumen: "La mayoría se resuelve con recuperar contraseña o limpiar caché.",
      pasos: [
        "Si no podés iniciar sesión: probá \"¿Olvidaste tu contraseña?\" en la pantalla de login.",
        "Si el sitio se ve raro o no carga: hacé Ctrl+F5 (Windows) o Cmd+Shift+R (Mac) para limpiar caché.",
        "Si después de registrarte no llegó el mail de confirmación: revisá la carpeta de spam.",
        "Si seguís con problemas, mandanos un WhatsApp con captura del error.",
      ],
    },
  ],
};

const TABS: { id: TabId; label: string; nota: string }[] = [
  { id: "cliente", label: "Para clientes", nota: "Catálogo, pedidos, pagos" },
  { id: "vendedor", label: "Para vendedores", nota: "Comisiones y equipo" },
  { id: "taller", label: "Para el taller", nota: "Operación interna" },
  { id: "faq", label: "Preguntas frecuentes", nota: "Lo más consultado" },
];

function normaliza(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export default function AyudaPage() {
  const [tab, setTab] = useState<TabId>("cliente");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const filtrados = useMemo(() => {
    const lista = TUTORIALES[tab];
    if (!q.trim()) return lista;
    const needle = normaliza(q);
    return lista.filter((t) => {
      const haystack = normaliza(
        t.titulo + " " + t.resumen + " " + t.pasos.map((p) => typeof p === "string" ? p : p.titulo + " " + p.detalle).join(" ")
      );
      return haystack.includes(needle);
    });
  }, [tab, q]);

  const totalTab = TUTORIALES[tab].length;

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white selection:bg-[#FF5722]/30">
      {/* Header / hero asimétrico */}
      <header className="border-b border-white/5">
        <div className="mx-auto max-w-7xl px-5 md:px-8 pt-8 pb-12 md:pt-14 md:pb-16">
          <Link
            href="/landing"
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al sitio
          </Link>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-6 items-end">
            <div className="md:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/60">
                <Sparkles className="h-3.5 w-3.5 text-[#FFE600]" />
                Centro de ayuda
              </div>
              <h1 className="mt-4 text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
                Todo lo que necesitás para
                <span className="block text-white/40">usar MaqJeez sin tropezones.</span>
              </h1>
              <p className="mt-5 max-w-[58ch] text-base md:text-lg text-white/60 leading-relaxed">
                Guías paso a paso para clientes, vendedores y el equipo del taller. Si algo no encontrás acá, contactanos por WhatsApp y lo resolvemos.
              </p>
            </div>

            <div className="md:col-span-5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar en la ayuda..."
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-4 pl-12 pr-4 text-base text-white placeholder:text-white/30 focus:border-[#FFE600] focus:outline-none focus:ring-2 focus:ring-[#FFE600]/30 transition"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-white/40">
                <span>{TUTORIALES.cliente.length + TUTORIALES.vendedor.length + TUTORIALES.taller.length + TUTORIALES.faq.length} guías</span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span>Actualizado constantemente</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs sticky */}
      <nav className="sticky top-0 z-20 border-b border-white/5 bg-[#0a0a0a]/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTab(t.id);
                    setAbierto(null);
                  }}
                  className={`relative shrink-0 px-4 md:px-5 py-4 text-left transition ${
                    active ? "text-white" : "text-white/50 hover:text-white/80"
                  }`}
                >
                  <div className="text-sm font-semibold">{t.label}</div>
                  <div className="text-[11px] text-white/40 mt-0.5">
                    {t.nota} · {TUTORIALES[t.id].length}
                  </div>
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#FFE600] rounded-t" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Contenido principal con sidebar */}
      <main className="mx-auto max-w-7xl px-5 md:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Lista de tutoriales */}
          <section className="lg:col-span-8">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                {TABS.find((t) => t.id === tab)?.label}
              </h2>
              <div className="text-sm text-white/40">
                {q ? `${filtrados.length} de ${totalTab}` : `${totalTab} guías`}
              </div>
            </div>

            {filtrados.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
                <Search className="mx-auto h-8 w-8 text-white/30" />
                <p className="mt-4 text-white/70">No encontramos guías para "{q}"</p>
                <p className="text-sm text-white/40 mt-1">Probá con otra palabra o consultanos por WhatsApp.</p>
              </div>
            )}

            <ol className="space-y-3">
              {filtrados.map((t, idx) => {
                const Icon = t.icon;
                const isOpen = abierto === t.id;
                return (
                  <li key={t.id} className="group">
                    <article
                      className={`rounded-2xl border bg-white/[0.02] transition ${
                        isOpen
                          ? "border-[#FFE600]/30 bg-white/[0.04]"
                          : "border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setAbierto(isOpen ? null : t.id)}
                        aria-expanded={isOpen}
                        className="flex w-full items-start gap-4 p-5 md:p-6 text-left"
                      >
                        <div className="shrink-0 mt-1">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-[#FFE600]">
                            <Icon className="h-5 w-5" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[11px] tabular-nums text-white/30">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <h3 className="text-base md:text-lg font-semibold text-white leading-tight">
                              {t.titulo}
                            </h3>
                          </div>
                          <p className="mt-1.5 text-sm text-white/55 leading-relaxed">
                            {t.resumen}
                          </p>
                        </div>
                        <ChevronDown
                          className={`mt-2 h-5 w-5 shrink-0 text-white/40 transition-transform ${
                            isOpen ? "rotate-180 text-[#FFE600]" : ""
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="border-t border-white/10 px-5 md:px-6 py-5 md:py-6">
                          <ol className="space-y-3">
                            {t.pasos.map((p, i) => {
                              const num = String(i + 1).padStart(2, "0");
                              if (typeof p === "string") {
                                return (
                                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-white/75">
                                    <span className="font-mono text-[11px] tabular-nums text-white/30 pt-1">
                                      {num}
                                    </span>
                                    <span className="flex-1">{p}</span>
                                  </li>
                                );
                              }
                              return (
                                <li key={i} className="flex gap-3">
                                  <span className="font-mono text-[11px] tabular-nums text-white/30 pt-1">
                                    {num}
                                  </span>
                                  <div className="flex-1">
                                    <div className="text-sm font-semibold text-white">{p.titulo}</div>
                                    <div className="mt-1 text-sm text-white/65 leading-relaxed">
                                      {p.detalle}
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ol>

                          {t.link && (
                            <div className="mt-5 flex flex-wrap gap-3">
                              <Link
                                href={t.link.href}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#FFE600] px-4 py-2 text-sm font-bold text-[#003087] hover:bg-[#ffd700] transition"
                              >
                                {t.link.label}
                                <ChevronDown className="h-4 w-4 -rotate-90" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => setAbierto(null)}
                                className="text-xs text-white/40 hover:text-white transition"
                              >
                                Cerrar
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Sidebar de contacto y acceso rápido */}
          <aside className="lg:col-span-4 lg:sticky lg:top-32 lg:self-start space-y-6">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#f97316]/10 to-transparent p-6">
              <div className="flex items-center gap-2 text-[#f97316]">
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Soporte directo</span>
              </div>
              <p className="mt-3 text-white/70 text-sm leading-relaxed">
                Si la guía no resuelve tu duda, escribinos. Respondemos en horario comercial.
              </p>
              <div className="mt-5 space-y-2.5">
                <a
                  href="https://wa.me/5491159000486"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.07] transition group"
                >
                  <span className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-white/60 group-hover:text-white" />
                    <span className="text-sm">WhatsApp 11 5900-0486</span>
                  </span>
                  <ChevronDown className="h-4 w-4 -rotate-90 text-white/40" />
                </a>
                <a
                  href="mailto:contacto@maqjeez.com.ar"
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.07] transition group"
                >
                  <span className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-white/60 group-hover:text-white" />
                    <span className="text-sm">Email</span>
                  </span>
                  <ChevronDown className="h-4 w-4 -rotate-90 text-white/40" />
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="text-sm font-bold uppercase tracking-wider text-white/70">
                Accesos rápidos
              </div>
              <ul className="mt-4 divide-y divide-white/5">
                {[
                  { href: "/catalogo", label: "Catálogo público" },
                  { href: "/login", label: "Iniciar sesión" },
                  { href: "/register", label: "Crear cuenta" },
                  { href: "/catalogo/vendedor/login", label: "Login vendedor" },
                  { href: "/catalogo/admin/login", label: "Login admin catálogo" },
                  { href: "/terminos", label: "Términos y condiciones" },
                  { href: "/privacidad", label: "Política de privacidad" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="flex items-center justify-between py-3 text-sm text-white/70 hover:text-white transition group"
                    >
                      <span>{l.label}</span>
                      <ChevronDown className="h-4 w-4 -rotate-90 text-white/30 group-hover:text-white/70" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="text-sm font-bold uppercase tracking-wider text-white/70">
                ¿Sos nuevo?
              </div>
              <p className="mt-3 text-sm text-white/60 leading-relaxed">
                Si recién empezás, te recomendamos leer estas 3 guías:
              </p>
              <ol className="mt-4 space-y-2 text-sm">
                {[
                  { tab: "cliente" as TabId, id: "cliente-catalogo", titulo: "Cómo navegar el catálogo" },
                  { tab: "cliente" as TabId, id: "cliente-registro", titulo: "Cómo crear tu cuenta" },
                  { tab: "cliente" as TabId, id: "cliente-pedido", titulo: "Cómo hacer un pedido" },
                ].map((r, i) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setTab(r.tab);
                        setAbierto(r.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="flex w-full items-start gap-3 text-left text-white/75 hover:text-white transition"
                    >
                      <span className="font-mono text-[11px] tabular-nums text-white/30 mt-1">
                        0{i + 1}
                      </span>
                      <span>{r.titulo}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer minimal */}
      <footer className="border-t border-white/5 mt-10">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-white/40">
          <div>
            Taller MAQJEEZ. Centro de ayuda. Última actualización: 2026.
          </div>
          <div className="flex gap-4">
            <Link href="/terminos" className="hover:text-white">Términos</Link>
            <Link href="/privacidad" className="hover:text-white">Privacidad</Link>
            <Link href="/cookies" className="hover:text-white">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

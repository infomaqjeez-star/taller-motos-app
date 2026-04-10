// ============================================================
// TIPOS CENTRALES â€” Taller MAQJEEZ
// DiseÃ±ado para MVP con localStorage y migraciÃ³n fÃ¡cil a Supabase/PostgreSQL
// ============================================================

export type MotorType = "desmalezadora" | "motosierra" | "grupo_electrogeno" | "otros";

export type RepairStatus =
  | "ingresado"
  | "diagnosticando"
  | "esperando_repuesto"
  | "en_reparacion"
  | "listo_para_retiro"
  | "entregado";

export type ClientNotification =
  | "pendiente_de_aviso"
  | "avisado"
  | "sin_respuesta";

export interface ExtraMachine {
  id: string;
  motorType: MotorType;
  machineTypeOther?: string;
  brand: string;
  model: string;
  reportedIssues: string;
}

export interface WorkOrder {
  id: string;
  // Datos del cliente
  clientName: string;
  clientPhone: string;
  // Datos del equipo
  motorType: MotorType;
  machineTypeOther?: string;   // texto libre cuando motorType === "otros"
  brand: string;
  model: string;
  // DiagnÃ³stico
  reportedIssues: string;
  // GestiÃ³n econÃ³mica
  budget: number | null;
  estimatedDays: number | null;
  // Seguimiento
  status: RepairStatus;
  clientNotification: ClientNotification;
  budgetAccepted: boolean;
  // Fechas
  entryDate: string; // ISO string â€” automÃ¡tica al crear
  completionDate: string | null; // ISO string â€” cuando pasa a "listo_para_retiro"
  deliveryDate: string | null; // ISO string â€” cuando se entrega
  // Inventario vinculado
  linkedParts: string[]; // IDs de PartToOrder
  // Notas internas
  internalNotes: string;
  // Fotos
  photoUrls: string[];
  // MÃ¡quinas adicionales del mismo cliente
  extraMachines?: ExtraMachine[];
  // Pagos
  totalPaid?: number;
  deposit?: number;       // seÃ±a / pago parcial al ingresar
}

export interface Pago {
  id: string;
  orderId: string;
  amount: number;
  method: "efectivo" | "transferencia" | "tarjeta" | "otro";
  notes: string;
  paidAt: string;
}

export interface PlantillaWhatsApp {
  id: string;
  name: string;
  message: string;
  createdAt: string;
}

export const PAYMENT_METHOD_LABELS: Record<Pago["method"], string> = {
  efectivo:      "Efectivo",
  transferencia: "Transferencia",
  tarjeta:       "Tarjeta",
  otro:          "Otro",
};

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  location: string; // ej: "Estante A-3", "CajÃ³n 2"
  minQuantity: number; // alerta de stock bajo
  notes: string;
}

export interface PartToOrder {
  id: string;
  name: string;
  quantity: number;
  orderId: string | null; // vinculado a una orden de trabajo
  orderClientName: string | null; // para referencia rÃ¡pida
  supplier: string;
  status: "pendiente" | "pedido" | "recibido";
  notes: string;
  createdAt: string;
}

// ============================================================
// Etiquetas legibles para la UI
// ============================================================

export const MOTOR_TYPE_LABELS: Record<MotorType, string> = {
  desmalezadora:    "Desmalezadora",
  motosierra:       "Motosierra",
  grupo_electrogeno: "Grupo ElectrÃ³geno",
  otros:            "Otros",
};

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  ingresado: "Ingresado",
  diagnosticando: "Diagnosticando",
  esperando_repuesto: "Esperando Repuesto",
  en_reparacion: "En ReparaciÃ³n",
  listo_para_retiro: "Listo para Retiro",
  entregado: "Entregado",
};

export const REPAIR_STATUS_COLORS: Record<RepairStatus, string> = {
  ingresado: "bg-gray-100 text-gray-700 border-gray-300",
  diagnosticando: "bg-blue-100 text-blue-700 border-blue-300",
  esperando_repuesto: "bg-yellow-100 text-yellow-700 border-yellow-300",
  en_reparacion: "bg-orange-100 text-orange-700 border-orange-300",
  listo_para_retiro: "bg-green-100 text-green-700 border-green-300",
  entregado: "bg-purple-100 text-purple-700 border-purple-300",
};

export const CLIENT_NOTIFICATION_LABELS: Record<ClientNotification, string> = {
  pendiente_de_aviso: "Pendiente de Aviso",
  avisado: "Avisado",
  sin_respuesta: "Sin Respuesta",
};

export interface AgendaCliente {
  id: string;
  nombre: string;
  telefono: string;
  createdAt: string;
}

export interface HistorialReparacion {
  id: string;
  clienteId: string;
  ordenId: string | null;
  fechaIngreso: string;
  motorType: string;
  brand: string;
  model: string;
  falla: string;
  trabajo: string;
  presupuesto: number | null;
  estadoFinal: string;
  photoUrls: string[];
  createdAt: string;
}

export const PART_ORDER_STATUS_LABELS: Record<
  PartToOrder["status"],
  string
> = {
  pendiente: "Pendiente",
  pedido: "Pedido",
  recibido: "Recibido",
};

// ============================================================
// LOGÃSTICA FLEX â€” Mercado Libre
// ============================================================

export type FlexZona = "cercana" | "media" | "lejana";

export interface FlexTarifa {
  zona: FlexZona;
  label: string;
  precio: number;
}

export const FLEX_TARIFAS: FlexTarifa[] = [
  { zona: "cercana", label: "Zona Cercana", precio: 4490 },
  { zona: "media",   label: "Zona Media",   precio: 6490 },
  { zona: "lejana",  label: "Zona Lejana",  precio: 8490 },
];

export const FLEX_LOCALIDADES: { nombre: string; zona: FlexZona }[] = [
  // Cercanas
  { nombre: "Ezeiza",                zona: "cercana" },
  // Media distancia
  { nombre: "Esteban EcheverrÃ­a",    zona: "media" },
  { nombre: "La Matanza Sur",        zona: "media" },
  // Lejanas
  { nombre: "Alte. Brown",           zona: "lejana" },
  { nombre: "Avellaneda",            zona: "lejana" },
  { nombre: "Berazategui",           zona: "lejana" },
  { nombre: "Berisso",               zona: "lejana" },
  { nombre: "CABA",                  zona: "lejana" },
  { nombre: "Campana",               zona: "lejana" },
  { nombre: "CaÃ±uelas",              zona: "lejana" },
  { nombre: "Del Viso",              zona: "lejana" },
  { nombre: "Derqui",                zona: "lejana" },
  { nombre: "Ensenada",              zona: "lejana" },
  { nombre: "Escobar",               zona: "lejana" },
  { nombre: "Florencio Varela",      zona: "lejana" },
  { nombre: "GarÃ­n",                 zona: "lejana" },
  { nombre: "Gral. RodrÃ­guez",       zona: "lejana" },
  { nombre: "Guernica",              zona: "lejana" },
  { nombre: "Hurlingham",            zona: "lejana" },
  { nombre: "Ing. Maschwitz",        zona: "lejana" },
  { nombre: "ItuzaingÃ³",             zona: "lejana" },
  { nombre: "JosÃ© C. Paz",           zona: "lejana" },
  { nombre: "La Matanza Norte",      zona: "lejana" },
  { nombre: "La Plata Centro",       zona: "lejana" },
  { nombre: "La Plata Norte",        zona: "lejana" },
  { nombre: "La Plata Oeste",        zona: "lejana" },
  { nombre: "LanÃºs",                 zona: "lejana" },
  { nombre: "Lomas de Zamora",       zona: "lejana" },
  { nombre: "LujÃ¡n",                 zona: "lejana" },
  { nombre: "Malvinas Argentinas",   zona: "lejana" },
  { nombre: "Marcos Paz",            zona: "lejana" },
  { nombre: "Merlo",                 zona: "lejana" },
  { nombre: "Moreno",                zona: "lejana" },
  { nombre: "MorÃ³n",                 zona: "lejana" },
  { nombre: "Nordelta",              zona: "lejana" },
  { nombre: "Pilar",                 zona: "lejana" },
  { nombre: "Quilmes",               zona: "lejana" },
  { nombre: "San Fernando",          zona: "lejana" },
  { nombre: "San Isidro",            zona: "lejana" },
  { nombre: "San MartÃ­n",            zona: "lejana" },
  { nombre: "San Miguel",            zona: "lejana" },
  { nombre: "San Vicente",           zona: "lejana" },
  { nombre: "Tigre",                 zona: "lejana" },
  { nombre: "Tres de Febrero",       zona: "lejana" },
  { nombre: "Vicente LÃ³pez",         zona: "lejana" },
  { nombre: "Villa Rosa",            zona: "lejana" },
  { nombre: "ZÃ¡rate",                zona: "lejana" },
];

// ============================================================
// VENTAS DE REPUESTOS
// ============================================================

export type MetodoPago = "efectivo" | "transferencia" | "debito" | "credito" | "mercado_pago";
export type VentaStatus = "activa" | "cancelada";

export const METODO_PAGO_LABELS: Record<MetodoPago, string> = {
  efectivo:      "Efectivo",
  transferencia: "Transferencia",
  debito:        "DÃ©bito",
  credito:       "CrÃ©dito",
  mercado_pago:  "Mercado Pago",
};

export const METODO_PAGO_ICONS: Record<MetodoPago, string> = {
  efectivo:      "ðŸ’µ",
  transferencia: "ðŸ¦",
  debito:        "ðŸ’³",
  credito:       "ðŸ’³",
  mercado_pago:  "ðŸ›’",
};

export interface VentaItem {
  id: string;
  ventaId: string;
  producto: string;
  sku: string;
  cantidad: number;
  precioUnit: number;
  subtotal: number;
}

export interface VentaRepuesto {
  id: string;
  vendedor: string;
  metodoPago: MetodoPago;
  total: number;
  status: VentaStatus;
  notas: string;
  createdAt: string;
  items: VentaItem[];
}

export interface VentasStats {
  totalFacturado: number;
  cantVentas: number;
  metodoTop: string | null;
  productoTop: string | null;
}

export interface VentasPorDia {
  dia: string;
  total: number;
  cant: number;
}

export interface TopProducto {
  producto: string;
  cantidad: number;
  total: number;
}

export interface FlexEnvio {
  id: string;
  fecha: string;
  localidad: string;
  zona: FlexZona;
  precioML: number;
  pagoFlete: number;
  ganancia: number;
  descripcion: string;
  nroSeguimiento: string;
  // Nuevos campos de etiqueta ML
  usuarioML: string;
  nombreDestinatario: string;
  direccion: string;
  codigoPostal: string;
  productoSku: string;
  packId: string;
  createdAt: string;
}

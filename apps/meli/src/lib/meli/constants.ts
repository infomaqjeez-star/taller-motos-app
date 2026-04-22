// Constantes de la API de Mercado Libre
// Documentación oficial: https://developers.mercadolibre.com.ar/

// ========== URLs BASE ==========
export const MELI_API_BASE = 'https://api.mercadolibre.com';
export const MELI_AUTH_BASE = 'https://auth.mercadolibre.com';

// ========== IDs DE AGENTES POR PAÍS (Nueva arquitectura 2026) ==========
// Usar en campo "to.user_id" al enviar mensajes
export const MELI_AGENT_IDS: Record<string, string> = {
  'MLA': '3037674934',  // Argentina
  'MLB': '3037675074',  // Brasil
  'MLC': '3020819166',  // Chile
  'MLM': '3037204279',  // México
  'MCO': '3037204123',  // Colombia
  'MLU': '3037204685',  // Uruguay/Otros
};

// ========== LÍMITES DE LA API ==========
export const MELI_LIMITS = {
  // Preguntas
  QUESTION_MAX_LENGTH: 2000,
  
  // Mensajes
  MESSAGE_MAX_LENGTH: 350,
  ATTACHMENT_MAX_SIZE_MB: 25,
  ATTACHMENT_TTL_HOURS: 48,
  MAX_ATTACHMENTS_PER_MESSAGE: 25,
  
  // Rate Limiting
  RATE_LIMIT_RPM: 500,  // requests per minute
  
  // Tokens
  ACCESS_TOKEN_TTL_SECONDS: 21600,  // 6 horas
  REFRESH_TOKEN_TTL_DAYS: 180,  // 6 meses
  
  // Cache
  CACHE_TTL_QUESTIONS_MINUTES: 5,
  CACHE_TTL_MESSAGES_MINUTES: 2,
  CACHE_TTL_ORDERS_MINUTES: 10,
};

// ========== ESTADOS DE PREGUNTAS ==========
export const QUESTION_STATUSES = {
  UNANSWERED: 'UNANSWERED',
  ANSWERED: 'ANSWERED',
  CLOSED_UNANSWERED: 'CLOSED_UNANSWERED',
  UNDER_REVIEW: 'UNDER_REVIEW',
} as const;

export const ANSWER_STATUSES = {
  ACTIVE: 'ACTIVE',
  DISABLED: 'DISABLED',
  BANNED: 'BANNED',
} as const;

// ========== ESTADOS DE ÓRDENES ==========
export const ORDER_STATUSES = {
  CONFIRMED: 'confirmed',
  PAYMENT_REQUIRED: 'payment_required',
  PAYMENT_IN_PROCESS: 'payment_in_process',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  PARTIALLY_REFUNDED: 'partially_refunded',
  PENDING_CANCEL: 'pending_cancel',
  CANCELLED: 'cancelled',
} as const;

// ========== TIPOS DE ENVÍO ==========
export const SHIPPING_MODES = {
  ME1: 'me1',  // Mercado Envíos 1 - Logística propia
  ME2: 'me2',  // Mercado Envíos 2 - Logística MeLi
  CUSTOM: 'custom',
  NOT_SPECIFIED: 'not_specified',
} as const;

export const LOGISTIC_TYPES = {
  DROP_OFF: 'drop_off',
  CROSS_DOCKING: 'cross_docking',
  XD_DROP_OFF: 'xd_drop_off',
  FULFILLMENT: 'fulfillment',
  SELF_SERVICE: 'self_service',  // Flex
  TURBO: 'turbo',
  DEFAULT: 'default',
  CUSTOM: 'custom',
  NOT_SPECIFIED: 'not_specified',
} as const;

// ========== TIPOS DE RECLAMOS ==========
export const CLAIM_TYPES = {
  CLAIM: 'claim',
  MEDIATION: 'mediation',
} as const;

export const CLAIM_STAGES = {
  CLAIM: 'claim',
  MEDIATION: 'mediation',
  DISPUTE: 'dispute',
} as const;

// ========== EVIDENCIAS DE ENVÍO ==========
export const EVIDENCE_TYPES = {
  SHIPPING_EVIDENCE: 'shipping_evidence',
  HANDLING_SHIPPING_EVIDENCE: 'handling_shipping_evidence',
} as const;

export const SHIPPING_METHODS = {
  MAIL: 'mail',  // Correo
  ENTRUSTED: 'entrusted',  // Encomienda/transportista
  PERSONAL_DELIVERY: 'personal_delivery',  // Entrega en mano
  EMAIL: 'email',  // Envío digital
} as const;

// ========== TÓPICOS DE NOTIFICACIONES ==========
export const NOTIFICATION_TOPICS = {
  QUESTIONS: 'questions',
  ORDERS: 'orders',
  ORDERS_V2: 'orders_v2',
  CLAIMS: 'claims',
  MESSAGES: 'messages',
  SHIPMENTS: 'shipments',
  PAYMENTS: 'payments',
  ITEMS: 'items',
} as const;

// ========== TAGS IMPORTANTES ==========
export const ORDER_TAGS = {
  FRAUD_RISK_DETECTED: 'fraud_risk_detected',
  DELIVERED: 'delivered',
  PAID: 'paid',
  PENDING: 'pending',
} as const;

// ========== HEADERS ==========
export const MELI_HEADERS = {
  AUTHORIZATION: 'Authorization',
  BEARER_PREFIX: 'Bearer ',
  CONTENT_TYPE: 'Content-Type',
  APPLICATION_JSON: 'application/json',
  X_FORMAT_NEW: 'X-Format-New',
  X_MULTICHANNEL: 'x-multichannel',
};

// ========== ERRORES COMUNES ==========
export const MELI_ERROR_CODES = {
  // OAuth
  INVALID_GRANT: 'invalid_grant',
  INVALID_CLIENT: 'invalid_client',
  INVALID_SCOPE: 'invalid_scope',
  UNAUTHORIZED_CLIENT: 'unauthorized_client',
  
  // API
  NOT_FOUND: 'not_found',
  FORBIDDEN: 'forbidden',
  UNAUTHORIZED: 'unauthorized',
  BAD_REQUEST: 'bad_request',
  RATE_LIMITED: 'rate_limited',
  
  // Ordenes
  ORDER_NOT_FOUND: 'order_not_found',
  NOT_OWNED_ORDER: 'not_owned_order',
  
  // Mensajes
  BLOCKED_CONVERSATION: 'blocked_conversation_send_message_forbidden',
};

// ========== TIEMPOS DE RESPUESTA (minutos) ==========
export const RESPONSE_TIME_THRESHOLDS = {
  EXCELLENT: 15,    // < 15 minutos
  GOOD: 60,         // < 1 hora
  FAIR: 180,        // < 3 horas
  POOR: 1440,       // < 24 horas
  CRITICAL: 10080,  // < 1 semana
};

// ========== COLORES PARA UI ==========
export const MELI_STATUS_COLORS = {
  // Preguntas
  UNANSWERED: '#FF5722',  // Naranja
  ANSWERED: '#39FF14',    // Verde
  CLOSED_UNANSWERED: '#6B7280',  // Gris
  UNDER_REVIEW: '#FFE600',  // Amarillo
  
  // Órdenes
  PAID: '#39FF14',
  PENDING: '#FFE600',
  CANCELLED: '#ef4444',
  
  // Envíos
  READY_TO_SHIP: '#00E5FF',
  SHIPPED: '#3B82F6',
  DELIVERED: '#39FF14',
};

// ========== SITES ==========
export const MELI_SITES = {
  ARGENTINA: 'MLA',
  BRASIL: 'MLB',
  CHILE: 'MLC',
  MEXICO: 'MLM',
  COLOMBIA: 'MCO',
  URUGUAY: 'MLU',
  PERU: 'MPE',
  ECUADOR: 'MEC',
} as const;

// ========== URLs DE DOCUMENTACIÓN ==========
export const MELI_DOCS = {
  QUESTIONS: 'https://developers.mercadolibre.com.ar/es_ar/gestiona-preguntas-y-respuestas',
  MESSAGES: 'https://developers.mercadolibre.com.ar/es_ar/gestion-de-mensajes',
  ORDERS: 'https://developers.mercadolibre.com.ar/es_ar/gestionar-ordenes',
  SHIPMENTS: 'https://developers.mercadolibre.com.ar/es_ar/gestion-mercado-envios',
  CLAIMS: 'https://developers.mercadolibre.com.ar/es_ar/reclamos',
};

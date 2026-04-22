// Tipos de la API de Mercado Libre
// Basado en documentación oficial

// ========== AUTENTICACIÓN ==========
export interface MeliTokenData {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
}

export interface MeliAccount {
  id: string;
  user_id: string;
  meli_user_id: string;
  meli_nickname: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ========== PREGUNTAS ==========
export interface MeliQuestion {
  id: number;
  date_created: string;
  item_id: string;
  seller_id: number;
  status: 'UNANSWERED' | 'ANSWERED' | 'CLOSED_UNANSWERED' | 'UNDER_REVIEW';
  text: string;
  deleted_from_listing: boolean;
  hold: boolean;
  suspected_spam: boolean;
  answer?: MeliAnswer | null;
  from: {
    id: number;
    answered_questions?: number;
    first_name?: string;
    last_name?: string;
    phone?: {
      number: string;
      area_code: string;
    };
    email?: string;
  };
}

export interface MeliAnswer {
  text: string;
  status: 'ACTIVE' | 'DISABLED' | 'BANNED';
  date_created: string;
}

export interface MeliQuestionsSearchResponse {
  total: number;
  limit: number;
  questions: MeliQuestion[];
  filters?: {
    limit: number;
    offset: number;
    api_version: string;
  };
}

export interface MeliResponseTime {
  user_id: number;
  total: {
    response_time: number;
  };
  weekend?: {
    response_time: number;
    sales_percent_increase: number | null;
  };
  weekdays_working_hours?: {
    response_time: number;
    sales_percent_increase: number | null;
  };
  weekdays_extra_hours?: {
    response_time: number;
    sales_percent_increase: number | null;
  };
}

// ========== MENSAJES ==========
export interface MeliMessage {
  id: string;
  site_id: string;
  client_id: number;
  from: {
    user_id: string;
  };
  to: {
    user_id: string;
  };
  status: 'available' | 'moderated' | 'rejected' | 'pending_translation';
  subject: string | null;
  text: string;
  message_date: {
    received: string;
    available: string;
    notified: string;
    created: string;
    read: string | null;
  };
  attachments?: string[];
  moderation_status?: {
    status: 'clean' | 'rejected' | 'pending' | 'non_moderated';
    date_moderated?: string;
    source?: string;
    reason?: string;
  };
}

export interface MeliMessagesResponse {
  paging: {
    limit: number;
    offset: number;
    total: number;
  };
  conversation_status: {
    path: string;
    status: string;
    substatus: string | null;
    status_date: string;
    status_update_allowed: boolean;
    claim_id: string | null;
    shipping_id: string | null;
  };
  messages: MeliMessage[];
}

export interface MeliAttachment {
  id: string;
  filename: string;
  original_filename: string;
  size: number;
  date_created: string;
  type: string;
}

// ========== ÓRDENES ==========
export interface MeliOrder {
  id: number;
  status: 'confirmed' | 'payment_required' | 'payment_in_process' | 'partially_paid' | 'paid' | 'partially_refunded' | 'pending_cancel' | 'cancelled';
  status_detail: string | null;
  date_created: string;
  date_closed: string;
  expiration_date: string;
  total_amount: number;
  currency_id: string;
  buyer: {
    id: string;
    nickname?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: {
      area_code: string;
      number: string;
    };
  };
  seller: {
    id: number;
    nickname?: string;
  };
  order_items: MeliOrderItem[];
  payments: MeliPayment[];
  shipping?: {
    id: number;
    status?: string;
    tracking_number?: string;
    tracking_method?: string;
  };
  feedback?: {
    buyer?: number;
    seller?: number;
  };
  tags: string[];
  taxes?: {
    amount: number;
    currency_id: string;
  };
  cancel_detail?: {
    group: string;
    code: string;
    description: string;
    requested_by: string;
    date: string;
  };
  context?: {
    channel: string;
    site: string;
    flows: string[];
  };
}

export interface MeliOrderItem {
  item: {
    id: string;
    title: string;
    variation_id: number | null;
    variation_attributes: any[];
  };
  quantity: number;
  unit_price: number;
  currency_id: string;
  sale_fee: number;
  gross_price?: number;
  discounts?: MeliDiscount[];
}

export interface MeliDiscount {
  amounts: {
    full: number;
    seller: number;
  };
}

export interface MeliPayment {
  id: number;
  reason: string;
  status_code: string | null;
  total_paid_amount: number;
  transaction_amount: number;
  date_approved: string;
  date_last_modified: string;
  installments: number;
  authorization_code: string;
  taxes_amount: number;
  operation_type: string;
  coupon_id: string | null;
  collector: {
    id: number;
  };
}

export interface MeliOrdersSearchResponse {
  query: string;
  results: MeliOrder[];
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
}

// ========== ENVÍOS ==========
export interface MeliShipment {
  id: number;
  status: string;
  substatus?: string;
  tracking_number?: string;
  tracking_method?: string;
  shipping_mode?: string;
  shipping_option?: {
    name: string;
    cost: number;
    currency_id: string;
    estimated_delivery: {
      date: string;
    };
  };
  sender_id: number;
  receiver_id: number;
  date_created: string;
  last_updated: string;
  lead_time?: {
    cost: number;
    currency_id: string;
  };
}

export interface MeliShippingMethod {
  id: number;
  name: string;
  type: string;
  deliver_to: string;
  status: string;
  site_id: string;
  free_options: string[];
  shipping_modes: string[];
  company_id: number;
  company_name: string;
  min_time: number;
  max_time: number | null;
  currency_id: string;
}

// ========== RECLAMOS ==========
export interface MeliClaim {
  id: number;
  type: 'claim' | 'mediation';
  stage: string;
  status: string;
  reason_id: string;
  reason: string;
  resource_id: string;
  resource: string;
  date_created: string;
  last_updated: string;
  players: MeliClaimPlayer[];
  messages?: MeliClaimMessage[];
}

export interface MeliClaimPlayer {
  role: string;
  type: string;
  user_id: number;
  nickname?: string;
}

export interface MeliClaimMessage {
  id: string;
  sender_role: string;
  text: string;
  date_created: string;
  attachments?: string[];
}

export interface MeliShippingEvidence {
  type: 'shipping_evidence' | 'handling_shipping_evidence';
  shipping_method: 'mail' | 'entrusted' | 'personal_delivery' | 'email';
  shipping_company_name?: string;
  destination_agency?: string;
  date_shipped?: string;
  date_delivered?: string;
  receiver_name?: string;
  receiver_id?: string;
  receiver_email?: string;
  tracking_number?: string;
  handling_date?: string;
  attachments: string[];
}

// ========== NOTIFICACIONES ==========
export interface MeliNotification {
  _id: string;
  topic: 'questions' | 'orders' | 'claims' | 'messages' | 'shipments' | 'payments';
  user_id: number;
  application_id: number;
  resource: string;
  attempts: number;
  sent: string;
  received: string;
  data?: any;
}

// ========== ERRORES ==========
export interface MeliApiError {
  message: string;
  error: string;
  status: number;
  cause?: any[];
}

// ========== CONSTANTES ==========
export const MELI_AGENT_IDS: Record<string, string> = {
  'MLA': '3037674934',  // Argentina
  'MLB': '3037675074',  // Brasil
  'MLC': '3020819166',  // Chile
  'MLM': '3037204279',  // México
  'MCO': '3037204123',  // Colombia
  'MLU': '3037204685',  // Uruguay/Otros
};

export const MELI_LIMITS = {
  QUESTION_MAX_LENGTH: 2000,
  MESSAGE_MAX_LENGTH: 350,
  ATTACHMENT_MAX_SIZE_MB: 25,
  ATTACHMENT_TTL_HOURS: 48,
  RATE_LIMIT_RPM: 500,
};

export const MELI_QUESTION_STATUSES = {
  UNANSWERED: 'UNANSWERED',
  ANSWERED: 'ANSWERED',
  CLOSED_UNANSWERED: 'CLOSED_UNANSWERED',
  UNDER_REVIEW: 'UNDER_REVIEW',
} as const;

export const MELI_ORDER_STATUSES = {
  CONFIRMED: 'confirmed',
  PAYMENT_REQUIRED: 'payment_required',
  PAYMENT_IN_PROCESS: 'payment_in_process',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  PARTIALLY_REFUNDED: 'partially_refunded',
  PENDING_CANCEL: 'pending_cancel',
  CANCELLED: 'cancelled',
} as const;

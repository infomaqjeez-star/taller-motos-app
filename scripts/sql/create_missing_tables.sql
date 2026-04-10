-- =====================================================
-- TABLAS FALTANTES PARA APP MAQJEEZ - Mercado Libre
-- Ejecutar esto en Supabase SQL Editor
-- =====================================================

-- 1. Tabla de Mensajes de compradores
CREATE TABLE IF NOT EXISTS meli_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meli_message_id BIGINT NOT NULL,
    meli_account_id UUID REFERENCES linked_meli_accounts(id) ON DELETE CASCADE,
    order_id BIGINT,
    pack_id BIGINT,
    buyer_id BIGINT,
    buyer_nickname TEXT,
    item_id TEXT,
    item_title TEXT,
    item_thumbnail TEXT,
    message_text TEXT,
    status TEXT DEFAULT 'UNREAD', -- UNREAD, READ, SENT
    message_type TEXT DEFAULT 'buyer', -- buyer, seller
    date_created TIMESTAMPTZ DEFAULT NOW(),
    date_read TIMESTAMPTZ,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(meli_message_id, meli_account_id)
);

-- 2. Tabla de Órdenes/Ventas
CREATE TABLE IF NOT EXISTS meli_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id BIGINT NOT NULL UNIQUE,
    meli_account_id UUID REFERENCES linked_meli_accounts(id) ON DELETE CASCADE,
    buyer_id BIGINT,
    buyer_nickname TEXT,
    buyer_email TEXT,
    item_id TEXT,
    item_title TEXT,
    item_thumbnail TEXT,
    quantity INTEGER DEFAULT 1,
    total_amount DECIMAL(12,2),
    currency_id TEXT DEFAULT 'ARS',
    status TEXT DEFAULT 'paid', -- paid, ready_to_ship, shipped, delivered, cancelled
    shipping_id BIGINT,
    shipping_status TEXT,
    date_created TIMESTAMPTZ DEFAULT NOW(),
    date_shipped TIMESTAMPTZ,
    date_delivered TIMESTAMPTZ,
    printed BOOLEAN DEFAULT FALSE,
    printed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Publicaciones/Items
CREATE TABLE IF NOT EXISTS meli_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id TEXT NOT NULL UNIQUE,
    meli_account_id UUID REFERENCES linked_meli_accounts(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    price DECIMAL(12,2),
    currency_id TEXT DEFAULT 'ARS',
    available_quantity INTEGER DEFAULT 0,
    sold_quantity INTEGER DEFAULT 0,
    thumbnail TEXT,
    pictures JSONB DEFAULT '[]',
    status TEXT DEFAULT 'active', -- active, paused, closed, under_review
    permalink TEXT,
    category_id TEXT,
    listing_type_id TEXT,
    date_created TIMESTAMPTZ,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Envíos/Shipments
CREATE TABLE IF NOT EXISTS meli_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id BIGINT NOT NULL UNIQUE,
    meli_account_id UUID REFERENCES linked_meli_accounts(id) ON DELETE CASCADE,
    order_id BIGINT,
    shipping_method TEXT,
    tracking_number TEXT,
    tracking_link TEXT,
    status TEXT DEFAULT 'ready_to_ship', -- ready_to_ship, shipped, delivered, cancelled
    receiver_address JSONB,
    date_created TIMESTAMPTZ DEFAULT NOW(),
    date_shipped TIMESTAMPTZ,
    date_delivered TIMESTAMPTZ,
    estimated_delivery TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Reclamos/Claims
CREATE TABLE IF NOT EXISTS meli_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id BIGINT NOT NULL UNIQUE,
    meli_account_id UUID REFERENCES linked_meli_accounts(id) ON DELETE CASCADE,
    order_id BIGINT,
    buyer_id BIGINT,
    buyer_nickname TEXT,
    status TEXT DEFAULT 'open', -- open, closed, resolved
    type TEXT,
    stage TEXT,
    description TEXT,
    date_created TIMESTAMPTZ DEFAULT NOW(),
    date_closed TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla de Historial de Etiquetas Impresas
CREATE TABLE IF NOT EXISTS printed_labels_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_ids BIGINT[] DEFAULT '{}',
    printed_at TIMESTAMPTZ DEFAULT NOW(),
    total_labels INTEGER DEFAULT 0,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabla de Promociones Propias
CREATE TABLE IF NOT EXISTS promociones_propias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    discount_type TEXT DEFAULT 'percentage', -- percentage, fixed_amount
    discount_value DECIMAL(10,2),
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    status TEXT DEFAULT 'active', -- active, paused, ended
    items_count INTEGER DEFAULT 0,
    item_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabla de Promociones de MeLi
CREATE TABLE IF NOT EXISTS meli_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    meli_account_id UUID REFERENCES linked_meli_accounts(id) ON DELETE CASCADE,
    promotion_id TEXT NOT NULL,
    name TEXT,
    discount_type TEXT,
    discount_value DECIMAL(10,2),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(promotion_id, meli_account_id)
);

-- 9. Tabla de Logs de Promociones
CREATE TABLE IF NOT EXISTS promotions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- create, update, delete, sync
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA MEJORAR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_meli_messages_account ON meli_messages(meli_account_id);
CREATE INDEX IF NOT EXISTS idx_meli_messages_status ON meli_messages(status);
CREATE INDEX IF NOT EXISTS idx_meli_messages_date ON meli_messages(date_created);

CREATE INDEX IF NOT EXISTS idx_meli_orders_account ON meli_orders(meli_account_id);
CREATE INDEX IF NOT EXISTS idx_meli_orders_status ON meli_orders(status);
CREATE INDEX IF NOT EXISTS idx_meli_orders_date ON meli_orders(date_created);
CREATE INDEX IF NOT EXISTS idx_meli_orders_printed ON meli_orders(printed);

CREATE INDEX IF NOT EXISTS idx_meli_items_account ON meli_items(meli_account_id);
CREATE INDEX IF NOT EXISTS idx_meli_items_status ON meli_items(status);

CREATE INDEX IF NOT EXISTS idx_meli_shipments_account ON meli_shipments(meli_account_id);
CREATE INDEX IF NOT EXISTS idx_meli_shipments_status ON meli_shipments(status);

CREATE INDEX IF NOT EXISTS idx_meli_claims_account ON meli_claims(meli_account_id);
CREATE INDEX IF NOT EXISTS idx_meli_claims_status ON meli_claims(status);

-- =====================================================
-- POLÍTICAS RLS (Row Level Security)
-- =====================================================

ALTER TABLE meli_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE meli_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE meli_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meli_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meli_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE printed_labels_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE promociones_propias ENABLE ROW LEVEL SECURITY;
ALTER TABLE meli_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions_log ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios solo ven datos de sus propias cuentas
CREATE POLICY "Users can view their own messages" ON meli_messages
    FOR SELECT USING (
        meli_account_id IN (
            SELECT id FROM linked_meli_accounts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own orders" ON meli_orders
    FOR SELECT USING (
        meli_account_id IN (
            SELECT id FROM linked_meli_accounts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own items" ON meli_items
    FOR SELECT USING (
        meli_account_id IN (
            SELECT id FROM linked_meli_accounts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own shipments" ON meli_shipments
    FOR SELECT USING (
        meli_account_id IN (
            SELECT id FROM linked_meli_accounts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own claims" ON meli_claims
    FOR SELECT USING (
        meli_account_id IN (
            SELECT id FROM linked_meli_accounts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own print history" ON printed_labels_history
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own promotions" ON promociones_propias
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view their own meli promotions" ON meli_promotions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their own promotion logs" ON promotions_log
    FOR SELECT USING (user_id = auth.uid());

-- =====================================================
-- TRIGGERS PARA ACTUALIZAR updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meli_messages_updated_at BEFORE UPDATE ON meli_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meli_orders_updated_at BEFORE UPDATE ON meli_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meli_items_updated_at BEFORE UPDATE ON meli_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meli_shipments_updated_at BEFORE UPDATE ON meli_shipments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meli_claims_updated_at BEFORE UPDATE ON meli_claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promociones_propias_updated_at BEFORE UPDATE ON promociones_propias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meli_promotions_updated_at BEFORE UPDATE ON meli_promotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

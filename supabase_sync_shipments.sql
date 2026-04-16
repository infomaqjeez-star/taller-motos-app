-- Función mejorada para sincronizar etiquetas desde MeLi
-- Esta función se puede llamar periódicamente para verificar etiquetas impresas en MeLi

CREATE OR REPLACE FUNCTION public.sync_shipments_from_meli(
  p_account_id UUID,
  p_shipment_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label_id UUID;
  v_shipment_id TEXT;
  v_order_id TEXT;
  v_tracking_number TEXT;
  v_buyer_nickname TEXT;
  v_shipping_method TEXT;
  v_status TEXT;
  v_user_id UUID;
BEGIN
  -- Extraer datos del JSON
  v_shipment_id := p_shipment_data->>'shipment_id';
  v_order_id := p_shipment_data->>'order_id';
  v_tracking_number := p_shipment_data->>'tracking_number';
  v_buyer_nickname := p_shipment_data->>'buyer_nickname';
  v_shipping_method := p_shipment_data->>'shipping_method';
  v_status := p_shipment_data->>'status';
  
  -- Obtener user_id de la cuenta
  SELECT user_id INTO v_user_id
  FROM linked_meli_accounts
  WHERE id = p_account_id;
  
  -- Insertar o actualizar
  INSERT INTO printed_labels (
    user_id,
    account_id,
    shipment_id,
    order_id,
    tracking_number,
    buyer_nickname,
    shipping_method,
    print_date,
    created_at
  ) VALUES (
    v_user_id,
    p_account_id,
    v_shipment_id,
    v_order_id,
    v_tracking_number,
    v_buyer_nickname,
    v_shipping_method,
    CASE WHEN v_status IN ('shipped', 'delivered') THEN NOW() ELSE NULL END,
    NOW()
  )
  ON CONFLICT (shipment_id) DO UPDATE SET
    tracking_number = EXCLUDED.tracking_number,
    shipping_method = EXCLUDED.shipping_method,
    print_date = CASE 
      WHEN printed_labels.print_date IS NULL AND EXCLUDED.print_date IS NOT NULL 
      THEN EXCLUDED.print_date 
      ELSE printed_labels.print_date 
    END,
    updated_at = NOW()
  RETURNING id INTO v_label_id;

  RETURN v_label_id;
END;
$$;

-- Crear índice único en shipment_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'printed_labels_shipment_id_unique'
  ) THEN
    CREATE UNIQUE INDEX printed_labels_shipment_id_unique 
    ON printed_labels(shipment_id);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Agregar columna updated_at si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'printed_labels' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE printed_labels ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

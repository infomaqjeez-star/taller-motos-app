-- FIX: order_id es integer pero MeLi usa IDs > 2 billones
-- Cambiar a BIGINT para soportar todos los order_id de MeLi
ALTER TABLE printed_labels ALTER COLUMN order_id TYPE BIGINT;

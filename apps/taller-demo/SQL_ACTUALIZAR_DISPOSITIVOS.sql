-- ============================================================
-- ACTUALIZAR TIPOS DE DISPOSITIVOS - AppJeez Demo
-- Ejecutar este SQL en Supabase SQL Editor
-- ============================================================

-- 1. Primero actualizar los datos existentes (convertir tipos antiguos a 'otros')
UPDATE reparaciones 
SET motor_type = 'otros' 
WHERE motor_type IN ('desmalezadora', 'motosierra', 'grupo_electrogeno');

UPDATE historial_reparaciones 
SET motor_type = 'otros' 
WHERE motor_type IN ('desmalezadora', 'motosierra', 'grupo_electrogeno');

-- 2. Eliminar el constraint CHECK antiguo y crear el nuevo
ALTER TABLE reparaciones 
DROP CONSTRAINT IF EXISTS reparaciones_motor_type_check;

ALTER TABLE reparaciones 
ADD CONSTRAINT reparaciones_motor_type_check 
CHECK (motor_type IN ('celular', 'tablet', 'tv', 'otros'));

-- 3. Actualizar la tabla de historial también
ALTER TABLE historial_reparaciones 
DROP CONSTRAINT IF EXISTS historial_reparaciones_motor_type_check;

-- Nota: historial_reparaciones no tiene constraint CHECK, es TEXT libre

-- 4. Verificar los cambios
SELECT '✅ Tipos de dispositivos actualizados correctamente' as resultado;
SELECT motor_type, COUNT(*) as cantidad FROM reparaciones GROUP BY motor_type;

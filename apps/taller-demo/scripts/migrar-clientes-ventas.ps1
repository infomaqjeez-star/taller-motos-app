# Script PowerShell para migrar columnas de cliente a ventas_repuestos en Supabase
# Requiere: PowerShell 7+ y acceso a internet

$SupabaseUrl = "https://eetoajcxbwcecbpsqorr.supabase.co"
$ServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVldG9hamN4YndjZWNicHNxb3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzEyMzk1NCwiZXhwIjoyMDkyNjk5OTU0fQ.esTJiSmngAlrZpaAXqYVWxGnUULTFdVinDorKsTORW4"

$Headers = @{
    "apikey" = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
    "Content-Type" = "application/json"
    "Prefer" = "resolution=merge-duplicates"
}

$SqlQuery = @"
ALTER TABLE ventas_repuestos
    ADD COLUMN IF NOT EXISTS cliente_nombre    TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS cliente_dni       TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS cliente_direccion TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS cliente_telefono  TEXT DEFAULT '';

UPDATE ventas_repuestos
SET cliente_nombre    = COALESCE(cliente_nombre, ''),
    cliente_dni       = COALESCE(cliente_dni, ''),
    cliente_direccion = COALESCE(cliente_direccion, ''),
    cliente_telefono  = COALESCE(cliente_telefono, '');
"@

# Ejecutar SQL directo via REST API de Supabase
$Body = @{ query = $SqlQuery } | ConvertTo-Json -Depth 10

try {
    $Response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/" -Method POST -Headers $Headers -Body $Body -ErrorAction Stop
    Write-Host "Migracion completada exitosamente." -ForegroundColor Green
} catch {
    Write-Host "Error en la migracion: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $errBody = $reader.ReadToEnd()
        Write-Host "Detalle: $errBody" -ForegroundColor Red
    }
}

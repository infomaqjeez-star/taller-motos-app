Add-Type -AssemblyName System.Drawing
$path = 'C:\Users\Mi Pc\Downloads\APP PARA TALLER MAQJEEZ\public\badges-autoridad.png'
$img = [System.Drawing.Image]::FromFile($path)
$bmp = New-Object System.Drawing.Bitmap($img)
$img.Dispose()
for ($x = 0; $x -lt $bmp.Width; $x++) {
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        $px = $bmp.GetPixel($x, $y)
        if ($px.R -lt 80 -and $px.G -lt 80 -and $px.B -lt 80) {
            $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, 13, 13, 13))
        }
    }
}
$bmp.Save($path)
$bmp.Dispose()
Write-Host "DONE"

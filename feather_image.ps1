Add-Type -AssemblyName System.Drawing

$srcPath = "d:\ZEX\MLM platform\public\hero-student.jpg"
$dstPath = "d:\ZEX\MLM platform\public\hero-student.png"

$src = [System.Drawing.Bitmap]::new($srcPath)
$width = $src.Width
$height = $src.Height

$dst = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Lock bits for high-speed direct memory processing
$rect = [System.Drawing.Rectangle]::new(0, 0, $width, $height)
$srcData = $src.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$dstData = $dst.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$bytes = [Math]::Abs($srcData.Stride) * $height
$rgbValues = New-Object byte[] $bytes
[System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $rgbValues, 0, $bytes)

# Feather margins (pixels from edge where fade begins)
$fadeLeft = 90.0
$fadeRight = 20.0
$fadeTop = 90.0
$fadeBottom = 130.0

for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
        $idx = ($y * $width + $x) * 4
        
        # Calculate fade factor for each edge (0.0 at edge, 1.0 inside)
        $factorX = 1.0
        if ($x -lt $fadeLeft) {
            $t = $x / $fadeLeft
            # Smoothstep curve: 3*t^2 - 2*t^3
            $factorX = $t * $t * (3.0 - 2.0 * $t)
        } elseif ($x -gt ($width - 1 - $fadeRight)) {
            $t = ($width - 1 - $x) / $fadeRight
            $factorX = $t * $t * (3.0 - 2.0 * $t)
        }
        
        $factorY = 1.0
        if ($y -lt $fadeTop) {
            $t = $y / $fadeTop
            $factorY = $t * $t * (3.0 - 2.0 * $t)
        } elseif ($y -gt ($height - 1 - $fadeBottom)) {
            $t = ($height - 1 - $y) / $fadeBottom
            $factorY = $t * $t * (3.0 - 2.0 * $t)
        }
        
        $alphaFactor = $factorX * $factorY
        if ($alphaFactor -lt 0) { $alphaFactor = 0 }
        if ($alphaFactor -gt 1) { $alphaFactor = 1 }
        
        # Apply alpha (byte at idx+3 is alpha in 32bppArgb / BGRA format)
        $currentAlpha = $rgbValues[$idx + 3]
        $newAlpha = [byte][Math]::Round($currentAlpha * $alphaFactor)
        $rgbValues[$idx + 3] = $newAlpha
    }
}

[System.Runtime.InteropServices.Marshal]::Copy($rgbValues, 0, $dstData.Scan0, $bytes)

$src.UnlockBits($srcData)
$dst.UnlockBits($dstData)
$src.Dispose()

$dst.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
$dst.Dispose()

Write-Output "Successfully created feathered transparent PNG at $dstPath"

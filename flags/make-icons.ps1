Add-Type -AssemblyName System.Drawing

function Generate-Icon {
    param(
        [int]$size,
        [string]$outputPath
    )

    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $s = $size / 512.0

    # Purple rounded square background
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#9955e7'))
    $r = 105.0 * $s
    $d = $r * 2.0
    $w = [float]$size
    $h = [float]$size

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, $d, $d, 180, 90)
    $path.AddArc($w - $d, 0, $d, $d, 270, 90)
    $path.AddArc($w - $d, $h - $d, $d, $d, 0, 90)
    $path.AddArc(0, $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath($bgBrush, $path)
    $path.Dispose()
    $bgBrush.Dispose()

    # Colors
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#ffffff'))
    $creamBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#f1edf8'))
    $creamDarkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#ddd4ea'))

    # Pole ball finial
    $ballX = [float]((146.0 - 14.0) * $s)
    $ballY = [float]((105.0 - 14.0) * $s)
    $ballD = [float](28.0 * $s)
    $g.FillEllipse($whiteBrush, $ballX, $ballY, $ballD, $ballD)

    # Pole rect
    $poleX = [float](136.0 * $s)
    $poleY = [float](110.0 * $s)
    $poleW = [float](20.0 * $s)
    $poleH = [float](292.0 * $s)
    $g.FillRectangle($whiteBrush, $poleX, $poleY, $poleW, $poleH)

    # Flag bands
    $flagX = [float](156.0 * $s)
    $flagW = [float](220.0 * $s)
    $bandH = [float](54.0 * $s)

    $band1Y = [float](118.0 * $s)
    $band2Y = [float](172.0 * $s)
    $band3Y = [float](226.0 * $s)

    $g.FillRectangle($whiteBrush, $flagX, $band1Y, $flagW, $bandH)
    $g.FillRectangle($creamBrush, $flagX, $band2Y, $flagW, $bandH)
    $g.FillRectangle($creamDarkBrush, $flagX, $band3Y, $flagW, $bandH)

    # Cleanup
    $whiteBrush.Dispose()
    $creamBrush.Dispose()
    $creamDarkBrush.Dispose()
    $g.Dispose()

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated $outputPath ($size x $size)"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = "flags" }

Generate-Icon -size 180 -outputPath (Join-Path $scriptDir "icon-180.png")
Generate-Icon -size 192 -outputPath (Join-Path $scriptDir "icon-192.png")
Generate-Icon -size 512 -outputPath (Join-Path $scriptDir "icon-512.png")

Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 1280, 800
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$rect = [System.Drawing.Rectangle]::new(0, 0, 1280, 800)
$bg = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, [System.Drawing.Color]::FromArgb(255, 30, 64, 120), [System.Drawing.Color]::FromArgb(255, 180, 120, 60), 45)
$g.FillRectangle($bg, 0, 0, 1280, 800)
$r = [System.Random]::new(42)
for ($i = 0; $i -lt 60; $i++) {
  $x = $r.Next(0, 1230)
  $y = $r.Next(0, 750)
  $s = $r.Next(20, 90)
  $c = [System.Drawing.Color]::FromArgb(255, $r.Next(120, 255), $r.Next(120, 255), $r.Next(120, 255))
  $b = [System.Drawing.SolidBrush]::new($c)
  $g.FillEllipse($b, $x, $y, $s, $s)
  $b.Dispose()
}
$font = [System.Drawing.Font]::new('Arial', 64, [System.Drawing.FontStyle]::Bold)
$g.DrawString('FOKUZ TEST 1280x800', $font, [System.Drawing.Brushes]::White, 220, 340)
$g.Dispose()
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.zcode\tmp" | Out-Null
$bmp.Save("$env:USERPROFILE\.zcode\tmp\fokuz-test-image.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "saved $env:USERPROFILE\.zcode\tmp\fokuz-test-image.png"

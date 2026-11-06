Add-Type -AssemblyName System.Drawing
$out = "$env:USERPROFILE\.zcode\tmp"
New-Item -ItemType Directory -Force -Path $out | Out-Null

foreach ($spec in @(@{ fmt = 'jpeg'; ext = 'jpg' }, @{ fmt = 'tiff'; ext = 'tiff' })) {
  $bmp = [System.Drawing.Bitmap]::new(960, 640)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $rect = [System.Drawing.Rectangle]::new(0, 0, 960, 640)
  $bg = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, [System.Drawing.Color]::FromArgb(255, 20, 90, 140), [System.Drawing.Color]::FromArgb(255, 220, 160, 80), 45)
  $g.FillRectangle($bg, 0, 0, 960, 640)
  $r = [System.Random]::new(7)
  for ($i = 0; $i -lt 40; $i++) {
    $x = $r.Next(0, 900); $y = $r.Next(0, 580); $s = $r.Next(24, 100)
    $c = [System.Drawing.Color]::FromArgb(255, $r.Next(120, 255), $r.Next(120, 255), $r.Next(120, 255))
    $b = [System.Drawing.SolidBrush]::new($c)
    $g.FillEllipse($b, $x, $y, $s, $s)
    $b.Dispose()
  }
  $font = [System.Drawing.Font]::new('Arial', 48, [System.Drawing.FontStyle]::Bold)
  $g.DrawString(("FOKUZ {0} 960x640" -f $spec.fmt.ToUpper()), $font, [System.Drawing.Brushes]::White, 150, 260)
  $g.Dispose()
  $codec = [System.Drawing.Imaging.ImageFormat]::$($spec.fmt)
  $path = Join-Path $out ("fokuz-test.{0}" -f $spec.ext)
  $bmp.Save($path, $codec)
  $bmp.Dispose()
  Write-Host "saved $path"
}

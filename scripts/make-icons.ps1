# Regenerate the PWA icon set from the source appicon.png (root directory).
# Requires ImageMagick 7 (magick on PATH). The zinc background (#50505a) is
# part of the source image; the maskable variant is padded to keep the glyph
# inside the ~80% safe zone for circular masks.

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path $root "appicon.png"
$public = Join-Path $root "public"

magick $src -filter Lanczos -resize 512x512 -unsharp 0x0.75+0.75+0.008 (Join-Path $public "pwa-512.png")
magick $src -filter Lanczos -resize 192x192 (Join-Path $public "pwa-192.png")
magick $src -resize 64x64 (Join-Path $public "favicon.png")
magick $src -filter Lanczos -resize 340x340 -background "#50505a" -gravity center -extent 512x512 (Join-Path $public "pwa-maskable-512.png")

Write-Host "icons regenerated into public/"

# FinCalc — PWA Icon Generation

The source vector icon lives at `icon.svg`. Before publishing the app, generate
PNG files at the sizes listed below from that SVG.

## Required PNG Files

| File | Size | Purpose |
|------|------|---------|
| `icon-72.png` | 72×72 | Android legacy |
| `icon-96.png` | 96×96 | Android / shortcut icons |
| `icon-128.png` | 128×128 | Chrome Web Store |
| `icon-144.png` | 144×144 | Windows tile / IE |
| `icon-152.png` | 152×152 | iPad / iOS |
| `icon-192.png` | 192×192 | Android home screen **(maskable)** |
| `icon-384.png` | 384×384 | Android splash |
| `icon-512.png` | 512×512 | Google Play / PWA splash **(maskable)** |
| `screenshot-mobile.png` | 390×844 | App store screenshot (manifest) |

> **Maskable icons**: The 192 and 512 PNG files must keep all visual content
> within the central 80% "safe zone" so OS icon masks (circle, squircle, etc.)
> don't clip the art. The source `icon.svg` already respects this constraint.

## Generation Methods

### Option A — Squoosh (browser, no install)
1. Open <https://squoosh.app>
2. Drop `icon.svg` in, resize to each target dimension, export as PNG.

### Option B — sharp CLI (Node.js)
```bash
npm install -g sharp-cli

for size in 72 96 128 144 152 192 384 512; do
  sharp -i icon.svg -o "icon-${size}.png" resize $size $size
done
```

### Option C — Inkscape (desktop)
```bash
for size in 72 96 128 144 152 192 384 512; do
  inkscape icon.svg \
    --export-type=png \
    --export-filename="icon-${size}.png" \
    -w $size -h $size
done
```

### Option D — ImageMagick
```bash
for size in 72 96 128 144 152 192 384 512; do
  convert -background none icon.svg \
    -resize ${size}x${size} \
    "icon-${size}.png"
done
```

## App Colors
- Primary: `#2563EB`
- Background (dark): `#0F172A`
- Background (light): `#F0F4F8`

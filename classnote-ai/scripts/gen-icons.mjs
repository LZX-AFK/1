// ═══════════════════════════════════════
// 生成抗锯齿高清 tabbar 图标
// 144×144 超采样 → 48×48 抗锯齿 → PNG
// ═══════════════════════════════════════
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { deflateSync } from 'zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'static', 'tabbar')
mkdirSync(outDir, { recursive: true })

const SCALE = 3          // supersample factor
const SW = 48 * SCALE    // 144
const SH = 48 * SCALE    // 144
const W = 48, H = 48

// --- PNG encoder ---
function crc32(buf) {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

function u32BE(v) { const b = Buffer.alloc(4); b.writeUInt32BE(v, 0); return b }
function chunk(type, data) {
  const typeB = Buffer.from(type, 'ascii')
  return Buffer.concat([u32BE(data.length), typeB, data, u32BE(crc32(Buffer.concat([typeB, data])))])
}

function rgbaToPng(rgba, w, h) {
  const rawLines = []
  for (let y = 0; y < h; y++) {
    rawLines.push(0)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      rawLines.push(rgba[i], rgba[i + 1], rgba[i + 2])
    }
  }
  const compressed = deflateSync(Buffer.from(rawLines), { level: 9 })
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

function downsample(hiRes, factor) {
  const w = W, h = H, f = factor, f2 = f * f
  const out = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let dy = 0; dy < f; dy++) {
        for (let dx = 0; dx < f; dx++) {
          const i = ((y * f + dy) * SW + (x * f + dx)) * 4
          r += hiRes[i]; g += hiRes[i + 1]; b += hiRes[i + 2]; a += hiRes[i + 3]
        }
      }
      const j = (y * w + x) * 4
      out[j] = Math.round(r / f2); out[j + 1] = Math.round(g / f2)
      out[j + 2] = Math.round(b / f2); out[j + 3] = Math.round(a / f2)
    }
  }
  return out
}

// --- Drawing on hi-res canvas ---
function createCanvas() {
  return new Uint8Array(SW * SH * 4)
}

function plot(rgba, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= SW || y < 0 || y >= SH) return
  const i = (y * SW + x) * 4
  // alpha blend
  const srcA = a / 255
  const dstA = rgba[i + 3] / 255
  const outA = srcA + dstA * (1 - srcA)
  if (outA === 0) { rgba[i] = rgba[i + 1] = rgba[i + 2] = rgba[i + 3] = 0; return }
  rgba[i]     = Math.round((r * srcA + rgba[i]     * dstA * (1 - srcA)) / outA)
  rgba[i + 1] = Math.round((g * srcA + rgba[i + 1] * dstA * (1 - srcA)) / outA)
  rgba[i + 2] = Math.round((b * srcA + rgba[i + 2] * dstA * (1 - srcA)) / outA)
  rgba[i + 3] = Math.round(outA * 255)
}

function fillRect(rgba, x, y, w, h, r, g, b) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      plot(rgba, x + dx, y + dy, r, g, b)
}

function fillCircle(rgba, cx, cy, radius, r, g, b) {
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2)
        plot(rgba, x, y, r, g, b)
}

function fillRoundRect(rgba, x, y, w, h, rad, r, g, b) {
  fillRect(rgba, x + rad, y, w - 2 * rad, h, r, g, b)
  fillRect(rgba, x, y + rad, w, h - 2 * rad, r, g, b)
  fillCircle(rgba, x + rad, y + rad, rad, r, g, b)
  fillCircle(rgba, x + w - rad - 1, y + rad, rad, r, g, b)
  fillCircle(rgba, x + rad, y + h - rad - 1, rad, r, g, b)
  fillCircle(rgba, x + w - rad - 1, y + h - rad - 1, rad, r, g, b)
}

function drawLine(rgba, x0, y0, x1, y1, thick, r, g, b) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  while (true) {
    fillCircle(rgba, x0, y0, thick, r, g, b)
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; x0 += sx }
    if (e2 < dx) { err += dx; y0 += sy }
  }
}

// ----- Y-coordinate helper (use 0-based on 144 grid) -----
const $ = (v) => Math.round(v * SCALE)

// ----- Icons -----
function iconHome(clr) {
  const c = createCanvas()
  const [r, g, b] = clr
  // Roof: triangle
  const roofTop = $(5), roofBase = $(20), roofLeft = $(4), roofRight = $(44)
  const bodyTop = $(20), bodyBtm = $(44), bodyL = $(6), bodyR = $(42)
  // Fill roof (triangle by scanline)
  for (let y = roofTop; y <= roofBase; y++) {
    const frac = (y - roofTop) / (roofBase - roofTop)
    const x0 = Math.round(roofLeft + (bodyL - roofLeft) * frac)
    const x1 = Math.round(roofRight - (roofRight - bodyR) * frac)
    for (let x = x0; x <= x1; x++) plot(c, x, y, r, g, b)
  }
  // Body
  fillRect(c, bodyL, bodyTop, bodyR - bodyL + 1, bodyBtm - bodyTop + 1, r, g, b)
  // Door
  fillRect(c, $(18), $(30), $(12), bodyBtm - $(30) + 1, 255, 255, 255)
  // Chimney
  fillRect(c, $(30), $(8), $(6), $(10), r, g, b)
  return c
}

function iconBook(clr) {
  const c = createCanvas()
  const [r, g, b] = clr
  const L = $(6), T = $(8), R = $(42), B = $(40)
  // Book cover
  fillRoundRect(c, L, T, R - L + 1, B - T + 1, $(3), r, g, b)
  // Spine
  fillRect(c, $(22), T, $(4), B - T + 1, 255, 255, 255)
  // Left page lines
  fillRect(c, $(10), $(16), $(10), $(3), 255, 255, 255)
  fillRect(c, $(10), $(23), $(10), $(3), 255, 255, 255)
  fillRect(c, $(10), $(30), $(10), $(3), 255, 255, 255)
  // Right page lines
  fillRect(c, $(28), $(16), $(10), $(3), 255, 255, 255)
  fillRect(c, $(28), $(23), $(10), $(3), 255, 255, 255)
  fillRect(c, $(28), $(30), $(10), $(3), 255, 255, 255)
  return c
}

function iconMic(clr) {
  const c = createCanvas()
  const [r, g, b] = clr
  // Mic head (rounded rect)
  fillRoundRect(c, $(15), $(4), $(18), $(20), $(6), r, g, b)
  // Mic body
  fillRect(c, $(18), $(22), $(12), $(5), r, g, b)
  // Arc arms
  for (let y = $(27); y <= $(39); y++) {
    const spread = (y - $(27)) * 0.8
    const cx = $(24)
    const armW = $(6)
    fillRect(c, Math.round(cx - armW - spread), y, Math.round(armW * 2 + spread * 2), $(1), r, g, b)
  }
  // Base
  fillRect(c, $(4), $(39), $(40), $(3), r, g, b)
  return c
}

function iconFolder(clr) {
  const c = createCanvas()
  const [r, g, b] = clr
  // Folder back
  fillRoundRect(c, $(4), $(12), $(40), $(30), $(2), r, g, b)
  // Tab
  fillRect(c, $(4), $(12), $(18), $(6), 255, 255, 255)
  // Tab highlight
  const lr = Math.min(255, r + 50), lg = Math.min(255, g + 50), lb = Math.min(255, b + 50)
  fillRect(c, $(4), $(18), $(40), $(24), lr, lg, lb)
  // Content lines
  fillRect(c, $(10), $(24), $(28), $(2), 255, 255, 255)
  fillRect(c, $(10), $(30), $(28), $(2), 255, 255, 255)
  fillRect(c, $(10), $(36), $(16), $(2), 255, 255, 255)
  return c
}

function iconPerson(clr) {
  const c = createCanvas()
  const [r, g, b] = clr
  // Head
  fillCircle(c, $(24), $(11), $(10), r, g, b)
  // Neck
  fillRect(c, $(20), $(20), $(8), $(4), r, g, b)
  // Body (rounded)
  fillRoundRect(c, $(8), $(24), $(32), $(22), $(6), r, g, b)
  // White cutout for head detail
  fillCircle(c, $(24), $(12), $(5), 255, 255, 255)
  // Leg gap
  fillRect(c, $(20), $(38), $(8), $(8), 255, 255, 255)
  return c
}

function parseColor(hex) {
  const m = hex.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [128, 128, 128]
}

// ----- Generate -----
const icons = [
  { name: 'home',           color: '#6B7280', fn: iconHome },
  { name: 'home-active',    color: '#4F46E5', fn: iconHome },
  { name: 'courses',        color: '#6B7280', fn: iconBook },
  { name: 'courses-active', color: '#4F46E5', fn: iconBook },
  { name: 'record',         color: '#6B7280', fn: iconMic },
  { name: 'record-active',  color: '#4F46E5', fn: iconMic },
  { name: 'knowledge',      color: '#6B7280', fn: iconFolder },
  { name: 'knowledge-active', color: '#4F46E5', fn: iconFolder },
  { name: 'profile',        color: '#6B7280', fn: iconPerson },
  { name: 'profile-active', color: '#4F46E5', fn: iconPerson },
  { name: 'record-mid',     color: '#FFFFFF', fn: iconMic },
]

for (const icon of icons) {
  const clr = parseColor(icon.color)
  const hiRes = icon.fn(clr)
  const loRes = downsample(hiRes, SCALE)
  const png = rgbaToPng(loRes, W, H)
  writeFileSync(join(outDir, `${icon.name}.png`), png)
  console.log(`  ✓ ${icon.name}.png (${png.length} bytes)`)
}

const sizes = {
  'home.png': 0, 'home-active.png': 0, 'courses.png': 0, 'courses-active.png': 0,
  'record.png': 0, 'record-active.png': 0, 'knowledge.png': 0, 'knowledge-active.png': 0,
  'profile.png': 0, 'profile-active.png': 0, 'record-mid.png': 0
}
console.log('Done! All 11 anti-aliased icons generated (144→48 supersampled).')

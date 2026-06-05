const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function crc32(buf) {
  let crc = 0xFFFFFFFF
  const table = new Int32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    table[i] = c
  }
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function createPNG(width, height, pixelFn) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0

  const rawData = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    const rowOff = y * (1 + width * 4)
    rawData[rowOff] = 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height)
      const pxOff = rowOff + 1 + x * 4
      rawData[pxOff] = r
      rawData[pxOff + 1] = g
      rawData[pxOff + 2] = b
      rawData[pxOff + 3] = a
    }
  }

  const compressed = zlib.deflateSync(rawData)

  function chunk(type, data) {
    const buf = Buffer.alloc(4 + 4 + data.length + 4)
    buf.writeUInt32BE(data.length, 0)
    buf.write(type, 4)
    data.copy(buf, 8)
    const crcVal = crc32(buf.slice(4, 8 + data.length))
    buf.writeUInt32BE(crcVal, 8 + data.length)
    return buf
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

function inPoly(x, y, pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1]
    const xj = pts[j][0], yj = pts[j][1]
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function inCircle(cx, cy, r, x, y) {
  return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r
}

const S = 48
const GRAY = [107, 114, 128, 255]
const INDIGO = [79, 70, 229, 255]
const DARK_GRAY = [75, 85, 99, 255]
const LIGHT_GRAY = [156, 163, 175, 255]
const DARK_INDIGO = [55, 48, 163, 255]
const LIGHT_INDIGO = [165, 180, 252, 255]
const WHITE = [255, 255, 255, 255]
const TRANS = [0, 0, 0, 0]

function home(active) {
  const color = active ? INDIGO : GRAY
  return (x, y) => {
    const roof = inPoly(x, y, [[24, 3], [3, 20], [45, 20]])
    const body = x >= 10 && x <= 38 && y >= 20 && y <= 44
    const door = x >= 20 && x <= 28 && y >= 30 && y <= 44
    const chimney = x >= 34 && x <= 40 && y >= 5 && y <= 15
    if ((roof || body || chimney) && !door) return color
    return TRANS
  }
}

function courses(active) {
  const color = active ? INDIGO : GRAY
  return (x, y) => {
    const spine = x >= 8 && x <= 13 && y >= 4 && y <= 44
    const leftPage = x >= 13 && x <= 24 && y >= 4 && y <= 44
    const rightPage = x >= 24 && x <= 40 && y >= 4 && y <= 44
    const spineLine = x >= 23 && x <= 25 && y >= 4 && y <= 44
    if (leftPage || rightPage) return active ? [79, 70, 229, 255] : GRAY
    if (spine) return active ? DARK_INDIGO : DARK_GRAY
    if (spineLine) return active ? LIGHT_INDIGO : LIGHT_GRAY
    return TRANS
  }
}

function knowledge(active) {
  const color = active ? INDIGO : GRAY
  return (x, y) => {
    const tab = x >= 8 && x <= 24 && y >= 6 && y <= 14
    const body = x >= 6 && x <= 42 && y >= 12 && y <= 42
    if (tab || body) return color
    return TRANS
  }
}

function profile(active) {
  const color = active ? INDIGO : GRAY
  return (x, y) => {
    if (inCircle(24, 14, 8, x, y)) return color
    const body = x >= 10 && x <= 38 && y >= 22 && y <= 44
    const neck = x >= 18 && x <= 30 && y >= 20 && y <= 26
    if (body || neck) return color
    return TRANS
  }
}

function record(active) {
  const color = active ? INDIGO : GRAY
  return (x, y) => {
    if (inCircle(24, 12, 8, x, y)) return color
    const handle = x >= 20 && x <= 28 && y >= 18 && y <= 33
    const base = x >= 14 && x <= 34 && y >= 33 && y <= 42
    if (handle || base) return color
    return TRANS
  }
}

function recordMidPng() {
  return (x, y) => {
    if (!inCircle(24, 24, 22, x, y)) return TRANS
    if (inCircle(24, 16, 6, x, y)) return INDIGO
    const handle = x >= 22 && x <= 26 && y >= 21 && y <= 30
    const base = x >= 18 && x <= 30 && y >= 30 && y <= 35
    if (handle || base) return INDIGO
    return WHITE
  }
}

const icons = {
  'home.png': createPNG(S, S, home(false)),
  'home-active.png': createPNG(S, S, home(true)),
  'courses.png': createPNG(S, S, courses(false)),
  'courses-active.png': createPNG(S, S, courses(true)),
  'knowledge.png': createPNG(S, S, knowledge(false)),
  'knowledge-active.png': createPNG(S, S, knowledge(true)),
  'profile.png': createPNG(S, S, profile(false)),
  'profile-active.png': createPNG(S, S, profile(true)),
  'record.png': createPNG(S, S, record(false)),
  'record-active.png': createPNG(S, S, record(true)),
  'record-mid.png': createPNG(S, S, recordMidPng()),
}

const dir = 'D:/classnote-ai-hx/static/tabbar'
for (const [name, buf] of Object.entries(icons)) {
  fs.writeFileSync(path.join(dir, name), buf)
  console.log(name + ': ' + buf.length + ' bytes')
}
console.log('Done! Generated 11 tabbar PNG icons.')

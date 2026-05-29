import os from 'node:os'

const port = process.env.PORT || '3000'
const interfaces = os.networkInterfaces()
const candidates = []

for (const [name, addresses] of Object.entries(interfaces)) {
  for (const address of addresses || []) {
    if (address.family === 'IPv4' && !address.internal) {
      candidates.push({
        name,
        address: address.address
      })
    }
  }
}

if (candidates.length === 0) {
  console.log('未找到局域网 IPv4 地址，请检查 WiFi 或有线网络。')
  process.exit(0)
}

console.log('可用于手机访问的后端地址：')
for (const item of candidates) {
  console.log(`- ${item.name}: http://${item.address}:${port}`)
}

console.log('')
console.log('课堂检查：先用手机浏览器打开上面的 /health 地址。')

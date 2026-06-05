/**
 * clear-dev-data.js
 * 清空开发环境中的测试数据
 * 仅允许 NODE_ENV !== 'production' 时运行
 *
 * 使用方式: npm run dev:clear-data
 */

const { PrismaClient } = require('@prisma/client')

if (process.env.NODE_ENV === 'production') {
  console.error('❌ Refuse to clear production data!')
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Clearing dev data...\n')

  // 先删子表，再删主表，避免外键约束错误
  const markers = await prisma.marker.deleteMany()
  console.log(`  Marker:       ${markers.count} deleted`)

  const transcripts = await prisma.transcript.deleteMany()
  console.log(`  Transcript:   ${transcripts.count} deleted`)

  const summaries = await prisma.summary.deleteMany()
  console.log(`  Summary:      ${summaries.count} deleted`)

  const sessions = await prisma.session.deleteMany()
  console.log(`  Session:      ${sessions.count} deleted`)

  console.log('\n✅ Dev data cleared successfully.')
}

main()
  .catch((err) => {
    console.error('❌ Error clearing data:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

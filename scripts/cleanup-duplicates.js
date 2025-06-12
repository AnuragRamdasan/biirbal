const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupDuplicateArticles() {
  console.log('🔄 Cleaning up duplicate articles...')
  
  try {
    // Find duplicate articles (same URL + workspaceId)
    const duplicates = await prisma.$queryRaw`
      SELECT url, "workspaceId", COUNT(*) as count
      FROM "Article"
      GROUP BY url, "workspaceId"
      HAVING COUNT(*) > 1
    `
    
    console.log(`Found ${duplicates.length} groups of duplicate articles`)
    
    for (const duplicate of duplicates) {
      console.log(`Cleaning up duplicates for URL: ${duplicate.url} in workspace: ${duplicate.workspaceId}`)
      
      // Get all articles for this URL + workspace
      const articles = await prisma.article.findMany({
        where: {
          url: duplicate.url,
          workspaceId: duplicate.workspaceId
        },
        orderBy: {
          createdAt: 'asc' // Keep the oldest one
        }
      })
      
      // Delete all except the first (oldest) one
      if (articles.length > 1) {
        const toDelete = articles.slice(1).map(a => a.id)
        await prisma.article.deleteMany({
          where: {
            id: {
              in: toDelete
            }
          }
        })
        console.log(`✅ Deleted ${toDelete.length} duplicate articles`)
      }
    }
    
    console.log('✅ Cleanup completed')
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupDuplicateArticles()
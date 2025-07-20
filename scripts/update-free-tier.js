/**
 * Script to update existing free tier subscriptions to new 10 link limit
 * Run with: node scripts/update-free-tier.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateFreeTierLimits() {
  try {
    console.log('🔄 Updating free tier subscriptions to new 10 link limit...')
    
    // Update all free tier subscriptions
    const result = await prisma.subscription.updateMany({
      where: {
        planId: 'free'
      },
      data: {
        monthlyLinkLimit: 10
      }
    })
    
    console.log(`✅ Updated ${result.count} free tier subscriptions`)
    
    // Also update any subscriptions that still have the old 30 link limit but are on free plan
    const legacyResult = await prisma.subscription.updateMany({
      where: {
        planId: 'free',
        monthlyLinkLimit: 30
      },
      data: {
        monthlyLinkLimit: 10
      }
    })
    
    console.log(`✅ Updated ${legacyResult.count} legacy free tier subscriptions`)
    
    // Show current distribution
    const counts = await prisma.subscription.groupBy({
      by: ['planId', 'monthlyLinkLimit'],
      _count: {
        id: true
      }
    })
    
    console.log('\n📊 Current subscription distribution:')
    counts.forEach(count => {
      console.log(`  ${count.planId}: ${count.monthlyLinkLimit} links/month - ${count._count.id} teams`)
    })
    
  } catch (error) {
    console.error('❌ Error updating subscriptions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateFreeTierLimits()
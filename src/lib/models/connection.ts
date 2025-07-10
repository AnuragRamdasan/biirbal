// Import database utilities from prisma
import { withTimeout, healthCheck, prisma, workerPrisma } from '../prisma'
import { withEdgeTimeout, edgeHealthCheck, getEdgePrisma } from '../prisma-edge'

// Detect runtime and use appropriate utilities
const isEdgeRuntime = () => {
  // Check if we're in edge runtime
  return process.env.NEXT_RUNTIME === 'edge' || 
         typeof EdgeRuntime !== 'undefined' ||
         globalThis.EdgeRuntime !== undefined
}

// Export database utilities
export const dbWithTimeout = isEdgeRuntime() ? withEdgeTimeout : withTimeout
export const dbHealthCheck = isEdgeRuntime() ? edgeHealthCheck : healthCheck
export const getPrismaClient = () => {
  if (isEdgeRuntime()) {
    return getEdgePrisma()
  }
  // Use workerPrisma for server-side operations, regular prisma for others
  return workerPrisma || prisma
}
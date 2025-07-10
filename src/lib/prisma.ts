// Legacy compatibility - redirects to the new unified client
export { prisma, getDbClient, dbHealthCheck, ensureDbConnection } from './db'

// For backwards compatibility
export const healthCheck = async (): Promise<boolean> => {
  const { dbHealthCheck } = await import('./db')
  return dbHealthCheck()
}
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.getDbClient = getDbClient;
exports.dbHealthCheck = dbHealthCheck;
exports.ensureDbConnection = ensureDbConnection;
const client_1 = require("@prisma/client");
// Global client management for Heroku deployment
const globalForPrisma = globalThis;
// Simple Prisma client factory for Heroku
function createPrismaClient() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required');
    }
    console.log('🔗 Creating Prisma client for Heroku');
    return new client_1.PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        },
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
    });
}
// Unified client getter - simplified for Heroku
async function getDbClient() {
    try {
        if (!globalForPrisma.prisma) {
            globalForPrisma.prisma = createPrismaClient();
        }
        return globalForPrisma.prisma;
    }
    catch (error) {
        console.error('❌ Failed to create database client:', error);
        throw error;
    }
}
// Direct export for backwards compatibility
exports.prisma = new Proxy({}, {
    get(target, prop) {
        if (!globalForPrisma.prisma) {
            globalForPrisma.prisma = createPrismaClient();
        }
        return globalForPrisma.prisma[prop];
    }
});
// Health check function
async function dbHealthCheck() {
    try {
        const client = await getDbClient();
        await client.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
}
// Connection helper
async function ensureDbConnection() {
    try {
        const client = await getDbClient();
        await client.$connect();
        console.log('✅ Database connection established');
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}

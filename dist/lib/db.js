"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.getDbClient = getDbClient;
exports.dbHealthCheck = dbHealthCheck;
exports.ensureDbConnection = ensureDbConnection;
// Runtime detection utilities
function isEdgeRuntime() {
    // Check for Edge Runtime environment
    return (typeof globalThis !== 'undefined' && 'EdgeRuntime' in globalThis ||
        process.env.NEXT_RUNTIME === 'edge' ||
        globalThis.navigator?.userAgent?.includes('Edge-Runtime'));
}
function isNodeRuntime() {
    return typeof process !== 'undefined' && process.versions?.node !== undefined && !isEdgeRuntime();
}
function isVercelRuntime() {
    return process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
}
// Client factory functions
async function createNodeClient() {
    // Dynamic import to avoid browser bundle issues
    const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
    // Use the same database URL logic as edge client for consistency
    const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL_UNPOOLED or DATABASE_URL is required');
    }
    return new PrismaClient({
        datasources: {
            db: {
                url: connectionString
            }
        }
    });
}
async function createEdgeClient() {
    // Dynamic imports for edge runtime
    const [{ PrismaClient }, { PrismaNeon }, { neon, neonConfig }] = await Promise.all([
        Promise.resolve().then(() => __importStar(require('@prisma/client'))),
        Promise.resolve().then(() => __importStar(require('@prisma/adapter-neon'))),
        Promise.resolve().then(() => __importStar(require('@neondatabase/serverless')))
    ]);
    // Configure WebSocket constructor for edge environments
    if (typeof WebSocket === 'undefined') {
        const { default: ws } = await Promise.resolve().then(() => __importStar(require('ws')));
        neonConfig.webSocketConstructor = ws;
    }
    const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL_UNPOOLED or DATABASE_URL is required for edge runtime');
    }
    console.log('🔗 Creating edge client with Neon adapter');
    // Use neon adapter for edge compatibility
    const sql = neon(connectionString);
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
    });
}
// Global client management
const globalForPrisma = globalThis;
// Unified client getter
async function getDbClient() {
    try {
        if (isEdgeRuntime() || isVercelRuntime()) {
            // Edge runtime or Vercel serverless - use Neon adapter for better connection handling
            if (!globalForPrisma.edgePrisma) {
                console.log('🔗 Creating edge client with Neon adapter (Vercel/Edge)');
                globalForPrisma.edgePrisma = await createEdgeClient();
            }
            return globalForPrisma.edgePrisma;
        }
        else if (isNodeRuntime()) {
            // Local Node.js runtime - use standard client
            if (!globalForPrisma.prisma) {
                console.log('🔗 Creating Node.js client (local)');
                globalForPrisma.prisma = await createNodeClient();
            }
            return globalForPrisma.prisma;
        }
        else {
            // Fallback to edge client for unknown environments
            console.warn('⚠️ Unknown runtime, trying edge client');
            if (!globalForPrisma.edgePrisma) {
                globalForPrisma.edgePrisma = await createEdgeClient();
            }
            return globalForPrisma.edgePrisma;
        }
    }
    catch (error) {
        console.error('❌ Failed to create database client:', error);
        throw error;
    }
}
// Lazy-loaded synchronous client for backwards compatibility
let _lazyPrisma;
exports.prisma = new Proxy({}, {
    get(target, prop) {
        if (!_lazyPrisma) {
            throw new Error('Prisma client not initialized. Use getDbClient() instead for edge compatibility.');
        }
        return _lazyPrisma[prop];
    }
});
// Initialize lazy client in local Node.js environment only (not in Vercel)
if (typeof process !== 'undefined' && process.versions?.node && !isEdgeRuntime() && !isVercelRuntime()) {
    createNodeClient().then(client => {
        _lazyPrisma = client;
        if (process.env.NODE_ENV !== 'production') {
            globalForPrisma.prisma = client;
        }
    }).catch(console.error);
}
// Health check function that works in both environments
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

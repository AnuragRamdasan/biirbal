#!/usr/bin/env tsx
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
const client_1 = require("@prisma/client");
const readline = __importStar(require("readline"));
const prisma = new client_1.PrismaClient();
async function askConfirmation(message) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(message, (answer) => {
            rl.close();
            resolve(answer.toLowerCase().trim() === 'yes');
        });
    });
}
async function deleteUser(email) {
    try {
        // Find the user
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                accounts: true,
                sessions: true,
                memberships: {
                    include: {
                        team: {
                            select: { teamName: true }
                        }
                    }
                },
                audioListens: {
                    include: {
                        processedLink: {
                            select: { title: true, url: true }
                        }
                    }
                }
            }
        });
        if (!user) {
            console.log(`❌ User with email "${email}" not found.`);
            return;
        }
        // Display user information
        console.log('\n📋 User Information:');
        console.log(`- ID: ${user.id}`);
        console.log(`- Name: ${user.name || 'N/A'}`);
        console.log(`- Email: ${user.email}`);
        console.log(`- Created: ${user.createdAt.toISOString()}`);
        console.log(`- Accounts: ${user.accounts.length}`);
        console.log(`- Sessions: ${user.sessions.length}`);
        console.log(`- Team Memberships: ${user.memberships.length}`);
        console.log(`- Audio Listens: ${user.audioListens.length}`);
        if (user.memberships.length > 0) {
            console.log('\n🏢 Team Memberships:');
            user.memberships.forEach(membership => {
                console.log(`  - ${membership.team.teamName || 'Unnamed Team'} (${membership.role})`);
            });
        }
        if (user.audioListens.length > 0) {
            console.log('\n🎵 Recent Audio Listens:');
            user.audioListens.slice(0, 5).forEach(listen => {
                console.log(`  - ${listen.processedLink.title || listen.processedLink.url}`);
            });
            if (user.audioListens.length > 5) {
                console.log(`  ... and ${user.audioListens.length - 5} more`);
            }
        }
        // Confirmation
        console.log('\n⚠️  DANGER: This will permanently delete the user and all associated data!');
        console.log('This action cannot be undone.');
        const confirmed = await askConfirmation('\nType "yes" to confirm deletion: ');
        if (!confirmed) {
            console.log('❌ Deletion cancelled.');
            return;
        }
        // Final confirmation for safety
        const finalConfirmed = await askConfirmation(`\n🚨 FINAL WARNING: Delete user "${email}"? Type "yes": `);
        if (!finalConfirmed) {
            console.log('❌ Deletion cancelled.');
            return;
        }
        console.log('\n🗑️  Starting deletion process...');
        // Use transaction for atomic deletion
        await prisma.$transaction(async (tx) => {
            // 1. Update AudioListen records to remove user reference (set userId to null)
            const audioListenUpdate = await tx.audioListen.updateMany({
                where: { userId: user.id },
                data: { userId: null }
            });
            console.log(`✅ Updated ${audioListenUpdate.count} audio listen records`);
            // 2. Delete the user (cascading deletes will handle related records)
            // This will automatically delete:
            // - TeamMembership records (onDelete: Cascade)
            // - Account records (onDelete: Cascade)
            // - Session records (onDelete: Cascade)
            await tx.user.delete({
                where: { id: user.id }
            });
            console.log('✅ User and all related records deleted');
        });
        console.log(`\n🎉 Successfully deleted user "${email}" and all associated data.`);
    }
    catch (error) {
        console.error('❌ Error deleting user:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
async function main() {
    const email = process.argv[2];
    if (!email) {
        console.log('Usage: tsx scripts/delete-user.ts <email>');
        console.log('Example: tsx scripts/delete-user.ts user@example.com');
        process.exit(1);
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.log('❌ Invalid email format');
        process.exit(1);
    }
    console.log(`🔍 Looking up user: ${email}`);
    try {
        await deleteUser(email);
    }
    catch (error) {
        console.error('💥 Script failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}

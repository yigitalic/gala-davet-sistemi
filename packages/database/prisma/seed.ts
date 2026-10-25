/**
 * GALA & PR OPERASYON PLATFORMU (B2B SaaS) — PRISMA SEED (TypeScript)
 * 
 * Bu dosya `prisma db seed` veya `ts-node / tsx packages/database/prisma/seed.ts`
 * komutlarıyla tetiklenir.
 */

import { PrismaClient } from '@prisma/client';
// @ts-ignore
const { generateSeedData } = require('../scripts/seed-runner.cjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Gala & PR Platformu: PostgreSQL Tohumlama (Seed) Başlatılıyor ---');
  const data = generateSeedData();

  try {
    // 1. Kullanıcılar
    for (const u of data.users) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          isActive: u.isActive,
          twoFactorEnabled: u.twoFactorEnabled,
          twoFactorSecret: u.twoFactorSecret,
        },
        create: {
          id: u.id,
          email: u.email,
          passwordHash: u.passwordHash,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          isActive: u.isActive,
          twoFactorEnabled: u.twoFactorEnabled,
          twoFactorSecret: u.twoFactorSecret,
          lastLoginAt: u.lastLoginAt,
        },
      });
    }

    // 2. Etkinlikler (Koltuksuz Kapasite Modeli)
    for (const e of data.events) {
      await prisma.event.upsert({
        where: { id: e.id },
        update: {
          title: e.title,
          venue: e.venue,
          capacity: e.capacity,
          status: e.status,
        },
        create: {
          id: e.id,
          title: e.title,
          movieTitle: e.movieTitle,
          description: e.description,
          venue: e.venue,
          startsAt: e.startsAt,
          doorsOpenAt: e.doorsOpenAt,
          capacity: e.capacity,
          status: e.status,
        },
      });
    }

    // 3. Davetliler ve Sosyal Profiller
    for (const g of data.guests) {
      await prisma.guest.upsert({
        where: { emailBlindIndex: g.emailBlindIndex },
        update: {
          firstName: g.firstName,
          lastName: g.lastName,
          company: g.company,
          title: g.title,
          tags: g.tags,
          loyaltyScore: g.loyaltyScore,
        },
        create: {
          id: g.id,
          firstName: g.firstName,
          lastName: g.lastName,
          company: g.company,
          title: g.title,
          emailEncrypted: g.emailEncrypted,
          emailBlindIndex: g.emailBlindIndex,
          phoneEncrypted: g.phoneEncrypted,
          phoneBlindIndex: g.phoneBlindIndex,
          tags: g.tags,
          loyaltyScore: g.loyaltyScore,
          totalInvited: g.totalInvited,
          totalAttended: g.totalAttended,
          lastMinuteCancels: g.lastMinuteCancels,
          noShows: g.noShows,
          isBlacklisted: g.isBlacklisted,
          blacklistReason: g.blacklistReason,
        },
      });
    }

    console.log('>> PostgreSQL Veritabanı Başarıyla Tohumlandı (Seed Completed).');
  } catch (err: any) {
    console.warn('Veritabanı bağlantısı veya tohumlama uyarısı:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { main };

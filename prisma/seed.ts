import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const logger = new Logger('Seed');

async function main() {
  await Promise.all([
    prisma.shipmentType.upsert({
      where: { code: 'parcel' },
      update: { label: 'Посилка', isDefault: false },
      create: { code: 'parcel', label: 'Посилка', isDefault: false },
    }),
    prisma.shipmentType.upsert({
      where: { code: 'documents' },
      update: { label: 'Документи', isDefault: true },
      create: { code: 'documents', label: 'Документи', isDefault: true },
    }),
  ]);

  await Promise.all([
    prisma.productType.upsert({
      where: { code: 'sticker' },
      update: { label: 'Наклейка', isCustom: false },
      create: { code: 'sticker', label: 'Наклейка', isCustom: false },
    }),
    prisma.productType.upsert({
      where: { code: 'keychain' },
      update: { label: 'Брелок', isCustom: false },
      create: { code: 'keychain', label: 'Брелок', isCustom: false },
    }),
    prisma.productType.upsert({
      where: { code: 'custom_sticker' },
      update: { label: 'Кастомна наклейка', isCustom: true },
      create: { code: 'custom_sticker', label: 'Кастомна наклейка', isCustom: true },
    }),
  ]);

  await Promise.all([
    prisma.paymentType.upsert({
      where: { code: 'full' },
      update: { label: 'повна оплата' },
      create: { code: 'full', label: 'повна оплата' },
    }),
    prisma.paymentType.upsert({
      where: { code: 'cod' },
      update: { label: 'післяплата' },
      create: { code: 'cod', label: 'післяплата' },
    }),
    prisma.paymentType.upsert({
      where: { code: 'partial' },
      update: { label: 'часткова оплата' },
      create: { code: 'partial', label: 'часткова оплата' },
    }),
  ]);

  await Promise.all([
    prisma.expenseType.upsert({
      where: { code: 'raw_poster' },
      update: { label: 'Сировина плакат', requiresName: false },
      create: { code: 'raw_poster', label: 'Сировина плакат', requiresName: false },
    }),
    prisma.expenseType.upsert({
      where: { code: 'keychain_blank' },
      update: { label: 'Заготовки для брелків', requiresName: false },
      create: { code: 'keychain_blank', label: 'Заготовки для брелків', requiresName: false },
    }),
    prisma.expenseType.upsert({
      where: { code: 'delivery' },
      update: { label: 'Доставка', requiresName: false },
      create: { code: 'delivery', label: 'Доставка', requiresName: false },
    }),
    prisma.expenseType.upsert({
      where: { code: 'other' },
      update: { label: 'Інше', requiresName: true },
      create: { code: 'other', label: 'Інше', requiresName: true },
    }),
  ]);

  await Promise.all([
    prisma.deliveryType.upsert({
      where: { code: 'warehouse' },
      update: { label: 'Відділення' },
      create: { code: 'warehouse', label: 'Відділення' },
    }),
    prisma.deliveryType.upsert({
      where: { code: 'address' },
      update: { label: 'Адреса' },
      create: { code: 'address', label: 'Адреса' },
    }),
    prisma.deliveryType.upsert({
      where: { code: 'postomat' },
      update: { label: 'Поштомат' },
      create: { code: 'postomat', label: 'Поштомат' },
    }),
  ]);

  const shipmentStatuses = [
    { code: 'shipped', label: 'Відправлено', npStatusCodes: ['4', '41', '5', '6'] },
    { code: 'delivered', label: 'Доставлено', npStatusCodes: ['7', '8'] },
    { code: 'received', label: 'Отримано', npStatusCodes: ['9', '10', '11'] },
    { code: 'refused', label: 'Відмовлено', npStatusCodes: ['102', '103', '108'] },
  ];

  const seenNpStatusCodes = new Set<string>();
  for (const status of shipmentStatuses) {
    for (const npStatusCode of status.npStatusCodes) {
      if (seenNpStatusCodes.has(npStatusCode)) {
        throw new Error(
          `Nova Poshta status code "${npStatusCode}" is assigned to more than one shipment_statuses row`,
        );
      }
      seenNpStatusCodes.add(npStatusCode);
    }
  }

  await Promise.all(
    shipmentStatuses.map((status) =>
      prisma.shipmentStatus.upsert({
        where: { code: status.code },
        update: { label: status.label, npStatusCodes: status.npStatusCodes },
        create: status,
      }),
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    logger.error(error instanceof Error ? error.stack : String(error));
    await prisma.$disconnect();
    process.exit(1);
  });

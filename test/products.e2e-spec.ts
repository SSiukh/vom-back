import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CloudinaryService } from '../src/cloudinary/cloudinary.service';
import { createAuthenticatedUser } from './support/auth-helper';
import { safeDeleteByIds } from './support/cleanup-helper';

interface ProductResponseBody {
  id: string;
  typeId: string;
  name: string;
  photoUrl: string;
  price: number;
  promoPrice: number | null;
  stockQuantity: number;
}

interface ListProductsResponseBody {
  items: ProductResponseBody[];
  total: number;
}

describe('Products (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let authUserId: string;
  const createdIds: string[] = [];
  let stickerTypeId: string;
  let customTypeId: string;

  const uploadedPhotoUrl = 'https://cloudinary.example/e2e-photo.jpg';
  const validPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CloudinaryService)
      .useValue({
        uploadImage: jest.fn().mockResolvedValue({
          secureUrl: uploadedPhotoUrl,
          publicId: 'e2e/photo',
        }),
        deleteImage: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    const authUser = await createAuthenticatedUser(
      app,
      prisma,
      'e2e-products-auth-user',
    );
    accessToken = authUser.accessToken;
    authUserId = authUser.userId;

    const stickerType = await prisma.productType.findUniqueOrThrow({
      where: { code: 'sticker' },
    });
    stickerTypeId = stickerType.id;

    const customStickerType = await prisma.productType.findUniqueOrThrow({
      where: { code: 'custom_sticker' },
    });
    customTypeId = customStickerType.id;
  });

  afterAll(async () => {
    await safeDeleteByIds(prisma.product, createdIds);
    await safeDeleteByIds(prisma.user, [authUserId]);
    await app.close();
  });

  it('rejects creating a product with the custom product type', () => {
    return request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('typeId', customTypeId)
      .field('name', 'Кастомна наклейка')
      .field('price', '50')
      .field('stockQuantity', '0')
      .attach('photo', validPngBuffer, 'photo.png')
      .expect(400);
  });

  it('creates a product with an uploaded photo', async () => {
    const response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('typeId', stickerTypeId)
      .field('name', 'E2E Наліпка')
      .field('price', '99.5')
      .field('stockQuantity', '3')
      .attach('photo', validPngBuffer, 'photo.png')
      .expect(201);
    const body = response.body as ProductResponseBody;

    expect(body).toMatchObject({
      typeId: stickerTypeId,
      name: 'E2E Наліпка',
      photoUrl: uploadedPhotoUrl,
      price: 99.5,
      stockQuantity: 3,
    });

    createdIds.push(body.id);
  });

  it('lists the created product, filterable by type', async () => {
    const response = await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ typeId: stickerTypeId })
      .expect(200);
    const body = response.body as ListProductsResponseBody;

    expect(body.items.some((item) => createdIds.includes(item.id))).toBe(true);
  });

  it('lists the created product, searchable by name case-insensitively', async () => {
    const response = await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ name: 'наліпка' })
      .expect(200);
    const body = response.body as ListProductsResponseBody;

    expect(body.items.some((item) => createdIds.includes(item.id))).toBe(true);
  });

  it('treats regex metacharacters in the name filter as literal text', async () => {
    const response = await request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ name: '.*' })
      .expect(200);
    const body = response.body as ListProductsResponseBody;

    expect(body.items.some((item) => createdIds.includes(item.id))).toBe(false);
  });

  it('sorts by stockQuantity ascending/descending when sortOrder is given', async () => {
    const baseProductId = createdIds[0];
    let lowStockId: string | undefined;
    try {
      const lowStockResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('typeId', stickerTypeId)
        .field('name', 'E2E Наліпка (сортування)')
        .field('price', '50')
        .field('stockQuantity', '1')
        .attach('photo', validPngBuffer, 'photo.png')
        .expect(201);
      lowStockId = (lowStockResponse.body as ProductResponseBody).id;
      const ownIds = [baseProductId, lowStockId];

      const ascResponse = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ name: 'E2E Наліпка', sortOrder: 'asc', pageSize: 100 })
        .expect(200);
      const ascBody = ascResponse.body as ListProductsResponseBody;
      const ascIds = ascBody.items
        .filter((item) => ownIds.includes(item.id))
        .map((item) => item.id);
      expect(ascIds[0]).toBe(lowStockId);

      const descResponse = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ name: 'E2E Наліпка', sortOrder: 'desc', pageSize: 100 })
        .expect(200);
      const descBody = descResponse.body as ListProductsResponseBody;
      const descIds = descBody.items
        .filter((item) => ownIds.includes(item.id))
        .map((item) => item.id);
      expect(descIds[descIds.length - 1]).toBe(lowStockId);
    } finally {
      await safeDeleteByIds(prisma.product, [lowStockId]);
    }
  });

  it('rejects an invalid sortOrder value', () => {
    return request(app.getHttpServer())
      .get('/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ sortOrder: 'sideways' })
      .expect(400);
  });

  it('gets product detail by id', async () => {
    const [id] = createdIds;

    const response = await request(app.getHttpServer())
      .get(`/products/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = response.body as ProductResponseBody;

    expect(body.id).toBe(id);
  });

  it('updates the product without changing the photo', async () => {
    const [id] = createdIds;

    const response = await request(app.getHttpServer())
      .patch(`/products/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .field('stockQuantity', '10')
      .expect(200);
    const body = response.body as ProductResponseBody;

    expect(body.stockQuantity).toBe(10);
    expect(body.photoUrl).toBe(uploadedPhotoUrl);
  });

  it('deletes the product', async () => {
    const [id] = createdIds;

    await request(app.getHttpServer())
      .delete(`/products/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/products/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    createdIds.splice(createdIds.indexOf(id), 1);
  });
});

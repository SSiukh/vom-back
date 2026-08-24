import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CloudinaryService } from '../src/cloudinary/cloudinary.service';
import { createAuthenticatedUser } from './support/auth-helper';

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
    if (createdIds.length > 0) {
      await prisma.product.deleteMany({ where: { id: { in: createdIds } } });
    }
    await prisma.user.deleteMany({ where: { id: authUserId } });
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

    createdIds.pop();
  });
});

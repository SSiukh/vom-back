import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    productType: { findUnique: jest.Mock };
  };
  let cloudinary: { uploadImage: jest.Mock; deleteImage: jest.Mock };

  const catalogType = { id: 'type-id', code: 'sticker', isCustom: false };
  const customType = {
    id: 'custom-type-id',
    code: 'custom_sticker',
    isCustom: true,
  };

  const storedProduct = {
    id: 'product-id',
    typeId: catalogType.id,
    name: 'Наліпка',
    photoUrl: 'https://cloudinary.example/photo.jpg',
    price: 100,
    promoPrice: null,
    stockQuantity: 5,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const photo = { buffer: Buffer.from('fake-image') } as Express.Multer.File;

  beforeEach(async () => {
    prisma = {
      product: {
        create: jest.fn().mockResolvedValue(storedProduct),
        findMany: jest.fn().mockResolvedValue([storedProduct]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue(storedProduct),
        update: jest.fn().mockResolvedValue(storedProduct),
        delete: jest.fn().mockResolvedValue(storedProduct),
      },
      productType: {
        findUnique: jest.fn().mockResolvedValue(catalogType),
      },
    };
    cloudinary = {
      uploadImage: jest.fn().mockResolvedValue({
        secureUrl: 'https://cloudinary.example/photo.jpg',
        publicId: 'products/photo',
      }),
      deleteImage: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudinaryService, useValue: cloudinary },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  describe('create', () => {
    it('uploads the photo to Cloudinary and stores the resulting URL', async () => {
      await service.create(
        {
          typeId: catalogType.id,
          name: 'Наліпка',
          price: 100,
          stockQuantity: 5,
        },
        photo,
      );

      expect(cloudinary.uploadImage).toHaveBeenCalledWith(
        photo.buffer,
        'products',
      );
      const [[{ data }]] = prisma.product.create.mock.calls as [
        [{ data: { photoUrl: string } }],
      ];
      expect(data.photoUrl).toBe('https://cloudinary.example/photo.jpg');
    });

    it('rejects the custom product type — it never gets a catalog row', async () => {
      prisma.productType.findUnique.mockResolvedValueOnce(customType);

      await expect(
        service.create(
          {
            typeId: customType.id,
            name: 'Кастомна',
            price: 100,
            stockQuantity: 0,
          },
          photo,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(cloudinary.uploadImage).not.toHaveBeenCalled();
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('rejects an unknown product type', async () => {
      prisma.productType.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create(
          { typeId: 'missing', name: 'X', price: 1, stockQuantity: 0 },
          photo,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('cleans up the Cloudinary upload if the DB write fails', async () => {
      const dbError = new Error('db unavailable');
      prisma.product.create.mockRejectedValueOnce(dbError);

      await expect(
        service.create(
          {
            typeId: catalogType.id,
            name: 'Наліпка',
            price: 100,
            stockQuantity: 5,
          },
          photo,
        ),
      ).rejects.toThrow(dbError);

      expect(cloudinary.deleteImage).toHaveBeenCalledWith('products/photo');
    });
  });

  describe('findAll', () => {
    it('filters by typeId when provided', async () => {
      await service.findAll(1, 10, catalogType.id);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { typeId: catalogType.id } }),
      );
    });

    it('queries everything when no typeId filter is given', async () => {
      await service.findAll(1, 10);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('filters by name case-insensitively when provided', async () => {
      await service.findAll(1, 10, undefined, 'наліпка');

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: { contains: 'наліпка', mode: 'insensitive' } },
        }),
      );
    });

    it('combines typeId and name filters when both are given', async () => {
      await service.findAll(1, 10, catalogType.id, 'наліпка');

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            typeId: catalogType.id,
            name: { contains: 'наліпка', mode: 'insensitive' },
          },
        }),
      );
    });

    it('escapes regex metacharacters in the name filter so they match literally', async () => {
      await service.findAll(1, 10, undefined, '.*(a|b)');

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: { contains: '\\.\\*\\(a\\|b\\)', mode: 'insensitive' },
          },
        }),
      );
    });

    it('sorts by createdAt desc by default', async () => {
      await service.findAll(1, 10);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('sorts by stockQuantity ascending when sortOrder=asc is given', async () => {
      await service.findAll(1, 10, undefined, undefined, 'asc');

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { stockQuantity: 'asc' } }),
      );
    });

    it('sorts by stockQuantity descending when sortOrder=desc is given', async () => {
      await service.findAll(1, 10, undefined, undefined, 'desc');

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { stockQuantity: 'desc' } }),
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException for a missing product', async () => {
      prisma.product.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('re-uploads a new photo only when one is provided', async () => {
      await service.update('product-id', { name: 'Нова назва' }, undefined);

      expect(cloudinary.uploadImage).not.toHaveBeenCalled();

      await service.update('product-id', {}, photo);

      expect(cloudinary.uploadImage).toHaveBeenCalledWith(
        photo.buffer,
        'products',
      );
    });

    it('re-validates the product type when it changes', async () => {
      prisma.productType.findUnique.mockResolvedValueOnce(customType);

      await expect(
        service.update('product-id', { typeId: customType.id }, undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when updating a missing product', async () => {
      prisma.product.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.update('missing-id', { name: 'X' }, undefined),
      ).rejects.toThrow(NotFoundException);
    });

    it('cleans up the new Cloudinary upload if the DB write fails', async () => {
      const dbError = new Error('db unavailable');
      prisma.product.update.mockRejectedValueOnce(dbError);

      await expect(service.update('product-id', {}, photo)).rejects.toThrow(
        dbError,
      );

      expect(cloudinary.deleteImage).toHaveBeenCalledWith('products/photo');
    });
  });

  describe('remove', () => {
    it('deletes the product', async () => {
      await service.remove('product-id');

      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: 'product-id' },
      });
    });

    it('throws NotFoundException when removing a missing product', async () => {
      prisma.product.findUnique.mockResolvedValueOnce(null);

      await expect(service.remove('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from './cloudinary.service';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

describe('CloudinaryService', () => {
  let service: CloudinaryService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test') },
        },
      ],
    }).compile();

    service = module.get(CloudinaryService);
  });

  it('configures the Cloudinary SDK on construction', () => {
    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: 'test',
      api_key: 'test',
      api_secret: 'test',
    });
  });

  it('resolves with the uploaded secure_url and public_id', async () => {
    const end = jest.fn();
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (
        _options: unknown,
        callback: (error: unknown, result: unknown) => void,
      ) => {
        callback(null, {
          secure_url: 'https://cloudinary.example/image.jpg',
          public_id: 'products/image',
        });
        return { end };
      },
    );

    const result = await service.uploadImage(Buffer.from('test'), 'products');

    expect(result).toEqual({
      secureUrl: 'https://cloudinary.example/image.jpg',
      publicId: 'products/image',
    });
    expect(end).toHaveBeenCalled();
  });

  it('rejects when Cloudinary returns an error', async () => {
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (
        _options: unknown,
        callback: (error: unknown, result: unknown) => void,
      ) => {
        callback(new Error('upload failed'), undefined);
        return { end: jest.fn() };
      },
    );

    await expect(
      service.uploadImage(Buffer.from('test'), 'products'),
    ).rejects.toThrow('upload failed');
  });

  it('deletes an uploaded image by public id', async () => {
    (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({
      result: 'ok',
    });

    await service.deleteImage('products/image');

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('products/image');
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { Types } from 'mongoose';
import { R2StorageService } from '../../common/r2/r2-storage.service';

jest.mock('crypto', () => ({ randomUUID: () => 'test-uuid' }));

const userId = new Types.ObjectId().toString();

const mockUser = {
  _id: new Types.ObjectId(userId),
  email: 'alice@example.com',
  displayName: 'Alice',
  passwordHash: 'hash',
  avatarUrl: null,
  preferences: { theme: 'dark' },
};

function execMock<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

const mockUserModel = {
  findById: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
};

const mockR2 = {
  upload: jest.fn(),
  delete: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: R2StorageService, useValue: mockR2 },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      mockUserModel.findById.mockReturnValue(execMock(mockUser));
      const result = await service.findById(userId);
      expect(result).toEqual(mockUser);
    });

    it('throws NotFoundException when not found', async () => {
      mockUserModel.findById.mockReturnValue(execMock(null));
      await expect(service.findById(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('returns user when email matches', async () => {
      mockUserModel.findOne.mockReturnValue(execMock(mockUser));
      const result = await service.findByEmail('alice@example.com');
      expect(result).toEqual(mockUser);
    });

    it('returns null when not found', async () => {
      mockUserModel.findOne.mockReturnValue(execMock(null));
      const result = await service.findByEmail('nobody@example.com');
      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    it('returns users matching query by email', async () => {
      mockUserModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockUser]),
      });

      const result = await service.search('alice');

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('alice@example.com');
    });

    it('returns empty array when no users match', async () => {
      mockUserModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.search('nobody');

      expect(result).toHaveLength(0);
    });

    it('returns empty array for empty query', async () => {
      const result = await service.search('');
      expect(result).toEqual([]);
    });

    it('limits results to 10', async () => {
      const limitFn = jest.fn().mockReturnThis();
      mockUserModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: limitFn,
        exec: jest.fn().mockResolvedValue([]),
      });

      await service.search('test');

      expect(limitFn).toHaveBeenCalledWith(10);
    });
  });

  describe('toPublic', () => {
    it('omits passwordHash from output', () => {
      const result = service.toPublic(mockUser as never);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('email', 'alice@example.com');
      expect(result).toHaveProperty('displayName', 'Alice');
    });

    it('includes preferences', () => {
      const result = service.toPublic(mockUser as never);
      expect(result).toHaveProperty('preferences', { theme: 'dark' });
    });
  });

  describe('updatePreferences', () => {
    it('merges preferences with dot-notation $set (does not overwrite subobject)', async () => {
      const updated = { ...mockUser, preferences: { theme: 'light' } };
      mockUserModel.findByIdAndUpdate.mockReturnValue(execMock(updated));

      const result = await service.updatePreferences(userId, { theme: 'light' });

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        { $set: { 'preferences.theme': 'light' } },
        { returnDocument: 'after' },
      );
      expect(result.preferences.theme).toBe('light');
    });

    it('ignores undefined fields when building $set', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue(execMock(mockUser));

      await service.updatePreferences(userId, { theme: undefined });

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        { $set: {} },
        { returnDocument: 'after' },
      );
    });

    it('throws NotFoundException when user not found', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue(execMock(null));
      await expect(
        service.updatePreferences(userId, { theme: 'light' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('returns updated user', async () => {
      const updated = { ...mockUser, displayName: 'Alice Updated' };
      mockUserModel.findByIdAndUpdate.mockReturnValue(execMock(updated));
      const result = await service.update(userId, {
        displayName: 'Alice Updated',
      });
      expect(result.displayName).toBe('Alice Updated');
    });

    it('throws NotFoundException when user not found', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue(execMock(null));
      await expect(
        service.update(userId, { displayName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadAvatar', () => {
    const mockFile = {
      originalname: 'photo.jpg',
      buffer: Buffer.from('img'),
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    it('uploads file to R2 and returns user with new avatarUrl', async () => {
      const newUrl = 'https://pub.r2.dev/avatars/test-uuid.jpg';
      mockUserModel.findById.mockReturnValue(
        execMock({ ...mockUser, avatarUrl: null }),
      );
      mockR2.upload.mockResolvedValue(newUrl);
      mockUserModel.findByIdAndUpdate.mockReturnValue(
        execMock({ ...mockUser, avatarUrl: newUrl }),
      );

      const result = await service.uploadAvatar(userId, mockFile);

      expect(mockR2.upload).toHaveBeenCalledWith(
        'avatars/test-uuid.jpg',
        mockFile.buffer,
        'image/jpeg',
      );
      expect(result.avatarUrl).toBe(newUrl);
    });

    it('deletes old avatar from R2 when one already exists', async () => {
      const oldUrl = 'https://pub.r2.dev/avatars/old-uuid.jpg';
      const newUrl = 'https://pub.r2.dev/avatars/test-uuid.jpg';
      mockUserModel.findById.mockReturnValue(
        execMock({ ...mockUser, avatarUrl: oldUrl }),
      );
      mockR2.upload.mockResolvedValue(newUrl);
      mockUserModel.findByIdAndUpdate.mockReturnValue(
        execMock({ ...mockUser, avatarUrl: newUrl }),
      );

      await service.uploadAvatar(userId, mockFile);

      expect(mockR2.delete).toHaveBeenCalledWith('avatars/old-uuid.jpg');
    });

    it('throws NotFoundException when user not found', async () => {
      mockUserModel.findById.mockReturnValue(execMock(null));
      await expect(service.uploadAvatar(userId, mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

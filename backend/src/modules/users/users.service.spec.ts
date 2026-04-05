import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { Types } from 'mongoose';

const userId = new Types.ObjectId().toString();

const mockUser = {
  _id: new Types.ObjectId(userId),
  email: 'alice@example.com',
  displayName: 'Alice',
  passwordHash: 'hash',
  avatarUrl: null,
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

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
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
  });
});

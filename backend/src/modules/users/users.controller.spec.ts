import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Types } from 'mongoose';

const userId = new Types.ObjectId().toString();

const mockUser = {
  _id: new Types.ObjectId(userId),
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: null,
};

const publicUser = {
  _id: userId,
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: null,
};

const mockUsersService = {
  update: jest.fn(),
  updatePreferences: jest.fn(),
  uploadAvatar: jest.fn(),
  toPublic: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUsersService.toPublic.mockReturnValue(publicUser);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('PATCH /users/me', () => {
    it('returns updated public user', async () => {
      mockUsersService.update.mockResolvedValue(mockUser);

      const result = await controller.updateMe(mockUser as never, {
        displayName: 'Alice Updated',
      });

      expect(result).toEqual(publicUser);
      expect(mockUsersService.toPublic).toHaveBeenCalledWith(mockUser);
    });

    it('passes only displayName to usersService.update', async () => {
      mockUsersService.update.mockResolvedValue(mockUser);

      await controller.updateMe(mockUser as never, {
        displayName: 'Alice Updated',
      });

      expect(mockUsersService.update).toHaveBeenCalledWith(
        mockUser._id.toString(),
        { displayName: 'Alice Updated' },
      );
    });
  });

  describe('PATCH /users/me/preferences', () => {
    it('delegates to usersService.updatePreferences with user id and dto', async () => {
      mockUsersService.updatePreferences.mockResolvedValue(mockUser);

      await controller.updatePreferences(mockUser as never, { theme: 'light' });

      expect(mockUsersService.updatePreferences).toHaveBeenCalledWith(
        mockUser._id.toString(),
        { theme: 'light' },
      );
    });

    it('returns the updated public user', async () => {
      mockUsersService.updatePreferences.mockResolvedValue(mockUser);

      const result = await controller.updatePreferences(mockUser as never, {
        theme: 'light',
      });

      expect(result).toEqual(publicUser);
      expect(mockUsersService.toPublic).toHaveBeenCalledWith(mockUser);
    });

    it('forwards task grouping/subtask preferences', async () => {
      mockUsersService.updatePreferences.mockResolvedValue(mockUser);

      await controller.updatePreferences(mockUser as never, {
        taskGroupBy: 'assignee',
        taskSubtaskMode: 'separated',
      });

      expect(mockUsersService.updatePreferences).toHaveBeenCalledWith(
        mockUser._id.toString(),
        { taskGroupBy: 'assignee', taskSubtaskMode: 'separated' },
      );
    });
  });

  describe('POST /users/me/avatar', () => {
    const mockFile = {
      originalname: 'photo.jpg',
      buffer: Buffer.from('img'),
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    it('throws BadRequestException when no file provided', async () => {
      await expect(
        controller.uploadAvatar(mockUser as never, undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns updated public user after upload', async () => {
      const updatedUser = {
        ...mockUser,
        avatarUrl: 'https://pub.r2.dev/avatars/uuid.jpg',
      };
      mockUsersService.uploadAvatar.mockResolvedValue(updatedUser);
      mockUsersService.toPublic.mockReturnValue({
        ...publicUser,
        avatarUrl: updatedUser.avatarUrl,
      });

      const result = await controller.uploadAvatar(mockUser as never, mockFile);

      expect(result.avatarUrl).toBe(updatedUser.avatarUrl);
    });

    it('delegates to usersService.uploadAvatar', async () => {
      mockUsersService.uploadAvatar.mockResolvedValue(mockUser);

      await controller.uploadAvatar(mockUser as never, mockFile);

      expect(mockUsersService.uploadAvatar).toHaveBeenCalledWith(
        mockUser._id.toString(),
        mockFile,
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { SpacesService } from './spaces.service';
import { Space } from './schemas/space.schema';
import { SpaceMember, SpaceRole } from './schemas/space-member.schema';
import { Types } from 'mongoose';

const userId = new Types.ObjectId().toString();
const spaceId = new Types.ObjectId().toString();
const memberId = new Types.ObjectId().toString();

const mockSpace = {
  _id: new Types.ObjectId(spaceId),
  name: 'My Space',
  color: '#4A90E2',
  description: null,
  createdBy: new Types.ObjectId(userId),
};

const mockMember = {
  _id: new Types.ObjectId(),
  spaceId: new Types.ObjectId(spaceId),
  userId: new Types.ObjectId(userId),
  role: SpaceRole.Editor,
};

const mockOwnerMember = {
  _id: new Types.ObjectId(),
  spaceId: new Types.ObjectId(spaceId),
  userId: new Types.ObjectId(userId),
  role: SpaceRole.Owner,
};

function execMock<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

const mockSpaceModel = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

const mockSpaceMemberModel = {
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  updateOne: jest.fn(),
  deleteMany: jest.fn(),
};

describe('SpacesService', () => {
  let service: SpacesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpacesService,
        { provide: getModelToken(Space.name), useValue: mockSpaceModel },
        {
          provide: getModelToken(SpaceMember.name),
          useValue: mockSpaceMemberModel,
        },
      ],
    }).compile();

    service = module.get<SpacesService>(SpacesService);
  });

  describe('create', () => {
    it('creates a space and adds creator as Owner', async () => {
      mockSpaceModel.create.mockResolvedValue(mockSpace);
      mockSpaceMemberModel.create.mockResolvedValue(mockOwnerMember);

      const result = await service.create({ name: 'My Space' }, userId);

      expect(result).toEqual(mockSpace);
      expect(mockSpaceMemberModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: SpaceRole.Owner }),
      );
    });
  });

  describe('findById', () => {
    it('returns space when found', async () => {
      mockSpaceModel.findById.mockReturnValue(execMock(mockSpace));
      const result = await service.findById(spaceId);
      expect(result).toEqual(mockSpace);
    });

    it('throws NotFoundException when not found', async () => {
      mockSpaceModel.findById.mockReturnValue(execMock(null));
      await expect(service.findById(spaceId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('returns updated space', async () => {
      const updated = { ...mockSpace, name: 'Updated' };
      mockSpaceModel.findByIdAndUpdate.mockReturnValue(execMock(updated));
      const result = await service.update(spaceId, { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundException when space not found', async () => {
      mockSpaceModel.findByIdAndUpdate.mockReturnValue(execMock(null));
      await expect(service.update(spaceId, { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes space and its members', async () => {
      mockSpaceModel.findByIdAndDelete.mockReturnValue(execMock(mockSpace));
      mockSpaceMemberModel.deleteMany.mockReturnValue(execMock({}));

      await service.remove(spaceId);

      expect(mockSpaceMemberModel.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: expect.anything() }),
      );
    });

    it('throws NotFoundException when space not found', async () => {
      mockSpaceModel.findByIdAndDelete.mockReturnValue(execMock(null));
      await expect(service.remove(spaceId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addMember', () => {
    it('throws BadRequestException when assigning owner role directly', async () => {
      await expect(
        service.addMember(spaceId, {
          userId: memberId,
          role: SpaceRole.Owner,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if user already a member', async () => {
      mockSpaceMemberModel.findOne.mockReturnValue(execMock(mockMember));
      await expect(
        service.addMember(spaceId, {
          userId: memberId,
          role: SpaceRole.Viewer,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates membership when user is not yet a member', async () => {
      mockSpaceMemberModel.findOne.mockReturnValue(execMock(null));
      mockSpaceMemberModel.create.mockResolvedValue({
        ...mockMember,
        role: SpaceRole.Viewer,
      });

      const result = await service.addMember(spaceId, {
        userId: memberId,
        role: SpaceRole.Viewer,
      });
      expect(result.role).toBe(SpaceRole.Viewer);
    });
  });

  describe('removeMember', () => {
    it('throws ForbiddenException when removing self', async () => {
      await expect(
        service.removeMember(spaceId, userId, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when member not found', async () => {
      mockSpaceMemberModel.findOne.mockReturnValue(execMock(null));
      await expect(
        service.removeMember(spaceId, memberId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when removing the owner', async () => {
      mockSpaceMemberModel.findOne.mockReturnValue(execMock(mockOwnerMember));
      await expect(
        service.removeMember(spaceId, memberId, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('removes member successfully', async () => {
      mockSpaceMemberModel.findOne.mockReturnValue(execMock(mockMember));
      mockSpaceMemberModel.findOneAndDelete.mockReturnValue(
        execMock(mockMember),
      );
      await expect(
        service.removeMember(spaceId, memberId, userId),
      ).resolves.not.toThrow();
    });
  });

  describe('findAllForUser', () => {
    it('returns spaces for user memberships', async () => {
      mockSpaceMemberModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ spaceId: mockSpace._id }]),
      });
      mockSpaceModel.find.mockReturnValue(execMock([mockSpace]));
      const result = await service.findAllForUser(userId);
      expect(result).toHaveLength(1);
    });
  });

  describe('getMembers', () => {
    it('returns populated member list', async () => {
      mockSpaceMemberModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockMember]),
      });
      const result = await service.getMembers(spaceId);
      expect(result).toHaveLength(1);
    });
  });

  describe('updateMemberRole', () => {
    it('updates role and returns updated member', async () => {
      const updated = { ...mockMember, role: SpaceRole.Viewer };
      mockSpaceMemberModel.findOne.mockReturnValue(execMock(mockMember));
      mockSpaceMemberModel.findOneAndUpdate.mockReturnValue(execMock(updated));
      const result = await service.updateMemberRole(spaceId, memberId, {
        role: SpaceRole.Viewer,
      });
      expect(result.role).toBe(SpaceRole.Viewer);
    });

    it('throws BadRequestException when assigning owner role directly', async () => {
      await expect(
        service.updateMemberRole(spaceId, memberId, {
          role: SpaceRole.Owner,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when member not found', async () => {
      mockSpaceMemberModel.findOne.mockReturnValue(execMock(null));
      await expect(
        service.updateMemberRole(spaceId, memberId, { role: SpaceRole.Viewer }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when changing the owner role', async () => {
      mockSpaceMemberModel.findOne.mockReturnValue(execMock(mockOwnerMember));
      await expect(
        service.updateMemberRole(spaceId, userId, { role: SpaceRole.Editor }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('transferOwnership', () => {
    it('throws BadRequestException when transferring to self', async () => {
      await expect(
        service.transferOwnership(spaceId, userId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when target is not a member', async () => {
      mockSpaceMemberModel.findOne.mockReturnValue(execMock(null));
      await expect(
        service.transferOwnership(spaceId, userId, memberId),
      ).rejects.toThrow(NotFoundException);
    });

    it('promotes the target to Owner and demotes the current owner', async () => {
      mockSpaceMemberModel.findOne.mockReturnValue(execMock(mockMember));
      mockSpaceMemberModel.updateOne.mockReturnValue(execMock({}));

      await service.transferOwnership(spaceId, userId, memberId);

      expect(mockSpaceMemberModel.updateOne).toHaveBeenCalledTimes(2);
      expect(mockSpaceMemberModel.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ userId: new Types.ObjectId(memberId) }),
        { role: SpaceRole.Owner },
      );
      expect(mockSpaceMemberModel.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ userId: new Types.ObjectId(userId) }),
        { role: SpaceRole.Editor },
      );
    });
  });

  describe('getUserRole', () => {
    it('returns null when user has no membership', async () => {
      mockSpaceMemberModel.findOne.mockReturnValue(execMock(null));
      const result = await service.getUserRole(spaceId, userId);
      expect(result).toBeNull();
    });

    it('returns role when member found', async () => {
      mockSpaceMemberModel.findOne.mockReturnValue(execMock(mockMember));
      const result = await service.getUserRole(spaceId, userId);
      expect(result).toBe(SpaceRole.Editor);
    });
  });
});

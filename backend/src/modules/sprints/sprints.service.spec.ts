import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { SprintsService } from './sprints.service';
import { Sprint, SprintStatus } from './schemas/sprint.schema';
import { Types } from 'mongoose';

const spaceId = new Types.ObjectId().toString();
const sprintId = new Types.ObjectId().toString();

function execMock<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

function chainMock<T>(value: T) {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
  return chain;
}

const mockSprintModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
};

describe('SprintsService', () => {
  let service: SprintsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintsService,
        { provide: getModelToken(Sprint.name), useValue: mockSprintModel },
      ],
    }).compile();

    service = module.get<SprintsService>(SprintsService);
  });

  describe('create', () => {
    it('auto-increments sprint number starting at 1 when no sprints exist', async () => {
      mockSprintModel.findOne.mockReturnValue(chainMock(null));
      mockSprintModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        spaceId: new Types.ObjectId(spaceId),
        number: 1,
        name: 'Sprint 1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-14'),
        status: SprintStatus.Planning,
      });

      const result = await service.create(spaceId, {
        name: 'Sprint 1',
        startDate: '2025-01-01',
        endDate: '2025-01-14',
      });

      expect(result.number).toBe(1);
    });

    it('auto-increments sprint number based on last sprint', async () => {
      mockSprintModel.findOne.mockReturnValue(chainMock({ number: 3 }));
      mockSprintModel.create.mockResolvedValue({
        _id: new Types.ObjectId(),
        number: 4,
        name: 'Sprint 4',
        startDate: new Date(),
        endDate: new Date(),
        status: SprintStatus.Planning,
      });

      const result = await service.create(spaceId, {
        name: 'Sprint 4',
        startDate: '2025-01-01',
        endDate: '2025-01-14',
      });

      expect(result.number).toBe(4);
    });
  });

  describe('findById', () => {
    it('returns sprint when found', async () => {
      const sprint = { _id: new Types.ObjectId(sprintId), number: 1, name: 'Sprint 1' };
      mockSprintModel.findOne.mockReturnValue(execMock(sprint));
      const result = await service.findById(spaceId, sprintId);
      expect(result.number).toBe(1);
    });

    it('throws NotFoundException when not found', async () => {
      mockSprintModel.findOne.mockReturnValue(execMock(null));
      await expect(service.findById(spaceId, sprintId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates sprint fields', async () => {
      const updated = { _id: new Types.ObjectId(sprintId), number: 1, name: 'Updated', status: SprintStatus.Active };
      mockSprintModel.findOneAndUpdate.mockReturnValue(execMock(updated));
      const result = await service.update(spaceId, sprintId, { status: SprintStatus.Active });
      expect(result.status).toBe(SprintStatus.Active);
    });

    it('throws NotFoundException when not found', async () => {
      mockSprintModel.findOneAndUpdate.mockReturnValue(execMock(null));
      await expect(service.update(spaceId, sprintId, { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });
});

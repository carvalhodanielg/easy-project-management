import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { SprintsService } from './sprints.service';
import { Sprint, SprintStatus } from './schemas/sprint.schema';
import { Task, TaskStatus } from '../tasks/schemas/task.schema';
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

const mockTaskModel = {
  find: jest.fn(),
};

describe('SprintsService', () => {
  let service: SprintsService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintsService,
        { provide: getModelToken(Sprint.name), useValue: mockSprintModel },
        { provide: getModelToken(Task.name), useValue: mockTaskModel },
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

  describe('getStats', () => {
    const startDate = new Date('2026-04-01');
    const endDate = new Date('2026-04-14');
    const userId1 = new Types.ObjectId();
    const userId2 = new Types.ObjectId();

    const mockSprint = {
      _id: new Types.ObjectId(sprintId),
      spaceId: new Types.ObjectId(spaceId),
      number: 2,
      name: 'Sprint 2',
      startDate,
      endDate,
      status: SprintStatus.Active,
    };

    const mockTasks = [
      {
        _id: new Types.ObjectId(),
        status: TaskStatus.Feito,
        storyPoints: 5,
        assignees: [userId1],
        updatedAt: new Date('2026-04-03'),
      },
      {
        _id: new Types.ObjectId(),
        status: TaskStatus.EmProgresso,
        storyPoints: 3,
        assignees: [userId1, userId2],
        updatedAt: new Date('2026-04-05'),
      },
      {
        _id: new Types.ObjectId(),
        status: TaskStatus.Pendente,
        storyPoints: null,
        assignees: [],
        updatedAt: new Date('2026-04-01'),
      },
    ];

    const prevSprint = { _id: new Types.ObjectId(), number: 1, status: SprintStatus.Completed };
    const prevTasks = [
      { status: TaskStatus.Feito, storyPoints: 8 },
      { status: TaskStatus.Feito, storyPoints: 5 },
      { status: TaskStatus.Pendente, storyPoints: 3 },
    ];

    function populateChain<T>(value: T) {
      return {
        populate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) }),
        exec: jest.fn().mockResolvedValue(value),
      };
    }

    it('throws NotFoundException when sprint not found', async () => {
      mockSprintModel.findOne.mockReturnValue(execMock(null));
      await expect(service.getStats(spaceId, sprintId)).rejects.toThrow(NotFoundException);
    });

    it('returns total tasks and points correctly', async () => {
      mockSprintModel.findOne
        .mockReturnValueOnce(execMock(mockSprint))
        .mockReturnValueOnce(chainMock(null));
      mockTaskModel.find
        .mockReturnValueOnce(populateChain(mockTasks))
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) });

      const stats = await service.getStats(spaceId, sprintId);

      expect(stats.totalTasks).toBe(3);
      expect(stats.doneTasks).toBe(1);
      expect(stats.totalPoints).toBe(8);
      expect(stats.donePoints).toBe(5);
    });

    it('returns tasks grouped by status', async () => {
      mockSprintModel.findOne
        .mockReturnValueOnce(execMock(mockSprint))
        .mockReturnValueOnce(chainMock(null));
      mockTaskModel.find
        .mockReturnValueOnce(populateChain(mockTasks))
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) });

      const stats = await service.getStats(spaceId, sprintId);

      expect(stats.tasksByStatus.feito.count).toBe(1);
      expect(stats.tasksByStatus.feito.points).toBe(5);
      expect(stats.tasksByStatus.em_progresso.count).toBe(1);
      expect(stats.tasksByStatus.pendente.count).toBe(1);
    });

    it('returns previous sprint velocity when previous sprint exists', async () => {
      mockSprintModel.findOne
        .mockReturnValueOnce(execMock(mockSprint))
        .mockReturnValueOnce(chainMock(prevSprint));
      mockTaskModel.find
        .mockReturnValueOnce(populateChain(mockTasks))
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(prevTasks) });

      const stats = await service.getStats(spaceId, sprintId);

      expect(stats.previousSprintPoints).toBe(13);
    });

    it('returns null previousSprintPoints when no previous sprint', async () => {
      mockSprintModel.findOne
        .mockReturnValueOnce(execMock(mockSprint))
        .mockReturnValueOnce(chainMock(null));
      mockTaskModel.find
        .mockReturnValueOnce(populateChain(mockTasks))
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) });

      const stats = await service.getStats(spaceId, sprintId);

      expect(stats.previousSprintPoints).toBeNull();
    });

    it('includes burndown data with ideal and remaining lines', async () => {
      mockSprintModel.findOne
        .mockReturnValueOnce(execMock(mockSprint))
        .mockReturnValueOnce(chainMock(null));
      mockTaskModel.find
        .mockReturnValueOnce(populateChain(mockTasks))
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) });

      const stats = await service.getStats(spaceId, sprintId);

      expect(stats.burndown.length).toBeGreaterThan(0);
      expect(stats.burndown[0]).toHaveProperty('date');
      expect(stats.burndown[0]).toHaveProperty('ideal');
      expect(stats.burndown[0]).toHaveProperty('remaining');
      // First day: nothing done yet, remaining = totalPoints
      expect(stats.burndown[0].ideal).toBe(8);
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

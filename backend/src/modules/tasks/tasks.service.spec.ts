import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { TasksService } from './tasks.service';
import { Task, TaskStatus, TaskPriority } from './schemas/task.schema';
import { Types } from 'mongoose';

const spaceId = new Types.ObjectId().toString();
const taskId = new Types.ObjectId().toString();
const userId = new Types.ObjectId().toString();
const targetId = new Types.ObjectId().toString();
const listId = new Types.ObjectId().toString();

function execMock<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

function populateMock<T>(value: T) {
  const chain = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
  return chain;
}

function countMock(value: number) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

const mockTask = {
  _id: new Types.ObjectId(taskId),
  spaceId: new Types.ObjectId(spaceId),
  listId: new Types.ObjectId(listId),
  sprintId: null,
  name: 'Test Task',
  status: TaskStatus.Pendente,
  priority: TaskPriority.Normal,
  assignees: [],
  tags: [],
  storyPoints: null,
  parentTask: null,
  blockedBy: [],
  blocks: [],
  position: 0,
};

const mockTaskModel = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  updateOne: jest.fn(),
  updateMany: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
};

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getModelToken(Task.name), useValue: mockTaskModel },
      ],
    }).compile();
    service = module.get<TasksService>(TasksService);
  });

  describe('create', () => {
    it('throws BadRequestException when neither listId nor sprintId provided', async () => {
      await expect(
        service.create(spaceId, userId, { name: 'Task without container' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for non-Fibonacci story points', async () => {
      await expect(
        service.create(spaceId, userId, { name: 'Task', listId, storyPoints: 4 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a task with listId', async () => {
      mockTaskModel.countDocuments.mockReturnValue(countMock(0));
      mockTaskModel.create.mockResolvedValue(mockTask);

      const result = await service.create(spaceId, userId, {
        name: 'New Task',
        listId,
        storyPoints: 5,
      });

      expect(result).toEqual(mockTask);
      expect(mockTaskModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Task', storyPoints: 5 }),
      );
    });
  });

  describe('findById', () => {
    it('returns populated task when found', async () => {
      mockTaskModel.findById.mockReturnValue(populateMock(mockTask));
      const result = await service.findById(taskId);
      expect(result).toEqual(mockTask);
    });

    it('throws NotFoundException when task not found', async () => {
      mockTaskModel.findById.mockReturnValue(populateMock(null));
      await expect(service.findById(taskId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('returns updated task', async () => {
      const updated = { ...mockTask, name: 'Updated' };
      mockTaskModel.findOneAndUpdate.mockReturnValue(populateMock(updated));
      const result = await service.update(spaceId, taskId, { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundException when task not found', async () => {
      mockTaskModel.findOneAndUpdate.mockReturnValue(populateMock(null));
      await expect(service.update(spaceId, taskId, { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes task and cleans dependency arrays', async () => {
      mockTaskModel.findOneAndDelete.mockReturnValue(execMock(mockTask));
      mockTaskModel.updateMany.mockResolvedValue({});

      await service.remove(spaceId, taskId);

      expect(mockTaskModel.updateMany).toHaveBeenCalledWith(
        { spaceId: expect.anything() },
        { $pull: { blockedBy: expect.anything(), blocks: expect.anything() } },
      );
    });

    it('throws NotFoundException when task not found', async () => {
      mockTaskModel.findOneAndDelete.mockReturnValue(execMock(null));
      await expect(service.remove(spaceId, taskId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addDependency', () => {
    it('updates both sides when type is "blocks"', async () => {
      mockTaskModel.findOne.mockReturnValue(execMock(mockTask));
      mockTaskModel.updateOne.mockResolvedValue({});

      await service.addDependency(spaceId, taskId, {
        targetTaskId: targetId,
        type: 'blocks',
      });

      expect(mockTaskModel.updateOne).toHaveBeenCalledTimes(2);
    });

    it('updates both sides when type is "blocked_by"', async () => {
      mockTaskModel.findOne.mockReturnValue(execMock(mockTask));
      mockTaskModel.updateOne.mockResolvedValue({});

      await service.addDependency(spaceId, taskId, {
        targetTaskId: targetId,
        type: 'blocked_by',
      });

      expect(mockTaskModel.updateOne).toHaveBeenCalledTimes(2);
    });

    it('throws NotFoundException when task not found', async () => {
      mockTaskModel.findOne.mockReturnValue(execMock(null));
      await expect(
        service.addDependency(spaceId, taskId, { targetTaskId: targetId, type: 'blocks' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeDependency', () => {
    it('removes dependency from both tasks', async () => {
      mockTaskModel.updateOne.mockResolvedValue({});
      await service.removeDependency(spaceId, taskId, targetId);
      expect(mockTaskModel.updateOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('create — field mapping', () => {
    it('maps assignees, tags, dates, and parentTask', async () => {
      mockTaskModel.countDocuments.mockReturnValue(countMock(0));
      mockTaskModel.create.mockResolvedValue(mockTask);

      await service.create(spaceId, userId, {
        name: 'Task',
        listId,
        assignees: [userId],
        tags: [targetId],
        startDate: '2025-01-01',
        dueDate: '2025-02-01',
        parentTask: targetId,
      });

      expect(mockTaskModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          dueDate: expect.any(Date),
        }),
      );
    });
  });

  describe('findBySpace', () => {
    it('filters by listId', async () => {
      mockTaskModel.find.mockReturnValue(populateMock([mockTask]));
      const result = await service.findBySpace(spaceId, { listId });
      expect(result).toHaveLength(1);
    });

    it('filters by sprintId', async () => {
      const sprintId = new Types.ObjectId().toString();
      mockTaskModel.find.mockReturnValue(populateMock([mockTask]));
      const result = await service.findBySpace(spaceId, { sprintId });
      expect(result).toHaveLength(1);
    });

    it('filters parentTask = null when specified', async () => {
      mockTaskModel.find.mockReturnValue(populateMock([]));
      await service.findBySpace(spaceId, { parentTask: null });
      expect(mockTaskModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ parentTask: null }),
      );
    });
  });

  describe('findSubtasks', () => {
    it('returns tasks by parentTask id', async () => {
      mockTaskModel.find.mockReturnValue(populateMock([mockTask]));
      const result = await service.findSubtasks(taskId);
      expect(result).toHaveLength(1);
    });
  });

  describe('update — field mapping', () => {
    it('maps assignees and tags arrays', async () => {
      const updated = { ...mockTask, assignees: [userId] };
      mockTaskModel.findOneAndUpdate.mockReturnValue(populateMock(updated));
      await service.update(spaceId, taskId, { assignees: [userId], tags: [targetId] });
      expect(mockTaskModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ assignees: expect.any(Array), tags: expect.any(Array) }),
        expect.anything(),
      );
    });

    it('maps null dates', async () => {
      mockTaskModel.findOneAndUpdate.mockReturnValue(populateMock(mockTask));
      await service.update(spaceId, taskId, { startDate: null, dueDate: null });
      expect(mockTaskModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ startDate: null, dueDate: null }),
        expect.anything(),
      );
    });
  });

  describe('move', () => {
    it('moves task to new sprint', async () => {
      const sprintId = new Types.ObjectId().toString();
      const moved = { ...mockTask, sprintId: new Types.ObjectId(sprintId) };
      mockTaskModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(moved) });
      const result = await service.move(spaceId, taskId, { sprintId });
      expect(result.sprintId?.toString()).toBe(moved.sprintId.toString());
    });

    it('throws NotFoundException when task not found during move', async () => {
      mockTaskModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.move(spaceId, taskId, { listId })).rejects.toThrow(NotFoundException);
    });
  });
});

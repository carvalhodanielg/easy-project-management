import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { TasksService } from './tasks.service';
import { Task, TaskStatus, TaskPriority } from './schemas/task.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { TaskEventsService } from '../task-events/task-events.service';
import { Types } from 'mongoose';

const mockNotificationsService = { create: jest.fn() };
const mockTaskEventsService = { create: jest.fn().mockResolvedValue({}) };

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
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: TaskEventsService, useValue: mockTaskEventsService },
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
      mockTaskModel.findById.mockReturnValue(execMock(mockTask));
      mockTaskModel.findOneAndUpdate.mockReturnValue(populateMock(updated));
      const result = await service.update(spaceId, taskId, { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundException when task not found', async () => {
      mockTaskModel.findById.mockReturnValue(execMock(mockTask));
      mockTaskModel.findOneAndUpdate.mockReturnValue(populateMock(null));
      await expect(service.update(spaceId, taskId, { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('logs status_changed event when status changes', async () => {
      const updatedTask = { ...mockTask, status: TaskStatus.EmProgresso };
      mockTaskModel.findById.mockReturnValue(execMock(mockTask));
      mockTaskModel.findOneAndUpdate.mockReturnValue(populateMock(updatedTask));
      mockTaskEventsService.create.mockResolvedValue({});

      await service.update(spaceId, taskId, { status: TaskStatus.EmProgresso }, userId);

      expect(mockTaskEventsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'status_changed',
          changes: expect.objectContaining({ field: 'status', newValue: TaskStatus.EmProgresso }),
        }),
      );
    });

    it('does not log event when status is unchanged', async () => {
      mockTaskModel.findById.mockReturnValue(execMock(mockTask));
      mockTaskModel.findOneAndUpdate.mockReturnValue(populateMock(mockTask));

      await service.update(spaceId, taskId, { status: TaskStatus.Pendente }, userId);

      expect(mockTaskEventsService.create).not.toHaveBeenCalled();
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
      mockTaskModel.aggregate.mockResolvedValue([]);
      const result = await service.findBySpace(spaceId, { listId });
      expect(result).toHaveLength(1);
    });

    it('filters by sprintId', async () => {
      const sprintId = new Types.ObjectId().toString();
      mockTaskModel.find.mockReturnValue(populateMock([mockTask]));
      mockTaskModel.aggregate.mockResolvedValue([]);
      const result = await service.findBySpace(spaceId, { sprintId });
      expect(result).toHaveLength(1);
    });

    it('filters parentTask = null when specified', async () => {
      mockTaskModel.find.mockReturnValue(populateMock([]));
      mockTaskModel.aggregate.mockResolvedValue([]);
      await service.findBySpace(spaceId, { parentTask: null });
      expect(mockTaskModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ parentTask: null }),
      );
    });

    it('sets subtaskCount=0 when task has no subtasks', async () => {
      mockTaskModel.find.mockReturnValue(populateMock([mockTask]));
      mockTaskModel.aggregate.mockResolvedValue([]);
      const result = await service.findBySpace(spaceId, { listId });
      expect(result[0].subtaskCount).toBe(0);
    });

    it('sets subtaskCount from aggregation result', async () => {
      mockTaskModel.find.mockReturnValue(populateMock([mockTask]));
      mockTaskModel.aggregate.mockResolvedValue([
        { _id: mockTask._id, count: 3 },
      ]);
      const result = await service.findBySpace(spaceId, { listId });
      expect(result[0].subtaskCount).toBe(3);
    });
  });

  describe('findSubtasks', () => {
    it('returns tasks by parentTask id', async () => {
      mockTaskModel.find.mockReturnValue(populateMock([mockTask]));
      const result = await service.findSubtasks(taskId);
      expect(result).toHaveLength(1);
    });
  });

  describe('create — subtask parent inheritance', () => {
    const parentId = new Types.ObjectId().toString();
    const parentTask = {
      ...mockTask,
      _id: new Types.ObjectId(parentId),
      listId: new Types.ObjectId(listId),
      sprintId: null,
    };

    it('inherits parent listId when creating subtask without listId or sprintId', async () => {
      mockTaskModel.findById.mockReturnValue(execMock(parentTask));
      mockTaskModel.countDocuments.mockReturnValue(countMock(0));
      mockTaskModel.create.mockResolvedValue({ ...mockTask, parentTask: new Types.ObjectId(parentId) });

      await service.create(spaceId, userId, { name: 'Subtask', parentTask: parentId });

      expect(mockTaskModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          listId: parentTask.listId,
          sprintId: null,
          parentTask: new Types.ObjectId(parentId),
        }),
      );
    });

    it('throws NotFoundException when parentTask does not exist', async () => {
      mockTaskModel.findById.mockReturnValue(execMock(null));

      await expect(
        service.create(spaceId, userId, { name: 'Subtask', parentTask: parentId }),
      ).rejects.toThrow(NotFoundException);
    });

    it('still throws BadRequestException when no parentTask and no listId/sprintId', async () => {
      await expect(
        service.create(spaceId, userId, { name: 'Task without container' }),
      ).rejects.toThrow(BadRequestException);
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

  describe('bulkDelete', () => {
    it('deletes all given tasks and their subtasks', async () => {
      const subtask = { ...mockTask, _id: new Types.ObjectId(), parentTask: new Types.ObjectId(taskId) };
      mockTaskModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([subtask]) });
      mockTaskModel.deleteMany = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
      mockTaskModel.updateMany.mockResolvedValue({});

      await service.bulkDelete(spaceId, [taskId]);

      expect(mockTaskModel.deleteMany).toHaveBeenCalled();
    });

    it('cleans up dependency arrays after bulk delete', async () => {
      mockTaskModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
      mockTaskModel.deleteMany = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
      mockTaskModel.updateMany.mockResolvedValue({});

      await service.bulkDelete(spaceId, [taskId]);

      expect(mockTaskModel.updateMany).toHaveBeenCalledWith(
        { spaceId: expect.anything() },
        { $pull: { blockedBy: { $in: expect.any(Array) }, blocks: { $in: expect.any(Array) } } },
      );
    });
  });

  describe('bulkMove', () => {
    it('moves all tasks and their subtasks to new destination', async () => {
      const newSprintId = new Types.ObjectId().toString();
      const subtask = { ...mockTask, _id: new Types.ObjectId(), parentTask: new Types.ObjectId(taskId) };
      mockTaskModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([subtask]) });
      mockTaskModel.updateMany = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      await service.bulkMove(spaceId, [taskId], { sprintId: newSprintId });

      expect(mockTaskModel.updateMany).toHaveBeenCalled();
    });
  });

  describe('bulkDuplicate', () => {
    it('duplicates tasks and their subtasks to new destination', async () => {
      const subtask = {
        ...mockTask,
        _id: new Types.ObjectId(),
        parentTask: new Types.ObjectId(taskId),
        name: 'Subtask',
      };
      mockTaskModel.find
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([mockTask]) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([subtask]) });
      mockTaskModel.create.mockResolvedValue({ ...mockTask, _id: new Types.ObjectId() });

      await service.bulkDuplicate(spaceId, [taskId], userId, { listId });

      expect(mockTaskModel.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('convertToSubtask', () => {
    it('sets parentTask and inherits destination from parent', async () => {
      const parentId = new Types.ObjectId().toString();
      const parent = { ...mockTask, _id: new Types.ObjectId(parentId), listId: new Types.ObjectId(listId), sprintId: null };
      mockTaskModel.findOne.mockReturnValue(execMock(parent));
      mockTaskModel.updateMany = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      await service.convertToSubtask(spaceId, [taskId], parentId);

      expect(mockTaskModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ _id: { $in: expect.any(Array) } }),
        expect.objectContaining({ parentTask: expect.anything() }),
      );
    });

    it('throws NotFoundException when parent does not exist', async () => {
      mockTaskModel.findOne.mockReturnValue(execMock(null));
      await expect(service.convertToSubtask(spaceId, [taskId], targetId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('promoteToMainTask', () => {
    it('removes parentTask and sets new destination', async () => {
      mockTaskModel.updateMany = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      await service.promoteToMainTask(spaceId, [taskId], { listId });

      expect(mockTaskModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ _id: { $in: expect.any(Array) } }),
        expect.objectContaining({ $unset: { parentTask: 1 } }),
      );
    });
  });

  describe('moveSubtask', () => {
    it('sets new parentTask and inherits destination', async () => {
      const newParentId = new Types.ObjectId().toString();
      const newParent = { ...mockTask, _id: new Types.ObjectId(newParentId), listId: new Types.ObjectId(listId), sprintId: null };
      mockTaskModel.findOne.mockReturnValue(execMock(newParent));
      mockTaskModel.updateMany = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      await service.moveSubtask(spaceId, [taskId], newParentId);

      expect(mockTaskModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ _id: { $in: expect.any(Array) } }),
        expect.objectContaining({ parentTask: expect.anything() }),
      );
    });

    it('throws NotFoundException when new parent does not exist', async () => {
      mockTaskModel.findOne.mockReturnValue(execMock(null));
      await expect(service.moveSubtask(spaceId, [taskId], targetId)).rejects.toThrow(NotFoundException);
    });
  });
});

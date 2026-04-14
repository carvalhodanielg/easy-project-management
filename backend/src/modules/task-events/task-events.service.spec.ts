import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TaskEventsService } from './task-events.service';
import { TaskEvent, TaskEventType } from './schemas/task-event.schema';
import { Types } from 'mongoose';

const taskId = new Types.ObjectId().toString();
const spaceId = new Types.ObjectId().toString();
const userId = new Types.ObjectId().toString();

const mockEvent = {
  _id: new Types.ObjectId(),
  taskId: new Types.ObjectId(taskId),
  spaceId: new Types.ObjectId(spaceId),
  userId: new Types.ObjectId(userId),
  type: TaskEventType.Created,
  changes: null,
  createdAt: new Date(),
};

function populateMock<T>(value: T) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

const mockEventModel = {
  create: jest.fn(),
  find: jest.fn(),
};

describe('TaskEventsService', () => {
  let service: TaskEventsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskEventsService,
        { provide: getModelToken(TaskEvent.name), useValue: mockEventModel },
      ],
    }).compile();
    service = module.get<TaskEventsService>(TaskEventsService);
  });

  describe('create', () => {
    it('creates and returns a task event', async () => {
      mockEventModel.create.mockResolvedValue(mockEvent);

      const result = await service.create({
        taskId,
        spaceId,
        userId,
        type: TaskEventType.Created,
      });

      expect(mockEventModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: new Types.ObjectId(taskId),
          spaceId: new Types.ObjectId(spaceId),
          userId: new Types.ObjectId(userId),
          type: TaskEventType.Created,
          changes: null,
        }),
      );
      expect(result.type).toBe(TaskEventType.Created);
    });

    it('stores changes when provided', async () => {
      const changes = { field: 'status', oldValue: 'pendente', newValue: 'em_progresso' };
      mockEventModel.create.mockResolvedValue({ ...mockEvent, type: TaskEventType.StatusChanged, changes });

      const result = await service.create({
        taskId,
        spaceId,
        userId,
        type: TaskEventType.StatusChanged,
        changes,
      });

      expect(mockEventModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ changes }),
      );
      expect(result.changes).toEqual(changes);
    });
  });

  describe('findByTask', () => {
    it('returns events for a task sorted newest-first with user populated', async () => {
      const events = [mockEvent];
      mockEventModel.find.mockReturnValue(populateMock(events));

      const result = await service.findByTask(taskId);

      expect(mockEventModel.find).toHaveBeenCalledWith({ taskId: new Types.ObjectId(taskId) });
      expect(result).toEqual(events);
    });

    it('limits results to 50 by default', async () => {
      mockEventModel.find.mockReturnValue(populateMock([]));

      await service.findByTask(taskId);

      const chain = mockEventModel.find.mock.results[0].value;
      expect(chain.limit).toHaveBeenCalledWith(50);
    });

    it('accepts a custom limit', async () => {
      mockEventModel.find.mockReturnValue(populateMock([]));

      await service.findByTask(taskId, 10);

      const chain = mockEventModel.find.mock.results[0].value;
      expect(chain.limit).toHaveBeenCalledWith(10);
    });
  });
});

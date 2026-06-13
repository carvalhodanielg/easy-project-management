import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TasksFilterService, GroupedResult } from './tasks-filter.service';
import { Task, TaskStatus, TaskPriority } from './schemas/task.schema';
import { Types } from 'mongoose';

const spaceId = new Types.ObjectId().toString();
const userId = new Types.ObjectId().toString();
const listId = new Types.ObjectId().toString();
const sprintId = new Types.ObjectId().toString();

const mockTasks = [
  {
    _id: new Types.ObjectId(),
    name: 'Task 1',
    status: TaskStatus.Feito,
    storyPoints: 5,
    assignees: [new Types.ObjectId(userId)],
  },
  {
    _id: new Types.ObjectId(),
    name: 'Task 2',
    status: TaskStatus.Pendente,
    storyPoints: 3,
    assignees: [],
  },
];

function makeChain(result: unknown) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  };
}

const mockTaskModel = {
  find: jest.fn(),
  aggregate: jest.fn(),
};

describe('TasksFilterService', () => {
  let service: TasksFilterService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksFilterService,
        { provide: getModelToken(Task.name), useValue: mockTaskModel },
      ],
    }).compile();
    service = module.get<TasksFilterService>(TasksFilterService);
  });

  describe('findFiltered — no groupBy', () => {
    beforeEach(() => {
      mockTaskModel.aggregate.mockResolvedValue([]);
    });

    it('returns flat list with no filters', async () => {
      mockTaskModel.find.mockReturnValue(makeChain(mockTasks));
      const result = await service.findFiltered(spaceId, {}, userId);
      expect(result).toEqual(mockTasks);
      expect(mockTaskModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: expect.anything(),
          parentTask: null,
        }),
      );
    });

    it('filters by listId', async () => {
      mockTaskModel.find.mockReturnValue(makeChain(mockTasks));
      await service.findFiltered(spaceId, { listId }, userId);
      expect(mockTaskModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ listId: expect.anything() }),
      );
    });

    it('filters by sprintId', async () => {
      mockTaskModel.find.mockReturnValue(makeChain([]));
      await service.findFiltered(spaceId, { sprintId }, userId);
      expect(mockTaskModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ sprintId: expect.anything() }),
      );
    });

    it('resolves "me" assignee to currentUserId', async () => {
      mockTaskModel.find.mockReturnValue(makeChain([]));
      await service.findFiltered(spaceId, { assignees: ['me'] }, userId);
      const callArg = mockTaskModel.find.mock.calls[0][0] as {
        assignees: { $in: Types.ObjectId[] };
      };
      const assigneeId = callArg.assignees.$in[0].toString();
      expect(assigneeId).toBe(userId);
    });

    it('filters by status array', async () => {
      mockTaskModel.find.mockReturnValue(makeChain([]));
      await service.findFiltered(
        spaceId,
        { status: [TaskStatus.Pendente, TaskStatus.EmProgresso] },
        userId,
      );
      const callArg = mockTaskModel.find.mock.calls[0][0] as {
        status: { $in: TaskStatus[] };
      };
      expect(callArg.status.$in).toContain(TaskStatus.Pendente);
    });

    it('filters by priority', async () => {
      mockTaskModel.find.mockReturnValue(makeChain([]));
      await service.findFiltered(
        spaceId,
        { priority: [TaskPriority.Urgente] },
        userId,
      );
      const callArg = mockTaskModel.find.mock.calls[0][0] as {
        priority: { $in: TaskPriority[] };
      };
      expect(callArg.priority.$in).toContain(TaskPriority.Urgente);
    });

    it('includes subtasks when includeSubtasks is true', async () => {
      mockTaskModel.find.mockReturnValue(makeChain([]));
      await service.findFiltered(spaceId, { includeSubtasks: true }, userId);
      const callArg = mockTaskModel.find.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(callArg).not.toHaveProperty('parentTask');
    });

    it('filters by text search (q) using a $text index query', async () => {
      mockTaskModel.find.mockReturnValue(makeChain([]));
      await service.findFiltered(spaceId, { q: 'bug' }, userId);
      const callArg = mockTaskModel.find.mock.calls[0][0] as {
        $text: { $search: string };
      };
      expect(callArg.$text.$search).toBe('bug');
    });

    it('trims the search term and ignores blank queries', async () => {
      mockTaskModel.find.mockReturnValue(makeChain([]));
      await service.findFiltered(spaceId, { q: '   ' }, userId);
      const callArg = mockTaskModel.find.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(callArg).not.toHaveProperty('$text');
    });

    it('uses a case-insensitive substring $regex when searching within a sprint', async () => {
      mockTaskModel.find.mockReturnValue(makeChain([]));
      await service.findFiltered(spaceId, { sprintId, q: 'am' }, userId);
      const callArg = mockTaskModel.find.mock.calls[0][0] as {
        name: { $regex: string; $options: string };
        $text?: unknown;
      };
      expect(callArg.name.$regex).toBe('am');
      expect(callArg.name.$options).toBe('i');
      expect(callArg).not.toHaveProperty('$text');
    });

    it('uses a substring $regex when searching within a list', async () => {
      mockTaskModel.find.mockReturnValue(makeChain([]));
      await service.findFiltered(spaceId, { listId, q: 'am' }, userId);
      const callArg = mockTaskModel.find.mock.calls[0][0] as {
        name: { $regex: string; $options: string };
        $text?: unknown;
      };
      expect(callArg.name.$regex).toBe('am');
      expect(callArg).not.toHaveProperty('$text');
    });

    it('escapes regex metacharacters in the contextual search term', async () => {
      mockTaskModel.find.mockReturnValue(makeChain([]));
      await service.findFiltered(spaceId, { sprintId, q: 'a.b+' }, userId);
      const callArg = mockTaskModel.find.mock.calls[0][0] as {
        name: { $regex: string };
      };
      expect(callArg.name.$regex).toBe('a\\.b\\+');
    });

    it('includes subtasks during a contextual search regardless of subtask mode', async () => {
      mockTaskModel.find.mockReturnValue(makeChain([]));
      await service.findFiltered(spaceId, { sprintId, q: 'am' }, userId);
      const callArg = mockTaskModel.find.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(callArg).not.toHaveProperty('parentTask');
    });
  });

  describe('findFiltered — with groupBy', () => {
    it('uses aggregate then re-fetches with populate for groupBy=status', async () => {
      const task = mockTasks[1];
      mockTaskModel.aggregate.mockResolvedValueOnce([
        {
          _id: TaskStatus.Pendente,
          taskIds: [task._id],
          totalStoryPoints: 3,
          count: 1,
        },
      ]);
      mockTaskModel.find.mockReturnValue(makeChain([task]));

      const result = (await service.findFiltered(
        spaceId,
        { groupBy: 'status' },
        userId,
      )) as GroupedResult[];

      expect(mockTaskModel.aggregate).toHaveBeenCalled();
      expect(mockTaskModel.find).toHaveBeenCalled();
      expect(result[0].groupKey).toBe(TaskStatus.Pendente);
      expect(result[0].totalStoryPoints).toBe(3);
      expect(result[0].count).toBe(1);
      expect(result[0].tasks).toHaveLength(1);
    });

    it('groupBy=assignee does NOT filter to feito status', async () => {
      const task = mockTasks[0];
      mockTaskModel.aggregate.mockResolvedValueOnce([
        {
          _id: new Types.ObjectId(userId),
          _groupName: 'Dev User',
          taskIds: [task._id],
          totalStoryPoints: 5,
          count: 1,
        },
      ]);
      mockTaskModel.find.mockReturnValue(makeChain([task]));

      const result = (await service.findFiltered(
        spaceId,
        { groupBy: 'assignee' },
        userId,
      )) as GroupedResult[];

      // The match stage must NOT restrict status to feito
      const pipeline = mockTaskModel.aggregate.mock.calls[0][0] as {
        $match?: Record<string, unknown>;
      }[];
      const matchStage = pipeline.find((s) => s.$match);
      expect(matchStage?.$match).not.toHaveProperty('status');

      // groupKey is the assignee's display name
      expect(result[0].groupKey).toBe('Dev User');
      expect(result[0].tasks).toHaveLength(1);
    });

    it('groupBy=assignee groups tasks from all statuses', async () => {
      // Both tasks (feito + pendente) appear under the same assignee
      mockTaskModel.aggregate.mockResolvedValueOnce([
        {
          _id: new Types.ObjectId(userId),
          _groupName: 'Dev User',
          taskIds: mockTasks.map((t) => t._id),
          totalStoryPoints: 8,
          count: 2,
        },
      ]);
      mockTaskModel.find.mockReturnValue(makeChain(mockTasks));

      const result = (await service.findFiltered(
        spaceId,
        { groupBy: 'assignee' },
        userId,
      )) as GroupedResult[];

      expect(result[0].count).toBe(2);
      expect(result[0].tasks).toHaveLength(2);
    });

    it('groupBy=priority aggregates by priority field', async () => {
      mockTaskModel.aggregate.mockResolvedValueOnce([]);

      await service.findFiltered(spaceId, { groupBy: 'priority' }, userId);

      const pipeline = mockTaskModel.aggregate.mock.calls[0][0] as {
        $group?: { _id: string };
      }[];
      const groupStage = pipeline.find((s) => s.$group);
      expect(groupStage?.$group?._id).toBe('$priority');
    });
  });

  describe('getSprintPointSums', () => {
    it('aggregates point sums grouped by sprint', async () => {
      const sprintObjId = new Types.ObjectId(sprintId);
      mockTaskModel.aggregate.mockResolvedValue([
        { _id: sprintObjId, total: 13 },
      ]);
      const result = await service.getSprintPointSums(spaceId, [sprintId]);
      expect(result[0].total).toBe(13);
      expect(result[0].sprintId).toBe(sprintId);
    });
  });
});

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Task,
  TaskDocument,
  TaskStatus,
  FIBONACCI_POINTS,
} from './schemas/task.schema';
import {
  CreateTaskDto,
  UpdateTaskDto,
  MoveTaskDto,
  AddDependencyDto,
  BulkMoveDto,
  PromoteToMainTaskDto,
  BulkPatchDto,
} from './dto/create-task.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';
import { TaskEventsService } from '../task-events/task-events.service';
import { TaskEventType } from '../task-events/schemas/task-event.schema';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    private readonly notificationsService: NotificationsService,
    private readonly taskEventsService: TaskEventsService,
  ) {}

  async create(
    spaceId: string,
    userId: string,
    dto: CreateTaskDto,
  ): Promise<TaskDocument> {
    let resolvedListId = dto.listId;
    let resolvedSprintId = dto.sprintId;

    if (dto.parentTask && !resolvedListId && !resolvedSprintId) {
      const parent = await this.taskModel.findById(dto.parentTask).exec();
      if (!parent) throw new NotFoundException('Parent task not found');
      resolvedListId = parent.listId?.toString();
      resolvedSprintId = parent.sprintId?.toString();
    } else if (!dto.parentTask && !resolvedListId && !resolvedSprintId) {
      throw new BadRequestException('Task must belong to a list or sprint');
    }

    if (
      dto.storyPoints &&
      !FIBONACCI_POINTS.includes(
        dto.storyPoints as (typeof FIBONACCI_POINTS)[number],
      )
    ) {
      throw new BadRequestException('Story points must be a Fibonacci number');
    }

    const parentTaskOid = dto.parentTask
      ? new Types.ObjectId(dto.parentTask)
      : null;

    const count = await this.taskModel
      .countDocuments({
        spaceId: new Types.ObjectId(spaceId),
        listId: resolvedListId ? new Types.ObjectId(resolvedListId) : null,
        sprintId: resolvedSprintId
          ? new Types.ObjectId(resolvedSprintId)
          : null,
        parentTask: parentTaskOid,
      })
      .exec();

    const task = await this.taskModel.create({
      spaceId: new Types.ObjectId(spaceId),
      listId: resolvedListId ? new Types.ObjectId(resolvedListId) : null,
      sprintId: resolvedSprintId ? new Types.ObjectId(resolvedSprintId) : null,
      name: dto.name,
      description: dto.description ?? '',
      status: dto.status,
      priority: dto.priority,
      assignees: (dto.assignees ?? []).map((id) => new Types.ObjectId(id)),
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      tags: (dto.tags ?? []).map((id) => new Types.ObjectId(id)),
      storyPoints: dto.storyPoints ?? null,
      parentTask: parentTaskOid,
      position: dto.position ?? count,
      createdBy: new Types.ObjectId(userId),
    });

    await this.taskEventsService.create({
      taskId: task._id.toString(),
      spaceId,
      userId,
      type: TaskEventType.Created,
    });

    return task;
  }

  async findById(spaceId: string, taskId: string): Promise<TaskDocument> {
    const task = await this.taskModel
      .findOne({
        _id: new Types.ObjectId(taskId),
        spaceId: new Types.ObjectId(spaceId),
      })
      .populate('assignees', 'email displayName avatarUrl')
      .populate('tags')
      .populate('blockedBy', 'name status')
      .populate('blocks', 'name status')
      .exec();

    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async findBySpace(
    spaceId: string,
    query: {
      listId?: string;
      sprintId?: string;
      parentTask?: null;
    },
  ): Promise<TaskDocument[]> {
    const filter: Record<string, unknown> = {
      spaceId: new Types.ObjectId(spaceId),
      archivedAt: null,
    };
    if (query.listId) filter.listId = new Types.ObjectId(query.listId);
    if (query.sprintId) filter.sprintId = new Types.ObjectId(query.sprintId);
    if ('parentTask' in query) filter.parentTask = null;

    const tasks = await this.taskModel
      .find(filter)
      .populate('assignees', 'email displayName avatarUrl')
      .populate('tags')
      .sort({ position: 1, createdAt: 1 })
      .exec();

    await this.attachSubtaskCounts(tasks);
    return tasks;
  }

  private async attachSubtaskCounts(tasks: TaskDocument[]): Promise<void> {
    if (tasks.length === 0) return;
    const ids = tasks.map((t) => t._id);
    const counts = await this.taskModel.aggregate<{
      _id: Types.ObjectId;
      count: number;
    }>([
      { $match: { parentTask: { $in: ids }, archivedAt: null } },
      { $group: { _id: '$parentTask', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
    for (const task of tasks) {
      task.subtaskCount = countMap.get(task._id.toString()) ?? 0;
    }
  }

  async findSubtasks(
    spaceId: string,
    parentTaskId: string,
  ): Promise<TaskDocument[]> {
    return this.taskModel
      .find({
        parentTask: new Types.ObjectId(parentTaskId),
        spaceId: new Types.ObjectId(spaceId),
        archivedAt: null,
      })
      .populate('assignees', 'email displayName avatarUrl')
      .populate('tags')
      .sort({ position: 1, createdAt: 1 })
      .exec();
  }

  async update(
    spaceId: string,
    taskId: string,
    dto: UpdateTaskDto,
    actorId?: string,
  ): Promise<TaskDocument> {
    const updates: Record<string, unknown> = { ...dto };

    // Scope the lookup to the space so business logic (e.g. the blockedBy check
    // below) never runs against — nor leaks data from — a task in another space.
    const existing = await this.taskModel
      .findOne({
        _id: new Types.ObjectId(taskId),
        spaceId: new Types.ObjectId(spaceId),
      })
      .exec();
    const previousAssignees = (existing?.assignees ?? []).map((id) =>
      id.toString(),
    );

    if (dto.assignees !== undefined) {
      updates.assignees = dto.assignees.map((id) => new Types.ObjectId(id));
    }
    if (dto.tags !== undefined) {
      updates.tags = dto.tags.map((id) => new Types.ObjectId(id));
    }
    if (dto.startDate !== undefined) {
      updates.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.dueDate !== undefined) {
      updates.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    const isCompletingStatus = (s: TaskStatus) =>
      s === TaskStatus.Feito || s === TaskStatus.Fechado;

    if (dto.status && isCompletingStatus(dto.status) && existing) {
      const blockedByIds = existing.blockedBy;
      if (blockedByIds.length > 0) {
        const blockers = await this.taskModel
          .find({ _id: { $in: blockedByIds } })
          .select('status name')
          .exec();
        const pending = blockers.filter(
          (t) =>
            t.status !== TaskStatus.Feito && t.status !== TaskStatus.Fechado,
        );
        if (pending.length > 0) {
          const names = pending.map((t) => t.name).join(', ');
          throw new BadRequestException(
            `Tarefa bloqueada por tarefas não concluídas: ${names}`,
          );
        }
      }
    }

    const task = await this.taskModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(taskId),
          spaceId: new Types.ObjectId(spaceId),
        },
        updates,
        { returnDocument: 'after' },
      )
      .populate('assignees', 'email displayName avatarUrl')
      .populate('tags')
      .exec();

    if (!task) throw new NotFoundException('Task not found');

    if (dto.assignees !== undefined) {
      const newAssignees = dto.assignees.filter(
        (id) => !previousAssignees.includes(id),
      );
      await Promise.all(
        newAssignees.map((userId) =>
          this.notificationsService.create({
            userId,
            type: NotificationType.TaskAssigned,
            message: `Você foi atribuído à tarefa "${task.name}"`,
            taskId: task._id.toString(),
            spaceId,
          }),
        ),
      );
    }

    if (actorId && existing) {
      await this.logUpdateEvents(taskId, spaceId, actorId, existing, dto);
    }

    return task;
  }

  private async logUpdateEvents(
    taskId: string,
    spaceId: string,
    actorId: string,
    existing: TaskDocument,
    dto: UpdateTaskDto,
  ): Promise<void> {
    const base = { taskId, spaceId, userId: actorId };

    if (dto.status !== undefined && dto.status !== existing.status) {
      await this.taskEventsService.create({
        ...base,
        type: TaskEventType.StatusChanged,
        changes: {
          field: 'status',
          oldValue: existing.status,
          newValue: dto.status,
        },
      });
    }

    if (dto.priority !== undefined && dto.priority !== existing.priority) {
      await this.taskEventsService.create({
        ...base,
        type: TaskEventType.PriorityChanged,
        changes: {
          field: 'priority',
          oldValue: existing.priority,
          newValue: dto.priority,
        },
      });
    }

    if (dto.name !== undefined && dto.name !== existing.name) {
      await this.taskEventsService.create({
        ...base,
        type: TaskEventType.NameChanged,
        changes: { field: 'name', oldValue: existing.name, newValue: dto.name },
      });
    }

    if (
      dto.description !== undefined &&
      dto.description !== existing.description
    ) {
      await this.taskEventsService.create({
        ...base,
        type: TaskEventType.DescriptionChanged,
        changes: null,
      });
    }

    if (
      dto.storyPoints !== undefined &&
      dto.storyPoints !== existing.storyPoints
    ) {
      await this.taskEventsService.create({
        ...base,
        type: TaskEventType.StoryPointsChanged,
        changes: {
          field: 'storyPoints',
          oldValue:
            existing.storyPoints != null ? String(existing.storyPoints) : null,
          newValue: dto.storyPoints != null ? String(dto.storyPoints) : null,
        },
      });
    }

    if (dto.dueDate !== undefined) {
      const oldDue = existing.dueDate
        ? existing.dueDate.toISOString().substring(0, 10)
        : null;
      const newDue = dto.dueDate
        ? new Date(dto.dueDate).toISOString().substring(0, 10)
        : null;
      if (oldDue !== newDue) {
        await this.taskEventsService.create({
          ...base,
          type: TaskEventType.DueDateChanged,
          changes: { field: 'dueDate', oldValue: oldDue, newValue: newDue },
        });
      }
    }

    if (dto.startDate !== undefined) {
      const oldStart = existing.startDate
        ? existing.startDate.toISOString().substring(0, 10)
        : null;
      const newStart = dto.startDate
        ? new Date(dto.startDate).toISOString().substring(0, 10)
        : null;
      if (oldStart !== newStart) {
        await this.taskEventsService.create({
          ...base,
          type: TaskEventType.StartDateChanged,
          changes: {
            field: 'startDate',
            oldValue: oldStart,
            newValue: newStart,
          },
        });
      }
    }

    if (dto.assignees !== undefined) {
      const prevSet = new Set(existing.assignees.map((id) => id.toString()));
      const nextSet = new Set(dto.assignees);

      for (const id of nextSet) {
        if (!prevSet.has(id)) {
          await this.taskEventsService.create({
            ...base,
            type: TaskEventType.AssigneeAdded,
            changes: { field: 'assignees', oldValue: null, newValue: id },
          });
        }
      }
      for (const id of prevSet) {
        if (!nextSet.has(id)) {
          await this.taskEventsService.create({
            ...base,
            type: TaskEventType.AssigneeRemoved,
            changes: { field: 'assignees', oldValue: id, newValue: null },
          });
        }
      }
    }
  }

  async move(
    spaceId: string,
    taskId: string,
    dto: MoveTaskDto,
  ): Promise<TaskDocument> {
    // Domain rule: a task belongs to either a list OR a sprint, never both and
    // never neither. `create()` enforces this; `move()` must too.
    if (!dto.listId && !dto.sprintId) {
      throw new BadRequestException(
        'Move requires either a listId or a sprintId',
      );
    }
    if (dto.listId && dto.sprintId) {
      throw new BadRequestException(
        'Move accepts only one of listId or sprintId, not both',
      );
    }

    const updates: Record<string, unknown> = {
      listId: dto.listId ? new Types.ObjectId(dto.listId) : null,
      sprintId: dto.sprintId ? new Types.ObjectId(dto.sprintId) : null,
    };

    const task = await this.taskModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(taskId),
          spaceId: new Types.ObjectId(spaceId),
        },
        updates,
        { returnDocument: 'after' },
      )
      .exec();

    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  /**
   * Soft delete: move the task (and its still-active subtasks) to the trash by
   * stamping a shared `archivedAt`. The shared timestamp lets `restore` bring back
   * exactly what this operation archived, without touching subtasks that were
   * archived independently earlier.
   */
  async archive(spaceId: string, taskId: string): Promise<TaskDocument> {
    const now = new Date();
    const taskOid = new Types.ObjectId(taskId);
    const spaceOid = new Types.ObjectId(spaceId);

    const task = await this.taskModel
      .findOneAndUpdate(
        { _id: taskOid, spaceId: spaceOid, archivedAt: null },
        { archivedAt: now },
        { returnDocument: 'after' },
      )
      .exec();

    if (!task) throw new NotFoundException('Task not found');

    await this.taskModel
      .updateMany(
        { parentTask: taskOid, spaceId: spaceOid, archivedAt: null },
        { archivedAt: now },
      )
      .exec();

    return task;
  }

  async restore(spaceId: string, taskId: string): Promise<TaskDocument> {
    const taskOid = new Types.ObjectId(taskId);
    const spaceOid = new Types.ObjectId(spaceId);

    const task = await this.taskModel
      .findOne({ _id: taskOid, spaceId: spaceOid })
      .exec();

    if (!task || !task.archivedAt) {
      throw new NotFoundException('Archived task not found');
    }

    const archivedAt = task.archivedAt;
    task.archivedAt = null;
    await task.save();

    await this.taskModel
      .updateMany(
        { parentTask: taskOid, spaceId: spaceOid, archivedAt },
        { archivedAt: null },
      )
      .exec();

    return task;
  }

  /** Permanently delete an archived task (and its subtasks); cleans up dependencies. */
  async permanentRemove(spaceId: string, taskId: string): Promise<void> {
    const taskOid = new Types.ObjectId(taskId);
    const spaceOid = new Types.ObjectId(spaceId);

    const task = await this.taskModel
      .findOne({ _id: taskOid, spaceId: spaceOid })
      .exec();

    if (!task) throw new NotFoundException('Task not found');
    if (!task.archivedAt) {
      throw new BadRequestException(
        'Task must be archived before permanent deletion',
      );
    }

    await this.taskModel.deleteOne({ _id: taskOid }).exec();

    await Promise.all([
      this.taskModel.deleteMany({ parentTask: taskOid, spaceId: spaceOid }),
      this.taskModel.updateMany(
        { spaceId: spaceOid },
        { $pull: { blockedBy: taskOid, blocks: taskOid } },
      ),
    ]);
  }

  /**
   * Archived tasks of a space (the trash history). Lists ALL archived tasks,
   * including subtasks deleted individually. Only subtasks that were
   * cascade-archived together with their parent (same `archivedAt` timestamp)
   * are hidden, so the operation that archived a parent + its subtasks shows up
   * as a single entry rather than one row per subtask.
   */
  async findArchivedBySpace(spaceId: string): Promise<TaskDocument[]> {
    const tasks = await this.taskModel
      .find({
        spaceId: new Types.ObjectId(spaceId),
        archivedAt: { $ne: null },
      })
      .populate('listId', 'name')
      .populate('sprintId', 'name number')
      .populate('assignees', 'email displayName avatarUrl')
      .populate('tags')
      .sort({ archivedAt: -1 })
      .exec();

    // Index archived tasks by id so we can detect cascade-archived subtasks.
    const byId = new Map<string, TaskDocument>();
    for (const t of tasks) byId.set(t._id.toString(), t);

    return tasks.filter((t) => {
      if (!t.parentTask) return true;
      const parent = byId.get(t.parentTask.toString());
      if (!parent || !parent.archivedAt || !t.archivedAt) return true;
      // Drop only when archived in the same operation as the parent.
      return parent.archivedAt.getTime() !== t.archivedAt.getTime();
    });
  }

  /** Permanently delete every archived task of a space; cleans up dependencies. */
  async emptyTaskTrash(spaceId: string): Promise<{ affected: number }> {
    const spaceOid = new Types.ObjectId(spaceId);
    const filter = { spaceId: spaceOid, archivedAt: { $ne: null } };

    const archived = await this.taskModel.find(filter).exec();
    const ids = archived.map((t) => t._id);

    const { deletedCount } = await this.taskModel.deleteMany(filter).exec();

    await this.taskModel
      .updateMany(
        { spaceId: spaceOid },
        { $pull: { blockedBy: { $in: ids }, blocks: { $in: ids } } },
      )
      .exec();

    return { affected: deletedCount ?? 0 };
  }

  async addDependency(
    spaceId: string,
    taskId: string,
    dto: AddDependencyDto,
  ): Promise<void> {
    const [task, target] = await Promise.all([
      this.taskModel
        .findOne({
          _id: new Types.ObjectId(taskId),
          spaceId: new Types.ObjectId(spaceId),
        })
        .exec(),
      this.taskModel
        .findOne({
          _id: new Types.ObjectId(dto.targetTaskId),
          spaceId: new Types.ObjectId(spaceId),
        })
        .exec(),
    ]);

    if (!task || !target) throw new NotFoundException('Task not found');

    if (dto.type === 'blocks') {
      await Promise.all([
        this.taskModel.updateOne(
          { _id: task._id },
          { $addToSet: { blocks: target._id } },
        ),
        this.taskModel.updateOne(
          { _id: target._id },
          { $addToSet: { blockedBy: task._id } },
        ),
      ]);
    } else {
      await Promise.all([
        this.taskModel.updateOne(
          { _id: task._id },
          { $addToSet: { blockedBy: target._id } },
        ),
        this.taskModel.updateOne(
          { _id: target._id },
          { $addToSet: { blocks: task._id } },
        ),
      ]);
    }
  }

  async removeDependency(
    spaceId: string,
    taskId: string,
    targetId: string,
  ): Promise<void> {
    await Promise.all([
      this.taskModel.updateOne(
        {
          _id: new Types.ObjectId(taskId),
          spaceId: new Types.ObjectId(spaceId),
        },
        {
          $pull: {
            blocks: new Types.ObjectId(targetId),
            blockedBy: new Types.ObjectId(targetId),
          },
        },
      ),
      this.taskModel.updateOne(
        {
          _id: new Types.ObjectId(targetId),
          spaceId: new Types.ObjectId(spaceId),
        },
        {
          $pull: {
            blocks: new Types.ObjectId(taskId),
            blockedBy: new Types.ObjectId(taskId),
          },
        },
      ),
    ]);
  }

  // ── Bulk operations ───────────────────────────────────────────────────────

  async bulkMove(
    spaceId: string,
    taskIds: string[],
    dto: BulkMoveDto,
  ): Promise<void> {
    const oids = taskIds.map((id) => new Types.ObjectId(id));

    // Find subtasks of these tasks so we move them too
    const subtasks = await this.taskModel
      .find({ parentTask: { $in: oids }, spaceId: new Types.ObjectId(spaceId) })
      .exec();
    const subtaskOids = subtasks.map((s) => s._id);

    const allOids = [...oids, ...subtaskOids];

    await this.taskModel
      .updateMany(
        { _id: { $in: allOids }, spaceId: new Types.ObjectId(spaceId) },
        {
          listId: dto.listId ? new Types.ObjectId(dto.listId) : null,
          sprintId: dto.sprintId ? new Types.ObjectId(dto.sprintId) : null,
        },
      )
      .exec();
  }

  async bulkDuplicate(
    spaceId: string,
    taskIds: string[],
    userId: string,
    dto: { listId?: string; sprintId?: string },
  ): Promise<void> {
    const oids = taskIds.map((id) => new Types.ObjectId(id));
    const destListId = dto.listId ? new Types.ObjectId(dto.listId) : null;
    const destSprintId = dto.sprintId ? new Types.ObjectId(dto.sprintId) : null;

    const tasks = await this.taskModel
      .find({ _id: { $in: oids }, spaceId: new Types.ObjectId(spaceId) })
      .exec();

    for (const task of tasks) {
      const newTask = await this.taskModel.create({
        spaceId: task.spaceId,
        listId: destListId,
        sprintId: destSprintId,
        name: task.name,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignees: task.assignees,
        startDate: task.startDate,
        dueDate: task.dueDate,
        tags: task.tags,
        storyPoints: task.storyPoints,
        parentTask: null,
        position: task.position,
        createdBy: new Types.ObjectId(userId),
      });

      // Duplicate subtasks pointing to new parent
      const subtasks = await this.taskModel
        .find({ parentTask: task._id, spaceId: new Types.ObjectId(spaceId) })
        .exec();

      for (const sub of subtasks) {
        await this.taskModel.create({
          spaceId: sub.spaceId,
          listId: destListId,
          sprintId: destSprintId,
          name: sub.name,
          description: sub.description,
          status: sub.status,
          priority: sub.priority,
          assignees: sub.assignees,
          startDate: sub.startDate,
          dueDate: sub.dueDate,
          tags: sub.tags,
          storyPoints: sub.storyPoints,
          parentTask: newTask._id,
          position: sub.position,
          createdBy: new Types.ObjectId(userId),
        });
      }
    }
  }

  /**
   * Unified bulk action endpoint. Applies a single action to every task in
   * `taskIds` that belongs to `spaceId`. Tasks outside the space are silently
   * ignored (the spaceId filter scopes every query) so callers can never mutate
   * tasks they have no access to. Returns the number of affected tasks.
   */
  async bulkPatch(
    spaceId: string,
    dto: BulkPatchDto,
  ): Promise<{ affected: number }> {
    const spaceOid = new Types.ObjectId(spaceId);
    const oids = dto.taskIds.map((id) => new Types.ObjectId(id));
    const filter = { _id: { $in: oids }, spaceId: spaceOid };

    switch (dto.action) {
      case 'status': {
        const res = await this.taskModel
          .updateMany(filter, { $set: { status: dto.status } })
          .exec();
        return { affected: res?.modifiedCount ?? 0 };
      }

      case 'priority': {
        const res = await this.taskModel
          .updateMany(filter, { $set: { priority: dto.priority } })
          .exec();
        return { affected: res?.modifiedCount ?? 0 };
      }

      case 'assignees': {
        const assignees = (dto.assignees ?? []).map(
          (id) => new Types.ObjectId(id),
        );
        const res = await this.taskModel
          .updateMany(filter, { $set: { assignees } })
          .exec();
        return { affected: res?.modifiedCount ?? 0 };
      }

      case 'move': {
        // Domain rule: a task belongs to either a list OR a sprint, never both
        // and never neither. Setting one destination must clear the other.
        if (!dto.listId && !dto.sprintId) {
          throw new BadRequestException(
            'Move requires either a listId or a sprintId',
          );
        }
        if (dto.listId && dto.sprintId) {
          throw new BadRequestException(
            'Move accepts only one of listId or sprintId, not both',
          );
        }

        // Move subtasks alongside their parents so they stay in the same place.
        const subtasks = await this.taskModel
          .find({ parentTask: { $in: oids }, spaceId: spaceOid })
          .exec();
        const allOids = [...oids, ...subtasks.map((s) => s._id)];

        const res = await this.taskModel
          .updateMany(
            { _id: { $in: allOids }, spaceId: spaceOid },
            {
              listId: dto.listId ? new Types.ObjectId(dto.listId) : null,
              sprintId: dto.sprintId ? new Types.ObjectId(dto.sprintId) : null,
            },
          )
          .exec();
        return { affected: res?.modifiedCount ?? 0 };
      }

      case 'delete': {
        // Soft delete: archive the selected tasks and their still-active subtasks
        // under a shared timestamp so they can be restored together from the trash.
        const now = new Date();
        const subtasks = await this.taskModel
          .find({
            parentTask: { $in: oids },
            spaceId: spaceOid,
            archivedAt: null,
          })
          .exec();
        const allOids = [...oids, ...subtasks.map((s) => s._id)];

        const res = await this.taskModel
          .updateMany(
            { _id: { $in: allOids }, spaceId: spaceOid, archivedAt: null },
            { archivedAt: now },
          )
          .exec();

        return { affected: res?.modifiedCount ?? 0 };
      }

      default:
        throw new BadRequestException('Unsupported bulk action');
    }
  }

  async convertToSubtask(
    spaceId: string,
    taskIds: string[],
    parentTaskId: string,
  ): Promise<void> {
    const parent = await this.taskModel
      .findOne({
        _id: new Types.ObjectId(parentTaskId),
        spaceId: new Types.ObjectId(spaceId),
      })
      .exec();
    if (!parent) throw new NotFoundException('Parent task not found');

    const oids = taskIds.map((id) => new Types.ObjectId(id));

    await this.taskModel
      .updateMany(
        { _id: { $in: oids }, spaceId: new Types.ObjectId(spaceId) },
        {
          parentTask: new Types.ObjectId(parentTaskId),
          listId: parent.listId,
          sprintId: parent.sprintId,
        },
      )
      .exec();
  }

  async promoteToMainTask(
    spaceId: string,
    taskIds: string[],
    dto: PromoteToMainTaskDto,
  ): Promise<void> {
    const oids = taskIds.map((id) => new Types.ObjectId(id));

    await this.taskModel
      .updateMany(
        { _id: { $in: oids }, spaceId: new Types.ObjectId(spaceId) },
        {
          $unset: { parentTask: 1 },
          $set: {
            listId: dto.listId ? new Types.ObjectId(dto.listId) : null,
            sprintId: dto.sprintId ? new Types.ObjectId(dto.sprintId) : null,
          },
        },
      )
      .exec();
  }

  async moveSubtask(
    spaceId: string,
    taskIds: string[],
    newParentTaskId: string,
  ): Promise<void> {
    const newParent = await this.taskModel
      .findOne({
        _id: new Types.ObjectId(newParentTaskId),
        spaceId: new Types.ObjectId(spaceId),
      })
      .exec();
    if (!newParent) throw new NotFoundException('New parent task not found');

    const oids = taskIds.map((id) => new Types.ObjectId(id));

    await this.taskModel
      .updateMany(
        { _id: { $in: oids }, spaceId: new Types.ObjectId(spaceId) },
        {
          parentTask: new Types.ObjectId(newParentTaskId),
          listId: newParent.listId,
          sprintId: newParent.sprintId,
        },
      )
      .exec();
  }

  async duplicateSubtask(
    spaceId: string,
    taskId: string,
    newParentTaskId: string,
  ): Promise<void> {
    const [subtask, newParent] = await Promise.all([
      this.taskModel
        .findOne({
          _id: new Types.ObjectId(taskId),
          spaceId: new Types.ObjectId(spaceId),
        })
        .exec(),
      this.taskModel
        .findOne({
          _id: new Types.ObjectId(newParentTaskId),
          spaceId: new Types.ObjectId(spaceId),
        })
        .exec(),
    ]);

    if (!subtask) throw new NotFoundException('Subtask not found');
    if (!newParent) throw new NotFoundException('Parent task not found');

    await this.taskModel.create({
      spaceId: subtask.spaceId,
      listId: newParent.listId,
      sprintId: newParent.sprintId,
      name: subtask.name,
      description: subtask.description,
      status: subtask.status,
      priority: subtask.priority,
      assignees: subtask.assignees,
      startDate: subtask.startDate,
      dueDate: subtask.dueDate,
      tags: subtask.tags,
      storyPoints: subtask.storyPoints,
      parentTask: new Types.ObjectId(newParentTaskId),
      position: subtask.position,
      createdBy: subtask.createdBy,
    });
  }
}

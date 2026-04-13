import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument, FIBONACCI_POINTS } from './schemas/task.schema';
import {
  CreateTaskDto,
  UpdateTaskDto,
  MoveTaskDto,
  AddDependencyDto,
  BulkMoveDto,
  PromoteToMainTaskDto,
} from './dto/create-task.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(spaceId: string, userId: string, dto: CreateTaskDto): Promise<TaskDocument> {
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

    if (dto.storyPoints && !FIBONACCI_POINTS.includes(dto.storyPoints as (typeof FIBONACCI_POINTS)[number])) {
      throw new BadRequestException('Story points must be a Fibonacci number');
    }

    const parentTaskOid = dto.parentTask ? new Types.ObjectId(dto.parentTask) : null;

    const count = await this.taskModel
      .countDocuments({
        spaceId: new Types.ObjectId(spaceId),
        listId: resolvedListId ? new Types.ObjectId(resolvedListId) : null,
        sprintId: resolvedSprintId ? new Types.ObjectId(resolvedSprintId) : null,
        parentTask: parentTaskOid,
      })
      .exec();

    return this.taskModel.create({
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
  }

  async findById(taskId: string): Promise<TaskDocument> {
    const task = await this.taskModel
      .findById(taskId)
      .populate('assignees', 'email displayName avatarUrl')
      .populate('tags')
      .populate('blockedBy', 'name status')
      .populate('blocks', 'name status')
      .exec();

    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async findBySpace(spaceId: string, query: {
    listId?: string;
    sprintId?: string;
    parentTask?: null;
  }): Promise<TaskDocument[]> {
    const filter: Record<string, unknown> = { spaceId: new Types.ObjectId(spaceId) };
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
    const counts = await this.taskModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { parentTask: { $in: ids } } },
      { $group: { _id: '$parentTask', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
    for (const task of tasks) {
      task.subtaskCount = countMap.get(task._id.toString()) ?? 0;
    }
  }

  async findSubtasks(parentTaskId: string): Promise<TaskDocument[]> {
    return this.taskModel
      .find({ parentTask: new Types.ObjectId(parentTaskId) })
      .populate('assignees', 'email displayName avatarUrl')
      .sort({ position: 1, createdAt: 1 })
      .exec();
  }

  async update(spaceId: string, taskId: string, dto: UpdateTaskDto): Promise<TaskDocument> {
    const updates: Record<string, unknown> = { ...dto };

    let previousAssignees: string[] = [];
    if (dto.assignees !== undefined) {
      const existing = await this.taskModel.findById(taskId).exec();
      previousAssignees = (existing?.assignees ?? []).map((id) => id.toString());
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

    const task = await this.taskModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(taskId), spaceId: new Types.ObjectId(spaceId) },
        updates,
        { returnDocument: 'after' },
      )
      .populate('assignees', 'email displayName avatarUrl')
      .populate('tags')
      .exec();

    if (!task) throw new NotFoundException('Task not found');

    if (dto.assignees !== undefined) {
      const newAssignees = dto.assignees.filter((id) => !previousAssignees.includes(id));
      await Promise.all(
        newAssignees.map((userId) =>
          this.notificationsService.create({
            userId,
            type: NotificationType.TaskAssigned,
            message: `Você foi atribuído à tarefa "${task.name}"`,
            taskId: task._id.toString(),
          }),
        ),
      );
    }

    return task;
  }

  async move(spaceId: string, taskId: string, dto: MoveTaskDto): Promise<TaskDocument> {
    const updates: Record<string, unknown> = {
      listId: dto.listId ? new Types.ObjectId(dto.listId) : null,
      sprintId: dto.sprintId ? new Types.ObjectId(dto.sprintId) : null,
    };

    const task = await this.taskModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(taskId), spaceId: new Types.ObjectId(spaceId) },
        updates,
        { returnDocument: 'after' },
      )
      .exec();

    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async remove(spaceId: string, taskId: string): Promise<void> {
    const task = await this.taskModel
      .findOneAndDelete({
        _id: new Types.ObjectId(taskId),
        spaceId: new Types.ObjectId(spaceId),
      })
      .exec();

    if (!task) throw new NotFoundException('Task not found');

    // Remove from other tasks' dependency arrays
    await Promise.all([
      this.taskModel.updateMany(
        { spaceId: new Types.ObjectId(spaceId) },
        { $pull: { blockedBy: new Types.ObjectId(taskId), blocks: new Types.ObjectId(taskId) } },
      ),
    ]);
  }

  async addDependency(spaceId: string, taskId: string, dto: AddDependencyDto): Promise<void> {
    const [task, target] = await Promise.all([
      this.taskModel.findOne({ _id: new Types.ObjectId(taskId), spaceId: new Types.ObjectId(spaceId) }).exec(),
      this.taskModel.findOne({ _id: new Types.ObjectId(dto.targetTaskId), spaceId: new Types.ObjectId(spaceId) }).exec(),
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

  async removeDependency(spaceId: string, taskId: string, targetId: string): Promise<void> {
    await Promise.all([
      this.taskModel.updateOne(
        { _id: new Types.ObjectId(taskId), spaceId: new Types.ObjectId(spaceId) },
        { $pull: { blocks: new Types.ObjectId(targetId), blockedBy: new Types.ObjectId(targetId) } },
      ),
      this.taskModel.updateOne(
        { _id: new Types.ObjectId(targetId), spaceId: new Types.ObjectId(spaceId) },
        { $pull: { blocks: new Types.ObjectId(taskId), blockedBy: new Types.ObjectId(taskId) } },
      ),
    ]);
  }

  // ── Bulk operations ───────────────────────────────────────────────────────

  async bulkDelete(spaceId: string, taskIds: string[]): Promise<void> {
    const oids = taskIds.map((id) => new Types.ObjectId(id));

    // Find all subtasks of the tasks being deleted
    const subtasks = await this.taskModel
      .find({ parentTask: { $in: oids }, spaceId: new Types.ObjectId(spaceId) })
      .exec();
    const subtaskOids = subtasks.map((s) => s._id as Types.ObjectId);

    const allOids = [...oids, ...subtaskOids];

    await this.taskModel
      .deleteMany({ _id: { $in: allOids }, spaceId: new Types.ObjectId(spaceId) })
      .exec();

    await this.taskModel.updateMany(
      { spaceId: new Types.ObjectId(spaceId) },
      { $pull: { blockedBy: { $in: allOids }, blocks: { $in: allOids } } },
    );
  }

  async bulkMove(spaceId: string, taskIds: string[], dto: BulkMoveDto): Promise<void> {
    const oids = taskIds.map((id) => new Types.ObjectId(id));

    // Find subtasks of these tasks so we move them too
    const subtasks = await this.taskModel
      .find({ parentTask: { $in: oids }, spaceId: new Types.ObjectId(spaceId) })
      .exec();
    const subtaskOids = subtasks.map((s) => s._id as Types.ObjectId);

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

  async convertToSubtask(spaceId: string, taskIds: string[], parentTaskId: string): Promise<void> {
    const parent = await this.taskModel
      .findOne({ _id: new Types.ObjectId(parentTaskId), spaceId: new Types.ObjectId(spaceId) })
      .exec();
    if (!parent) throw new NotFoundException('Parent task not found');

    const oids = taskIds.map((id) => new Types.ObjectId(id));

    await this.taskModel.updateMany(
      { _id: { $in: oids }, spaceId: new Types.ObjectId(spaceId) },
      {
        parentTask: new Types.ObjectId(parentTaskId),
        listId: parent.listId,
        sprintId: parent.sprintId,
      },
    ).exec();
  }

  async promoteToMainTask(spaceId: string, taskIds: string[], dto: PromoteToMainTaskDto): Promise<void> {
    const oids = taskIds.map((id) => new Types.ObjectId(id));

    await this.taskModel.updateMany(
      { _id: { $in: oids }, spaceId: new Types.ObjectId(spaceId) },
      {
        $unset: { parentTask: 1 },
        $set: {
          listId: dto.listId ? new Types.ObjectId(dto.listId) : null,
          sprintId: dto.sprintId ? new Types.ObjectId(dto.sprintId) : null,
        },
      },
    ).exec();
  }

  async moveSubtask(spaceId: string, taskIds: string[], newParentTaskId: string): Promise<void> {
    const newParent = await this.taskModel
      .findOne({ _id: new Types.ObjectId(newParentTaskId), spaceId: new Types.ObjectId(spaceId) })
      .exec();
    if (!newParent) throw new NotFoundException('New parent task not found');

    const oids = taskIds.map((id) => new Types.ObjectId(id));

    await this.taskModel.updateMany(
      { _id: { $in: oids }, spaceId: new Types.ObjectId(spaceId) },
      {
        parentTask: new Types.ObjectId(newParentTaskId),
        listId: newParent.listId,
        sprintId: newParent.sprintId,
      },
    ).exec();
  }
}

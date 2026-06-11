import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, PipelineStage } from 'mongoose';
import { Task, TaskDocument, TaskStatus } from './schemas/task.schema';
import { TaskFilterQueryDto } from './dto/task-filter-query.dto';

export interface GroupedResult {
  groupKey: string | null;
  tasks: TaskDocument[];
  totalStoryPoints: number;
  count: number;
}

@Injectable()
export class TasksFilterService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
  ) {}

  async findFiltered(
    spaceId: string,
    dto: TaskFilterQueryDto,
    currentUserId: string,
  ): Promise<TaskDocument[] | GroupedResult[]> {
    const match = this.buildMatch(spaceId, dto, currentUserId);

    if (!dto.groupBy) {
      const tasks = await this.taskModel
        .find(match)
        .populate('assignees', 'email displayName avatarUrl')
        .populate('tags')
        .sort({ position: 1, createdAt: 1 })
        .exec();
      await this.attachSubtaskCounts(tasks);
      return tasks;
    }

    return this.buildGroupedResult(match, dto.groupBy);
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

  async getSprintPointSums(
    spaceId: string,
    sprintIds?: string[],
  ): Promise<{ sprintId: string; total: number }[]> {
    const matchStage: PipelineStage.Match = {
      $match: {
        spaceId: new Types.ObjectId(spaceId),
        archivedAt: null,
        sprintId: { $ne: null },
        storyPoints: { $ne: null },
        status: { $ne: TaskStatus.Fechado },
        ...(sprintIds?.length
          ? { sprintId: { $in: sprintIds.map((id) => new Types.ObjectId(id)) } }
          : {}),
      },
    };

    const result = await this.taskModel.aggregate<{
      _id: Types.ObjectId;
      total: number;
    }>([
      matchStage,
      { $group: { _id: '$sprintId', total: { $sum: '$storyPoints' } } },
    ]);

    return result.map((r) => ({
      sprintId: r._id.toString(),
      total: r.total,
    }));
  }

  private buildMatch(
    spaceId: string,
    dto: TaskFilterQueryDto,
    currentUserId: string,
  ): Record<string, unknown> {
    const match: Record<string, unknown> = {
      spaceId: new Types.ObjectId(spaceId),
      archivedAt: null,
    };

    if (!dto.includeSubtasks) match.parentTask = null;
    if (dto.listId) match.listId = new Types.ObjectId(dto.listId);
    if (dto.sprintId) match.sprintId = new Types.ObjectId(dto.sprintId);

    if (dto.status?.length) {
      match.status = { $in: dto.status };
    }

    if (dto.priority?.length) {
      match.priority = { $in: dto.priority };
    }

    if (dto.assignees?.length) {
      const resolvedAssignees = dto.assignees.map((a) =>
        a === 'me' ? new Types.ObjectId(currentUserId) : new Types.ObjectId(a),
      );
      match.assignees = { $in: resolvedAssignees };
    }

    if (dto.tags?.length) {
      match.tags = { $in: dto.tags.map((id) => new Types.ObjectId(id)) };
    }

    if (dto.dueBefore) {
      match.dueDate = {
        ...((match.dueDate as object) ?? {}),
        $lte: new Date(dto.dueBefore),
      };
    }
    if (dto.dueAfter) {
      match.dueDate = {
        ...((match.dueDate as object) ?? {}),
        $gte: new Date(dto.dueAfter),
      };
    }

    const term = dto.q?.trim();
    if (term) {
      // $text uses the `name` text index (whole-word + stemming) instead of an
      // unindexed $regex scan. In aggregation it stays valid because `match` is
      // the first $match stage of every grouped pipeline.
      match.$text = { $search: term };
    }

    return match;
  }

  private async buildGroupedResult(
    match: Record<string, unknown>,
    groupBy: 'status' | 'assignee' | 'sprint' | 'priority',
  ): Promise<GroupedResult[]> {
    if (groupBy === 'assignee') {
      return this.groupByAssignee(match);
    }

    const groupField = {
      status: '$status',
      sprint: '$sprintId',
      priority: '$priority',
    }[groupBy];

    // Aggregate to get group structure with task IDs only
    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: groupField,
          taskIds: { $push: '$_id' },
          totalStoryPoints: { $sum: { $ifNull: ['$storyPoints', 0] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const raw = await this.taskModel.aggregate<{
      _id: string | null;
      taskIds: Types.ObjectId[];
      totalStoryPoints: number;
      count: number;
    }>(pipeline);

    if (raw.length === 0) return [];

    // Re-fetch all tasks with proper populate in a single query
    const allTaskIds = raw.flatMap((r) => r.taskIds);
    const populated = (await this.taskModel
      .find({ _id: { $in: allTaskIds } })
      .populate('assignees', 'email displayName avatarUrl')
      .populate('tags')
      .sort({ position: 1, createdAt: 1 })
      .exec()) as unknown as TaskDocument[];

    const taskMap = new Map(populated.map((t) => [t._id.toString(), t]));

    return raw.map((r) => ({
      groupKey: r._id?.toString() ?? null,
      tasks: r.taskIds
        .map((id) => taskMap.get(id.toString()))
        .filter((t): t is TaskDocument => t !== undefined),
      totalStoryPoints: r.totalStoryPoints,
      count: r.count,
    }));
  }

  private async groupByAssignee(
    match: Record<string, unknown>,
  ): Promise<GroupedResult[]> {
    // Unwind so a task with N assignees appears in N groups.
    // Use $lookup to resolve the assignee's display name for the group header.
    const pipeline: PipelineStage[] = [
      { $match: match },
      { $unwind: { path: '$assignees', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'assignees',
          foreignField: '_id',
          as: '_assigneeDocs',
        },
      },
      {
        $addFields: {
          _assigneeDisplay: { $first: '$_assigneeDocs.displayName' },
        },
      },
      {
        $group: {
          _id: '$assignees',
          _groupName: { $first: '$_assigneeDisplay' },
          taskIds: { $push: '$_id' },
          totalStoryPoints: { $sum: { $ifNull: ['$storyPoints', 0] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _groupName: 1 } },
    ];

    const raw = await this.taskModel.aggregate<{
      _id: Types.ObjectId | null;
      _groupName: string | null;
      taskIds: Types.ObjectId[];
      totalStoryPoints: number;
      count: number;
    }>(pipeline);

    if (raw.length === 0) return [];

    // De-duplicate task IDs (a task with 2 assignees appears in 2 groups)
    const uniqueIds = [
      ...new Set(raw.flatMap((r) => r.taskIds.map((id) => id.toString()))),
    ];
    const populated = (await this.taskModel
      .find({ _id: { $in: uniqueIds } })
      .populate('assignees', 'email displayName avatarUrl')
      .populate('tags')
      .sort({ position: 1, createdAt: 1 })
      .exec()) as unknown as TaskDocument[];

    const taskMap = new Map(populated.map((t) => [t._id.toString(), t]));

    return raw.map((r) => ({
      groupKey: r._groupName ?? null,
      tasks: r.taskIds
        .map((id) => taskMap.get(id.toString()))
        .filter((t): t is TaskDocument => t !== undefined),
      totalStoryPoints: r.totalStoryPoints,
      count: r.count,
    }));
  }
}

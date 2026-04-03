import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, PipelineStage } from 'mongoose';
import { Task, TaskDocument, TaskStatus } from './schemas/task.schema';
import { TaskFilterQueryDto } from './dto/task-filter-query.dto';

interface GroupedResult {
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
      return this.taskModel
        .find(match)
        .populate('assignees', 'email displayName avatarUrl')
        .populate('tags')
        .sort({ position: 1, createdAt: 1 })
        .exec();
    }

    return this.buildGroupedResult(match, dto.groupBy);
  }

  async getSprintPointSums(
    spaceId: string,
    sprintIds?: string[],
  ): Promise<{ sprintId: string; total: number }[]> {
    const matchStage: PipelineStage.Match = {
      $match: {
        spaceId: new Types.ObjectId(spaceId),
        sprintId: { $ne: null },
        storyPoints: { $ne: null },
        status: { $ne: TaskStatus.Fechado },
        ...(sprintIds?.length
          ? { sprintId: { $in: sprintIds.map((id) => new Types.ObjectId(id)) } }
          : {}),
      },
    };

    const result = await this.taskModel.aggregate<{ _id: Types.ObjectId; total: number }>([
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
      match.dueDate = { ...(match.dueDate as object ?? {}), $lte: new Date(dto.dueBefore) };
    }
    if (dto.dueAfter) {
      match.dueDate = { ...(match.dueDate as object ?? {}), $gte: new Date(dto.dueAfter) };
    }

    if (dto.q) {
      match.name = { $regex: dto.q, $options: 'i' };
    }

    return match;
  }

  private async buildGroupedResult(
    match: Record<string, unknown>,
    groupBy: 'status' | 'assignee' | 'sprint' | 'priority',
  ): Promise<GroupedResult[]> {
    if (groupBy === 'assignee') {
      // For groupBy assignee: show only "feito" tasks with point sums
      const matchWithFeito = { ...match, status: TaskStatus.Feito };
      return this.groupByAssignee(matchWithFeito);
    }

    const groupField = {
      status: '$status',
      sprint: '$sprintId',
      priority: '$priority',
    }[groupBy];

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: groupField,
          tasks: { $push: '$$ROOT' },
          totalStoryPoints: { $sum: { $ifNull: ['$storyPoints', 0] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const raw = await this.taskModel.aggregate<{
      _id: string | null;
      tasks: TaskDocument[];
      totalStoryPoints: number;
      count: number;
    }>(pipeline);

    return raw.map((r) => ({
      groupKey: r._id?.toString() ?? null,
      tasks: r.tasks,
      totalStoryPoints: r.totalStoryPoints,
      count: r.count,
    }));
  }

  private async groupByAssignee(match: Record<string, unknown>): Promise<GroupedResult[]> {
    const pipeline: PipelineStage[] = [
      { $match: match },
      { $unwind: { path: '$assignees', preserveNullAndEmpty: true } },
      {
        $group: {
          _id: '$assignees',
          tasks: { $push: '$$ROOT' },
          totalStoryPoints: { $sum: { $ifNull: ['$storyPoints', 0] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
    ];

    const raw = await this.taskModel.aggregate<{
      _id: Types.ObjectId | null;
      tasks: TaskDocument[];
      totalStoryPoints: number;
      count: number;
    }>(pipeline);

    return raw.map((r) => ({
      groupKey: r._id?.toString() ?? null,
      tasks: r.tasks,
      totalStoryPoints: r.totalStoryPoints,
      count: r.count,
    }));
  }
}

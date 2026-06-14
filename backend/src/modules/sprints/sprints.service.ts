import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sprint, SprintDocument } from './schemas/sprint.schema';
import { CreateSprintDto, UpdateSprintDto } from './dto/create-sprint.dto';
import { Task, TaskDocument, TaskStatus } from '../tasks/schemas/task.schema';

export interface SprintStats {
  totalTasks: number;
  doneTasks: number;
  totalPoints: number;
  donePoints: number;
  tasksByStatus: Record<string, { count: number; points: number }>;
  tasksByAssignee: Array<{
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    count: number;
    points: number;
  }>;
  burndown: Array<{ date: string; ideal: number; remaining: number }>;
  previousSprintPoints: number | null;
}

@Injectable()
export class SprintsService {
  constructor(
    @InjectModel(Sprint.name)
    private readonly sprintModel: Model<SprintDocument>,
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
  ) {}

  async findBySpace(spaceId: string): Promise<SprintDocument[]> {
    return this.sprintModel
      .find({ spaceId: new Types.ObjectId(spaceId), archivedAt: null })
      .sort({ number: 1 })
      .exec();
  }

  async create(spaceId: string, dto: CreateSprintDto): Promise<SprintDocument> {
    const lastSprint = await this.sprintModel
      .findOne({ spaceId: new Types.ObjectId(spaceId) })
      .sort({ number: -1 })
      .select('number')
      .exec();

    const number = (lastSprint?.number ?? 0) + 1;

    return this.sprintModel.create({
      spaceId: new Types.ObjectId(spaceId),
      number,
      name: dto.name,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      folderId: dto.folderId ? new Types.ObjectId(dto.folderId) : null,
    });
  }

  async findById(spaceId: string, sprintId: string): Promise<SprintDocument> {
    const sprint = await this.sprintModel
      .findOne({
        _id: new Types.ObjectId(sprintId),
        spaceId: new Types.ObjectId(spaceId),
      })
      .exec();

    if (!sprint) throw new NotFoundException('Sprint not found');
    return sprint;
  }

  async update(
    spaceId: string,
    sprintId: string,
    dto: UpdateSprintDto,
  ): Promise<SprintDocument> {
    const updates: Record<string, unknown> = { ...dto };
    if (dto.startDate) updates.startDate = new Date(dto.startDate);
    if (dto.endDate) updates.endDate = new Date(dto.endDate);

    const sprint = await this.sprintModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(sprintId),
          spaceId: new Types.ObjectId(spaceId),
        },
        updates,
        { returnDocument: 'after' },
      )
      .exec();

    if (!sprint) throw new NotFoundException('Sprint not found');
    return sprint;
  }

  /**
   * Ids of tasks that have at least one non-archived subtask carrying story
   * points. Such "rolled-up parents" are excluded from point sums so a parent's
   * own estimate never double-counts with its subtasks (story-point Option A).
   */
  private async rolledUpParentIds(spaceId: string): Promise<Set<string>> {
    const rows = await this.taskModel.aggregate<{ _id: Types.ObjectId }>([
      {
        $match: {
          spaceId: new Types.ObjectId(spaceId),
          archivedAt: null,
          parentTask: { $ne: null },
          storyPoints: { $ne: null },
        },
      },
      { $group: { _id: '$parentTask' } },
    ]);
    return new Set(rows.map((r) => r._id.toString()));
  }

  async getStats(spaceId: string, sprintId: string): Promise<SprintStats> {
    const sprint = await this.sprintModel
      .findOne({
        _id: new Types.ObjectId(sprintId),
        spaceId: new Types.ObjectId(spaceId),
      })
      .exec();
    if (!sprint) throw new NotFoundException('Sprint not found');

    // Fetch sprint tasks with populated assignees
    type PopulatedTask = Omit<TaskDocument, 'assignees'> & {
      assignees: Array<{
        _id: Types.ObjectId;
        displayName: string;
        avatarUrl: string | null;
      }>;
      updatedAt: Date;
    };
    const tasks = (await this.taskModel
      .find({ sprintId: new Types.ObjectId(sprintId), archivedAt: null })
      .populate('assignees', 'displayName avatarUrl')
      .exec()) as unknown as PopulatedTask[];

    // Story-point rollup (Option A): a task whose subtasks carry points is a
    // rolled-up parent — its own points are ignored so each unit of work counts
    // once. Effective points come only from "leaves" (tasks with no pointed child).
    const rolledUp = await this.rolledUpParentIds(spaceId);
    const pts = (t: PopulatedTask) =>
      rolledUp.has(t._id.toString()) ? 0 : (t.storyPoints ?? 0);

    // Totals
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === TaskStatus.Feito).length;
    const totalPoints = tasks.reduce((s, t) => s + pts(t), 0);
    const donePoints = tasks
      .filter((t) => t.status === TaskStatus.Feito)
      .reduce((s, t) => s + pts(t), 0);

    // By status
    const allStatuses: TaskStatus[] = [
      TaskStatus.Pendente,
      TaskStatus.EmProgresso,
      TaskStatus.EmReview,
      TaskStatus.Feito,
      TaskStatus.Fechado,
    ];
    const tasksByStatus: SprintStats['tasksByStatus'] = {};
    for (const s of allStatuses) {
      const group = tasks.filter((t) => t.status === s);
      tasksByStatus[s] = {
        count: group.length,
        points: group.reduce((acc, t) => acc + pts(t), 0),
      };
    }

    // By assignee
    const assigneeMap = new Map<
      string,
      SprintStats['tasksByAssignee'][number]
    >();
    for (const task of tasks) {
      for (const a of task.assignees) {
        const id = a._id.toString();
        if (!assigneeMap.has(id)) {
          assigneeMap.set(id, {
            userId: id,
            displayName: a.displayName,
            avatarUrl: a.avatarUrl,
            count: 0,
            points: 0,
          });
        }
        const entry = assigneeMap.get(id)!;
        entry.count += 1;
        entry.points += pts(task);
      }
    }
    const tasksByAssignee = Array.from(assigneeMap.values());

    // Burndown
    const start = new Date(sprint.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(sprint.endDate);
    end.setHours(23, 59, 59, 999);
    const today = new Date();
    const cutoff = today < end ? today : end;
    const totalDays = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 86_400_000),
    );

    const doneTasks2 = tasks.filter((t) => t.status === TaskStatus.Feito);
    const burndown: SprintStats['burndown'] = [];
    const cursor = new Date(start);
    let day = 0;
    while (cursor <= cutoff) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const completedByDay = doneTasks2
        .filter((t) => t.updatedAt <= cursor)
        .reduce((s, t) => s + pts(t), 0);
      const ideal = Math.round(totalPoints * (1 - day / totalDays));
      burndown.push({
        date: dateStr,
        ideal,
        remaining: totalPoints - completedByDay,
      });
      cursor.setDate(cursor.getDate() + 1);
      day += 1;
    }

    // Previous sprint velocity
    const prevSprint = await this.sprintModel
      .findOne({
        spaceId: new Types.ObjectId(spaceId),
        number: sprint.number - 1,
      })
      .sort({ number: -1 })
      .exec();

    let previousSprintPoints: number | null = null;
    if (prevSprint) {
      const prevTasks = await this.taskModel
        .find({ sprintId: prevSprint._id, archivedAt: null })
        .exec();
      previousSprintPoints = prevTasks
        .filter((t) => t.status === TaskStatus.Feito)
        .reduce(
          (s, t) =>
            s + (rolledUp.has(t._id.toString()) ? 0 : (t.storyPoints ?? 0)),
          0,
        );
    }

    return {
      totalTasks,
      doneTasks,
      totalPoints,
      donePoints,
      tasksByStatus,
      tasksByAssignee,
      burndown,
      previousSprintPoints,
    };
  }

  /** Soft delete: archive the sprint and its still-active tasks under a shared timestamp. */
  async archive(spaceId: string, sprintId: string): Promise<SprintDocument> {
    const now = new Date();
    const sprintOid = new Types.ObjectId(sprintId);
    const spaceOid = new Types.ObjectId(spaceId);

    const sprint = await this.sprintModel
      .findOneAndUpdate(
        { _id: sprintOid, spaceId: spaceOid, archivedAt: null },
        { archivedAt: now },
        { returnDocument: 'after' },
      )
      .exec();

    if (!sprint) throw new NotFoundException('Sprint not found');

    await this.taskModel
      .updateMany(
        { sprintId: sprintOid, spaceId: spaceOid, archivedAt: null },
        { archivedAt: now },
      )
      .exec();

    return sprint;
  }

  async restore(spaceId: string, sprintId: string): Promise<SprintDocument> {
    const sprintOid = new Types.ObjectId(sprintId);
    const spaceOid = new Types.ObjectId(spaceId);

    const sprint = await this.sprintModel
      .findOne({ _id: sprintOid, spaceId: spaceOid })
      .exec();

    if (!sprint || !sprint.archivedAt) {
      throw new NotFoundException('Archived sprint not found');
    }

    const archivedAt = sprint.archivedAt;
    sprint.archivedAt = null;
    await sprint.save();

    await this.taskModel
      .updateMany(
        { sprintId: sprintOid, spaceId: spaceOid, archivedAt },
        { archivedAt: null },
      )
      .exec();

    return sprint;
  }

  /** Permanently delete an archived sprint and all of its tasks. */
  async permanentRemove(spaceId: string, sprintId: string): Promise<void> {
    const sprintOid = new Types.ObjectId(sprintId);
    const spaceOid = new Types.ObjectId(spaceId);

    const sprint = await this.sprintModel
      .findOne({ _id: sprintOid, spaceId: spaceOid })
      .exec();

    if (!sprint) throw new NotFoundException('Sprint not found');
    if (!sprint.archivedAt) {
      throw new BadRequestException(
        'Sprint must be archived before permanent deletion',
      );
    }

    await this.sprintModel.deleteOne({ _id: sprintOid }).exec();
    await this.taskModel
      .deleteMany({ sprintId: sprintOid, spaceId: spaceOid })
      .exec();
  }

  async findArchivedBySpace(spaceId: string): Promise<SprintDocument[]> {
    return this.sprintModel
      .find({ spaceId: new Types.ObjectId(spaceId), archivedAt: { $ne: null } })
      .sort({ archivedAt: -1 })
      .exec();
  }
}

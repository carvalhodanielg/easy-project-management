import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TaskEvent, TaskEventDocument } from './schemas/task-event.schema';
import { CreateTaskEventDto } from './dto/create-task-event.dto';

@Injectable()
export class TaskEventsService {
  constructor(
    @InjectModel(TaskEvent.name)
    private readonly eventModel: Model<TaskEventDocument>,
  ) {}

  async create(dto: CreateTaskEventDto): Promise<TaskEventDocument> {
    return this.eventModel.create({
      taskId: new Types.ObjectId(dto.taskId),
      spaceId: new Types.ObjectId(dto.spaceId),
      userId: new Types.ObjectId(dto.userId),
      type: dto.type,
      changes: dto.changes ?? null,
    });
  }

  async findByTask(taskId: string, limit = 50): Promise<TaskEventDocument[]> {
    return this.eventModel
      .find({ taskId: new Types.ObjectId(taskId) })
      .populate('userId', 'email displayName avatarUrl')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}

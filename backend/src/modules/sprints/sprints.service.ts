import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sprint, SprintDocument } from './schemas/sprint.schema';
import { CreateSprintDto, UpdateSprintDto } from './dto/create-sprint.dto';

@Injectable()
export class SprintsService {
  constructor(
    @InjectModel(Sprint.name) private readonly sprintModel: Model<SprintDocument>,
  ) {}

  async findBySpace(spaceId: string): Promise<SprintDocument[]> {
    return this.sprintModel
      .find({ spaceId: new Types.ObjectId(spaceId) })
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

  async update(spaceId: string, sprintId: string, dto: UpdateSprintDto): Promise<SprintDocument> {
    const updates: Record<string, unknown> = { ...dto };
    if (dto.startDate) updates.startDate = new Date(dto.startDate);
    if (dto.endDate) updates.endDate = new Date(dto.endDate);

    const sprint = await this.sprintModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(sprintId), spaceId: new Types.ObjectId(spaceId) },
        updates,
        { returnDocument: 'after' },
      )
      .exec();

    if (!sprint) throw new NotFoundException('Sprint not found');
    return sprint;
  }

  async remove(spaceId: string, sprintId: string): Promise<void> {
    const result = await this.sprintModel
      .findOneAndDelete({
        _id: new Types.ObjectId(sprintId),
        spaceId: new Types.ObjectId(spaceId),
      })
      .exec();

    if (!result) throw new NotFoundException('Sprint not found');
  }
}

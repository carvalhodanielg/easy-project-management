import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { List, ListDocument } from './schemas/list.schema';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';
import { CreateListDto, UpdateListDto } from './dto/create-list.dto';

@Injectable()
export class ListsService {
  constructor(
    @InjectModel(List.name) private readonly listModel: Model<ListDocument>,
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
  ) {}

  async findBySpace(spaceId: string): Promise<ListDocument[]> {
    return this.listModel
      .find({ spaceId: new Types.ObjectId(spaceId), archivedAt: null })
      .sort({ position: 1, createdAt: 1 })
      .exec();
  }

  async create(spaceId: string, dto: CreateListDto): Promise<ListDocument> {
    const count = await this.listModel
      .countDocuments({ spaceId: new Types.ObjectId(spaceId) })
      .exec();

    return this.listModel.create({
      spaceId: new Types.ObjectId(spaceId),
      name: dto.name,
      position: dto.position ?? count,
    });
  }

  async update(
    spaceId: string,
    listId: string,
    dto: UpdateListDto,
  ): Promise<ListDocument> {
    const list = await this.listModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(listId),
          spaceId: new Types.ObjectId(spaceId),
        },
        dto,
        { returnDocument: 'after' },
      )
      .exec();

    if (!list) throw new NotFoundException('List not found');
    return list;
  }

  /** Soft delete: archive the list and its still-active tasks under a shared timestamp. */
  async archive(spaceId: string, listId: string): Promise<ListDocument> {
    const now = new Date();
    const listOid = new Types.ObjectId(listId);
    const spaceOid = new Types.ObjectId(spaceId);

    const list = await this.listModel
      .findOneAndUpdate(
        { _id: listOid, spaceId: spaceOid, archivedAt: null },
        { archivedAt: now },
        { returnDocument: 'after' },
      )
      .exec();

    if (!list) throw new NotFoundException('List not found');

    await this.taskModel
      .updateMany(
        { listId: listOid, spaceId: spaceOid, archivedAt: null },
        { archivedAt: now },
      )
      .exec();

    return list;
  }

  async restore(spaceId: string, listId: string): Promise<ListDocument> {
    const listOid = new Types.ObjectId(listId);
    const spaceOid = new Types.ObjectId(spaceId);

    const list = await this.listModel
      .findOne({ _id: listOid, spaceId: spaceOid })
      .exec();

    if (!list || !list.archivedAt) {
      throw new NotFoundException('Archived list not found');
    }

    const archivedAt = list.archivedAt;
    list.archivedAt = null;
    await list.save();

    await this.taskModel
      .updateMany(
        { listId: listOid, spaceId: spaceOid, archivedAt },
        { archivedAt: null },
      )
      .exec();

    return list;
  }

  /** Permanently delete an archived list and all of its tasks. */
  async permanentRemove(spaceId: string, listId: string): Promise<void> {
    const listOid = new Types.ObjectId(listId);
    const spaceOid = new Types.ObjectId(spaceId);

    const list = await this.listModel
      .findOne({ _id: listOid, spaceId: spaceOid })
      .exec();

    if (!list) throw new NotFoundException('List not found');
    if (!list.archivedAt) {
      throw new BadRequestException(
        'List must be archived before permanent deletion',
      );
    }

    await this.listModel.deleteOne({ _id: listOid }).exec();
    await this.taskModel
      .deleteMany({ listId: listOid, spaceId: spaceOid })
      .exec();
  }

  async findArchivedBySpace(spaceId: string): Promise<ListDocument[]> {
    return this.listModel
      .find({ spaceId: new Types.ObjectId(spaceId), archivedAt: { $ne: null } })
      .sort({ archivedAt: -1 })
      .exec();
  }

  async findById(listId: string): Promise<ListDocument> {
    const list = await this.listModel.findById(listId).exec();
    if (!list) throw new NotFoundException('List not found');
    return list;
  }
}

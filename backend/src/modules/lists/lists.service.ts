import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { List, ListDocument } from './schemas/list.schema';
import { CreateListDto, UpdateListDto } from './dto/create-list.dto';

@Injectable()
export class ListsService {
  constructor(
    @InjectModel(List.name) private readonly listModel: Model<ListDocument>,
  ) {}

  async findBySpace(spaceId: string): Promise<ListDocument[]> {
    return this.listModel
      .find({ spaceId: new Types.ObjectId(spaceId) })
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

  async remove(spaceId: string, listId: string): Promise<void> {
    const result = await this.listModel
      .findOneAndDelete({
        _id: new Types.ObjectId(listId),
        spaceId: new Types.ObjectId(spaceId),
      })
      .exec();

    if (!result) throw new NotFoundException('List not found');
  }

  async findById(listId: string): Promise<ListDocument> {
    const list = await this.listModel.findById(listId).exec();
    if (!list) throw new NotFoundException('List not found');
    return list;
  }
}

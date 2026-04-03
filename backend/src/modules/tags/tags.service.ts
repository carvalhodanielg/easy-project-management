import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tag, TagDocument } from './schemas/tag.schema';

export class CreateTagDto {
  name: string;
  color?: string;
}

export class UpdateTagDto {
  name?: string;
  color?: string;
}

@Injectable()
export class TagsService {
  constructor(
    @InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>,
  ) {}

  async findBySpace(spaceId: string): Promise<TagDocument[]> {
    return this.tagModel
      .find({ spaceId: new Types.ObjectId(spaceId) })
      .sort({ name: 1 })
      .exec();
  }

  async create(spaceId: string, dto: CreateTagDto): Promise<TagDocument> {
    const existing = await this.tagModel
      .findOne({ spaceId: new Types.ObjectId(spaceId), name: dto.name })
      .exec();

    if (existing) throw new ConflictException(`Tag "${dto.name}" already exists in this space`);

    return this.tagModel.create({
      spaceId: new Types.ObjectId(spaceId),
      name: dto.name,
      color: dto.color ?? '#888888',
    });
  }

  async update(spaceId: string, tagId: string, dto: UpdateTagDto): Promise<TagDocument> {
    const tag = await this.tagModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(tagId), spaceId: new Types.ObjectId(spaceId) },
        dto,
        { returnDocument: 'after' },
      )
      .exec();

    if (!tag) throw new NotFoundException('Tag not found');
    return tag;
  }

  async remove(
    spaceId: string,
    tagId: string,
    taskModel: Model<unknown>,
  ): Promise<void> {
    const tag = await this.tagModel
      .findOneAndDelete({ _id: new Types.ObjectId(tagId), spaceId: new Types.ObjectId(spaceId) })
      .exec();

    if (!tag) throw new NotFoundException('Tag not found');

    // Cascade: remove tag from all tasks in the space
    await taskModel.updateMany(
      { spaceId: new Types.ObjectId(spaceId) },
      { $pull: { tags: new Types.ObjectId(tagId) } },
    );
  }
}

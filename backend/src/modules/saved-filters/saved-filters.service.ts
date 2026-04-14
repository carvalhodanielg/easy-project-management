import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SavedFilter, SavedFilterDocument } from './schemas/saved-filter.schema';
import { CreateSavedFilterDto } from './dto/create-saved-filter.dto';
import { UpdateSavedFilterDto } from './dto/update-saved-filter.dto';

@Injectable()
export class SavedFiltersService {
  constructor(
    @InjectModel(SavedFilter.name)
    private readonly savedFilterModel: Model<SavedFilterDocument>,
  ) {}

  async findBySpace(spaceId: string): Promise<SavedFilterDocument[]> {
    return this.savedFilterModel
      .find({ spaceId: new Types.ObjectId(spaceId) })
      .sort({ name: 1 })
      .exec();
  }

  async create(
    spaceId: string,
    userId: string,
    dto: CreateSavedFilterDto,
  ): Promise<SavedFilterDocument> {
    return this.savedFilterModel.create({
      spaceId: new Types.ObjectId(spaceId),
      createdBy: new Types.ObjectId(userId),
      name: dto.name,
      filters: dto.filters,
    });
  }

  async update(
    id: string,
    spaceId: string,
    dto: UpdateSavedFilterDto,
  ): Promise<SavedFilterDocument> {
    const doc = await this.savedFilterModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), spaceId: new Types.ObjectId(spaceId) },
        { $set: { name: dto.name } },
        { new: true },
      )
      .exec();

    if (!doc) throw new NotFoundException('Filtro salvo não encontrado');
    return doc;
  }

  async remove(id: string, spaceId: string): Promise<void> {
    const doc = await this.savedFilterModel
      .findOneAndDelete({
        _id: new Types.ObjectId(id),
        spaceId: new Types.ObjectId(spaceId),
      })
      .exec();

    if (!doc) throw new NotFoundException('Filtro salvo não encontrado');
  }
}

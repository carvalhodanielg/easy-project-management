import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Space, SpaceDocument } from './schemas/space.schema';
import {
  SpaceMember,
  SpaceMemberDocument,
  SpaceRole,
} from './schemas/space-member.schema';
import { List, ListDocument } from '../lists/schemas/list.schema';
import { Sprint, SprintDocument } from '../sprints/schemas/sprint.schema';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { AddMemberDto, UpdateMemberRoleDto } from './dto/add-member.dto';

@Injectable()
export class SpacesService {
  constructor(
    @InjectModel(Space.name) private readonly spaceModel: Model<SpaceDocument>,
    @InjectModel(SpaceMember.name)
    private readonly spaceMemberModel: Model<SpaceMemberDocument>,
    @InjectModel(List.name) private readonly listModel: Model<ListDocument>,
    @InjectModel(Sprint.name)
    private readonly sprintModel: Model<SprintDocument>,
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
  ) {}

  async create(dto: CreateSpaceDto, userId: string): Promise<SpaceDocument> {
    const space = await this.spaceModel.create({
      ...dto,
      createdBy: new Types.ObjectId(userId),
    });

    await this.spaceMemberModel.create({
      spaceId: space._id,
      userId: new Types.ObjectId(userId),
      role: SpaceRole.Owner,
    });

    return space;
  }

  async findAllForUser(userId: string): Promise<SpaceDocument[]> {
    const memberships = await this.spaceMemberModel
      .find({ userId: new Types.ObjectId(userId) })
      .select('spaceId')
      .exec();

    const spaceIds = memberships.map((m) => m.spaceId);
    return this.spaceModel
      .find({ _id: { $in: spaceIds }, archivedAt: null })
      .exec();
  }

  async findById(spaceId: string): Promise<SpaceDocument> {
    const space = await this.spaceModel.findById(spaceId).exec();
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }

  async update(spaceId: string, dto: UpdateSpaceDto): Promise<SpaceDocument> {
    const space = await this.spaceModel
      .findByIdAndUpdate(spaceId, dto, { returnDocument: 'after' })
      .exec();
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }

  /**
   * Soft delete: archive the space and cascade-archive its still-active lists,
   * sprints and tasks under a shared `archivedAt`, so `restore` can bring back
   * exactly what this operation archived.
   */
  async archive(spaceId: string): Promise<SpaceDocument> {
    const now = new Date();
    const spaceOid = new Types.ObjectId(spaceId);

    const space = await this.spaceModel
      .findOneAndUpdate(
        { _id: spaceOid, archivedAt: null },
        { archivedAt: now },
        { returnDocument: 'after' },
      )
      .exec();

    if (!space) throw new NotFoundException('Space not found');

    await Promise.all([
      this.listModel
        .updateMany(
          { spaceId: spaceOid, archivedAt: null },
          { archivedAt: now },
        )
        .exec(),
      this.sprintModel
        .updateMany(
          { spaceId: spaceOid, archivedAt: null },
          { archivedAt: now },
        )
        .exec(),
      this.taskModel
        .updateMany(
          { spaceId: spaceOid, archivedAt: null },
          { archivedAt: now },
        )
        .exec(),
    ]);

    return space;
  }

  async restore(spaceId: string): Promise<SpaceDocument> {
    const spaceOid = new Types.ObjectId(spaceId);
    const space = await this.spaceModel.findById(spaceOid).exec();

    if (!space || !space.archivedAt) {
      throw new NotFoundException('Archived space not found');
    }

    const archivedAt = space.archivedAt;
    space.archivedAt = null;
    await space.save();

    await Promise.all([
      this.listModel
        .updateMany({ spaceId: spaceOid, archivedAt }, { archivedAt: null })
        .exec(),
      this.sprintModel
        .updateMany({ spaceId: spaceOid, archivedAt }, { archivedAt: null })
        .exec(),
      this.taskModel
        .updateMany({ spaceId: spaceOid, archivedAt }, { archivedAt: null })
        .exec(),
    ]);

    return space;
  }

  /** Permanently delete an archived space and everything it contains. */
  async permanentRemove(spaceId: string): Promise<void> {
    const spaceOid = new Types.ObjectId(spaceId);
    const space = await this.spaceModel.findById(spaceOid).exec();

    if (!space) throw new NotFoundException('Space not found');
    if (!space.archivedAt) {
      throw new BadRequestException(
        'Space must be archived before permanent deletion',
      );
    }

    await this.spaceModel.deleteOne({ _id: spaceOid }).exec();
    await Promise.all([
      this.spaceMemberModel.deleteMany({ spaceId: spaceOid }).exec(),
      this.listModel.deleteMany({ spaceId: spaceOid }).exec(),
      this.sprintModel.deleteMany({ spaceId: spaceOid }).exec(),
      this.taskModel.deleteMany({ spaceId: spaceOid }).exec(),
    ]);
  }

  async findArchivedForUser(userId: string): Promise<SpaceDocument[]> {
    const memberships = await this.spaceMemberModel
      .find({ userId: new Types.ObjectId(userId) })
      .select('spaceId')
      .exec();

    const spaceIds = memberships.map((m) => m.spaceId);
    return this.spaceModel
      .find({ _id: { $in: spaceIds }, archivedAt: { $ne: null } })
      .sort({ archivedAt: -1 })
      .exec();
  }

  async getMembers(spaceId: string): Promise<SpaceMemberDocument[]> {
    return this.spaceMemberModel
      .find({ spaceId: new Types.ObjectId(spaceId) })
      .populate('userId', 'email displayName avatarUrl')
      .exec();
  }

  async addMember(
    spaceId: string,
    dto: AddMemberDto,
  ): Promise<SpaceMemberDocument> {
    if (dto.role === SpaceRole.Owner) {
      throw new BadRequestException(
        'Cannot assign the owner role directly; use ownership transfer',
      );
    }

    const existing = await this.spaceMemberModel
      .findOne({
        spaceId: new Types.ObjectId(spaceId),
        userId: new Types.ObjectId(dto.userId),
      })
      .exec();

    if (existing)
      throw new ConflictException('User is already a member of this space');

    return this.spaceMemberModel.create({
      spaceId: new Types.ObjectId(spaceId),
      userId: new Types.ObjectId(dto.userId),
      role: dto.role,
    });
  }

  async updateMemberRole(
    spaceId: string,
    userId: string,
    dto: UpdateMemberRoleDto,
  ): Promise<SpaceMemberDocument> {
    if (dto.role === SpaceRole.Owner) {
      throw new BadRequestException(
        'Cannot assign the owner role directly; use ownership transfer',
      );
    }

    const member = await this.spaceMemberModel
      .findOne({
        spaceId: new Types.ObjectId(spaceId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!member) throw new NotFoundException('Member not found');
    if (member.role === SpaceRole.Owner) {
      throw new ForbiddenException(
        "Cannot change the owner's role; use ownership transfer",
      );
    }

    const updated = await this.spaceMemberModel
      .findOneAndUpdate(
        {
          spaceId: new Types.ObjectId(spaceId),
          userId: new Types.ObjectId(userId),
        },
        { role: dto.role },
        { returnDocument: 'after' },
      )
      .exec();

    if (!updated) throw new NotFoundException('Member not found');
    return updated;
  }

  async removeMember(
    spaceId: string,
    userId: string,
    requesterId: string,
  ): Promise<void> {
    if (userId === requesterId) {
      throw new ForbiddenException('Cannot remove yourself from a space');
    }

    const member = await this.spaceMemberModel
      .findOne({
        spaceId: new Types.ObjectId(spaceId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!member) throw new NotFoundException('Member not found');
    if (member.role === SpaceRole.Owner) {
      throw new ForbiddenException('Cannot remove the space owner');
    }

    await this.spaceMemberModel
      .findOneAndDelete({
        spaceId: new Types.ObjectId(spaceId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
  }

  async transferOwnership(
    spaceId: string,
    currentOwnerId: string,
    targetUserId: string,
  ): Promise<void> {
    if (targetUserId === currentOwnerId) {
      throw new BadRequestException('You already own this space');
    }

    const target = await this.spaceMemberModel
      .findOne({
        spaceId: new Types.ObjectId(spaceId),
        userId: new Types.ObjectId(targetUserId),
      })
      .exec();

    if (!target) throw new NotFoundException('Member not found');

    await this.spaceMemberModel
      .updateOne(
        {
          spaceId: new Types.ObjectId(spaceId),
          userId: new Types.ObjectId(targetUserId),
        },
        { role: SpaceRole.Owner },
      )
      .exec();

    await this.spaceMemberModel
      .updateOne(
        {
          spaceId: new Types.ObjectId(spaceId),
          userId: new Types.ObjectId(currentOwnerId),
        },
        { role: SpaceRole.Editor },
      )
      .exec();
  }

  async getUserRole(
    spaceId: string,
    userId: string,
  ): Promise<SpaceRole | null> {
    const member = await this.spaceMemberModel
      .findOne({
        spaceId: new Types.ObjectId(spaceId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    return member?.role ?? null;
  }
}

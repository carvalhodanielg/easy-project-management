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
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { AddMemberDto, UpdateMemberRoleDto } from './dto/add-member.dto';

@Injectable()
export class SpacesService {
  constructor(
    @InjectModel(Space.name) private readonly spaceModel: Model<SpaceDocument>,
    @InjectModel(SpaceMember.name)
    private readonly spaceMemberModel: Model<SpaceMemberDocument>,
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
    return this.spaceModel.find({ _id: { $in: spaceIds } }).exec();
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

  async remove(spaceId: string): Promise<void> {
    const space = await this.spaceModel.findByIdAndDelete(spaceId).exec();
    if (!space) throw new NotFoundException('Space not found');
    await this.spaceMemberModel
      .deleteMany({ spaceId: new Types.ObjectId(spaceId) })
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

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import {
  SpaceMember,
  SpaceMemberDocument,
  SpaceRole,
} from '../../modules/spaces/schemas/space-member.schema';
import type { UserDocument } from '../../modules/users/schemas/user.schema';

@Injectable()
export class SpaceRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(SpaceMember.name)
    private readonly spaceMemberModel: Model<SpaceMemberDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as UserDocument;

    if (!user) throw new ForbiddenException('Not authenticated');

    const spaceId = (request.params as Record<string, string>).spaceId;
    if (!spaceId) return true;

    const member = await this.spaceMemberModel
      .findOne({
        spaceId: new Types.ObjectId(spaceId),
        userId: user._id,
      })
      .exec();

    if (!member)
      throw new NotFoundException('Space not found or access denied');

    const requiredRoles = this.reflector.getAllAndOverride<SpaceRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    if (!requiredRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

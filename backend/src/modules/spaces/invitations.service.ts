import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { Space, SpaceDocument } from './schemas/space.schema';
import {
  SpaceMember,
  SpaceMemberDocument,
} from './schemas/space-member.schema';
import {
  InvitationStatus,
  SpaceInvitation,
  SpaceInvitationDocument,
} from './schemas/space-invitation.schema';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UsersService } from '../users/users.service';
import { MailService } from '../../common/mail/mail.service';
import type { UserDocument } from '../users/schemas/user.schema';

export interface InvitationContext {
  email: string;
  role: string;
  status: InvitationStatus;
  valid: boolean;
  spaceId: string;
  spaceName: string | null;
  inviterName: string | null;
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @InjectModel(SpaceInvitation.name)
    private readonly invitationModel: Model<SpaceInvitationDocument>,
    @InjectModel(SpaceMember.name)
    private readonly memberModel: Model<SpaceMemberDocument>,
    @InjectModel(Space.name)
    private readonly spaceModel: Model<SpaceDocument>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async createInvitation(
    spaceId: string,
    dto: InviteMemberDto,
    inviter: UserDocument,
  ): Promise<{ invitation: SpaceInvitationDocument; inviteUrl: string }> {
    const email = dto.email.toLowerCase().trim();

    const space = await this.spaceModel.findById(spaceId).exec();
    if (!space) throw new NotFoundException('Space not found');

    // Block inviting someone who already has an account and is a member.
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      const member = await this.memberModel
        .findOne({
          spaceId: new Types.ObjectId(spaceId),
          userId: existingUser._id,
        })
        .exec();
      if (member) {
        throw new ConflictException(
          'This user is already a member of this space',
        );
      }
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = this.computeExpiry();

    // Re-issue an existing pending invitation instead of failing on the unique
    // index, so "invite again" simply refreshes the link and expiry.
    const existing = await this.invitationModel
      .findOne({
        spaceId: new Types.ObjectId(spaceId),
        email,
        status: InvitationStatus.Pending,
      })
      .exec();

    let invitation: SpaceInvitationDocument;
    if (existing) {
      existing.token = token;
      existing.expiresAt = expiresAt;
      existing.role = dto.role;
      existing.invitedBy = inviter._id;
      invitation = await existing.save();
    } else {
      invitation = await this.invitationModel.create({
        spaceId: new Types.ObjectId(spaceId),
        email,
        role: dto.role,
        token,
        status: InvitationStatus.Pending,
        expiresAt,
        invitedBy: inviter._id,
      });
    }

    const inviteUrl = this.buildInviteUrl(token);

    try {
      await this.mailService.sendSpaceInvite({
        to: email,
        inviteUrl,
        spaceName: space.name,
        inviterName: inviter.displayName,
      });
    } catch (err) {
      // Delivery is best-effort: the inviter can still copy the returned link.
      this.logger.error(
        `Failed to send invite email to ${email}`,
        err as Error,
      );
    }

    return { invitation, inviteUrl };
  }

  async listInvitations(spaceId: string): Promise<SpaceInvitationDocument[]> {
    return this.invitationModel
      .find({
        spaceId: new Types.ObjectId(spaceId),
        status: InvitationStatus.Pending,
      })
      .populate('invitedBy', 'displayName email avatarUrl')
      .sort({ createdAt: -1 })
      .exec();
  }

  async revokeInvitation(spaceId: string, invitationId: string): Promise<void> {
    const result = await this.invitationModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(invitationId),
          spaceId: new Types.ObjectId(spaceId),
          status: InvitationStatus.Pending,
        },
        { status: InvitationStatus.Revoked },
        { returnDocument: 'after' },
      )
      .exec();

    if (!result) throw new NotFoundException('Pending invitation not found');
  }

  async getInvitationByToken(token: string): Promise<InvitationContext> {
    const invitation = await this.invitationModel.findOne({ token }).exec();
    if (!invitation) throw new NotFoundException('Invitation not found');

    const space = await this.spaceModel
      .findById(invitation.spaceId)
      .exec()
      .catch(() => null);

    let inviterName: string | null = null;
    try {
      const inviter = await this.usersService.findById(
        invitation.invitedBy.toString(),
      );
      inviterName = inviter.displayName;
    } catch {
      inviterName = null;
    }

    return {
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      valid: this.isValid(invitation),
      spaceId: invitation.spaceId.toString(),
      spaceName: space?.name ?? null,
      inviterName,
    };
  }

  async acceptInvitation(
    token: string,
    user: UserDocument,
  ): Promise<SpaceDocument> {
    const invitation = await this.invitationModel.findOne({ token }).exec();
    if (!invitation) throw new NotFoundException('Invitation not found');

    if (invitation.expiresAt.getTime() < Date.now()) {
      if (invitation.status === InvitationStatus.Pending) {
        invitation.status = InvitationStatus.Expired;
        await invitation.save();
      }
      throw new BadRequestException('This invitation has expired');
    }

    if (invitation.status !== InvitationStatus.Pending) {
      throw new BadRequestException('This invitation is no longer valid');
    }

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException(
        'This invitation was sent to a different email address',
      );
    }

    const existingMember = await this.memberModel
      .findOne({ spaceId: invitation.spaceId, userId: user._id })
      .exec();

    if (!existingMember) {
      await this.memberModel.create({
        spaceId: invitation.spaceId,
        userId: user._id,
        role: invitation.role,
      });
    }

    invitation.status = InvitationStatus.Accepted;
    invitation.acceptedBy = user._id;
    await invitation.save();

    const space = await this.spaceModel.findById(invitation.spaceId).exec();
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }

  private isValid(invitation: SpaceInvitationDocument): boolean {
    return (
      invitation.status === InvitationStatus.Pending &&
      invitation.expiresAt.getTime() > Date.now()
    );
  }

  private computeExpiry(): Date {
    const days =
      this.configService.get<number>('invitations.expiresInDays') ?? 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private buildInviteUrl(token: string): string {
    const base =
      this.configService.get<string>('frontendUrl') ?? 'http://localhost:5173';
    return `${base.replace(/\/$/, '')}/invite/accept?token=${token}`;
  }
}

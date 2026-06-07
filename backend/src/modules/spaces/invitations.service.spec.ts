import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { InvitationsService } from './invitations.service';
import { Space } from './schemas/space.schema';
import { SpaceMember, SpaceRole } from './schemas/space-member.schema';
import {
  InvitationStatus,
  SpaceInvitation,
} from './schemas/space-invitation.schema';
import { UsersService } from '../users/users.service';
import { MailService } from '../../common/mail/mail.service';

const spaceId = new Types.ObjectId().toString();
const inviterId = new Types.ObjectId().toString();

const mockSpace = { _id: new Types.ObjectId(spaceId), name: 'My Space' };
const inviter = {
  _id: new Types.ObjectId(inviterId),
  displayName: 'Editor',
  email: 'editor@test.com',
};

function execMock<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

const mockInvitationModel = {
  create: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

const mockMemberModel = {
  create: jest.fn(),
  findOne: jest.fn(),
};

const mockSpaceModel = {
  findById: jest.fn(),
};

const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
};

const mockMailService = {
  sendSpaceInvite: jest.fn().mockResolvedValue(undefined),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'frontendUrl') return 'http://localhost:5173';
    if (key === 'invitations.expiresInDays') return 7;
    return undefined;
  }),
};

describe('InvitationsService', () => {
  let service: InvitationsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: getModelToken(SpaceInvitation.name),
          useValue: mockInvitationModel,
        },
        { provide: getModelToken(SpaceMember.name), useValue: mockMemberModel },
        { provide: getModelToken(Space.name), useValue: mockSpaceModel },
        { provide: UsersService, useValue: mockUsersService },
        { provide: MailService, useValue: mockMailService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
  });

  describe('createInvitation', () => {
    it('creates a pending invitation, returns an invite url and sends mail', async () => {
      mockSpaceModel.findById.mockReturnValue(execMock(mockSpace));
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockInvitationModel.findOne.mockReturnValue(execMock(null));
      mockInvitationModel.create.mockImplementation((doc) =>
        Promise.resolve({ ...doc }),
      );

      const result = await service.createInvitation(
        spaceId,
        { email: 'New@Test.com', role: SpaceRole.Viewer },
        inviter as never,
      );

      expect(mockInvitationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@test.com',
          role: SpaceRole.Viewer,
          status: InvitationStatus.Pending,
        }),
      );
      expect(result.inviteUrl).toMatch(
        /^http:\/\/localhost:5173\/invite\/accept\?token=[a-f0-9]+$/,
      );
      expect(mockMailService.sendSpaceInvite).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'new@test.com',
          inviteUrl: result.inviteUrl,
          spaceName: 'My Space',
        }),
      );
    });

    it('throws Conflict when the email already belongs to a member', async () => {
      mockSpaceModel.findById.mockReturnValue(execMock(mockSpace));
      mockUsersService.findByEmail.mockResolvedValue({
        _id: new Types.ObjectId(),
      });
      mockMemberModel.findOne.mockReturnValue(
        execMock({ _id: new Types.ObjectId() }),
      );

      await expect(
        service.createInvitation(
          spaceId,
          { email: 'member@test.com', role: SpaceRole.Editor },
          inviter as never,
        ),
      ).rejects.toThrow(ConflictException);
      expect(mockInvitationModel.create).not.toHaveBeenCalled();
    });

    it('resends (regenerates token) when a pending invitation already exists', async () => {
      const existing = {
        token: 'old-token',
        expiresAt: new Date(0),
        status: InvitationStatus.Pending,
        save: jest.fn().mockImplementation(function (this: unknown) {
          return Promise.resolve(this);
        }),
      };
      mockSpaceModel.findById.mockReturnValue(execMock(mockSpace));
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockInvitationModel.findOne.mockReturnValue(execMock(existing));

      const result = await service.createInvitation(
        spaceId,
        { email: 'pending@test.com', role: SpaceRole.Editor },
        inviter as never,
      );

      expect(mockInvitationModel.create).not.toHaveBeenCalled();
      expect(existing.save).toHaveBeenCalled();
      expect(existing.token).not.toBe('old-token');
      expect(result.inviteUrl).toContain(existing.token);
    });

    it('throws NotFound when the space does not exist', async () => {
      mockSpaceModel.findById.mockReturnValue(execMock(null));
      await expect(
        service.createInvitation(
          spaceId,
          { email: 'x@test.com', role: SpaceRole.Editor },
          inviter as never,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('acceptInvitation', () => {
    const user = {
      _id: new Types.ObjectId(),
      email: 'invitee@test.com',
      displayName: 'Invitee',
    };

    function pendingInvitation(overrides: Record<string, unknown> = {}) {
      return {
        _id: new Types.ObjectId(),
        spaceId: new Types.ObjectId(spaceId),
        email: 'invitee@test.com',
        role: SpaceRole.Viewer,
        status: InvitationStatus.Pending,
        expiresAt: new Date(Date.now() + 86400000),
        save: jest.fn().mockImplementation(function (this: unknown) {
          return Promise.resolve(this);
        }),
        ...overrides,
      };
    }

    it('creates a member and marks the invitation accepted', async () => {
      const invitation = pendingInvitation();
      mockInvitationModel.findOne.mockReturnValue(execMock(invitation));
      mockMemberModel.findOne.mockReturnValue(execMock(null));
      mockMemberModel.create.mockResolvedValue({ _id: new Types.ObjectId() });
      mockSpaceModel.findById.mockReturnValue(execMock(mockSpace));

      const result = await service.acceptInvitation('tok', user as never);

      expect(mockMemberModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: invitation.spaceId,
          userId: user._id,
          role: SpaceRole.Viewer,
        }),
      );
      expect(invitation.status).toBe(InvitationStatus.Accepted);
      expect(invitation.save).toHaveBeenCalled();
      expect(result).toBe(mockSpace);
    });

    it('throws Forbidden when the logged-in email does not match the invite', async () => {
      mockInvitationModel.findOne.mockReturnValue(
        execMock(pendingInvitation({ email: 'someone-else@test.com' })),
      );
      await expect(
        service.acceptInvitation('tok', user as never),
      ).rejects.toThrow(ForbiddenException);
      expect(mockMemberModel.create).not.toHaveBeenCalled();
    });

    it('throws when the invitation is no longer pending', async () => {
      mockInvitationModel.findOne.mockReturnValue(
        execMock(pendingInvitation({ status: InvitationStatus.Revoked })),
      );
      await expect(
        service.acceptInvitation('tok', user as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('marks expired and throws when past expiresAt', async () => {
      const invitation = pendingInvitation({
        expiresAt: new Date(Date.now() - 1000),
      });
      mockInvitationModel.findOne.mockReturnValue(execMock(invitation));
      await expect(
        service.acceptInvitation('tok', user as never),
      ).rejects.toThrow(BadRequestException);
      expect(invitation.status).toBe(InvitationStatus.Expired);
      expect(invitation.save).toHaveBeenCalled();
    });

    it('throws NotFound when the token is unknown', async () => {
      mockInvitationModel.findOne.mockReturnValue(execMock(null));
      await expect(
        service.acceptInvitation('nope', user as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeInvitation', () => {
    it('sets the invitation status to revoked', async () => {
      mockInvitationModel.findOneAndUpdate.mockReturnValue(
        execMock({
          _id: new Types.ObjectId(),
          status: InvitationStatus.Revoked,
        }),
      );
      await expect(
        service.revokeInvitation(spaceId, new Types.ObjectId().toString()),
      ).resolves.toBeUndefined();
    });

    it('throws NotFound when there is no pending invitation to revoke', async () => {
      mockInvitationModel.findOneAndUpdate.mockReturnValue(execMock(null));
      await expect(
        service.revokeInvitation(spaceId, new Types.ObjectId().toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getInvitationByToken', () => {
    it('returns invite context with valid=true for a pending, unexpired invite', async () => {
      mockInvitationModel.findOne.mockReturnValue(
        execMock({
          email: 'invitee@test.com',
          role: SpaceRole.Editor,
          status: InvitationStatus.Pending,
          spaceId: new Types.ObjectId(spaceId),
          invitedBy: new Types.ObjectId(inviterId),
          expiresAt: new Date(Date.now() + 86400000),
        }),
      );
      mockSpaceModel.findById.mockReturnValue(execMock(mockSpace));
      mockUsersService.findById.mockResolvedValue(inviter);

      const result = await service.getInvitationByToken('tok');

      expect(result).toEqual(
        expect.objectContaining({
          email: 'invitee@test.com',
          role: SpaceRole.Editor,
          status: InvitationStatus.Pending,
          valid: true,
          spaceName: 'My Space',
          inviterName: 'Editor',
        }),
      );
    });

    it('throws NotFound for an unknown token', async () => {
      mockInvitationModel.findOne.mockReturnValue(execMock(null));
      await expect(service.getInvitationByToken('nope')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

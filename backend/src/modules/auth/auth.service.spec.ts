import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../../common/mail/mail.service';
import { PasswordReset } from './schemas/password-reset.schema';
import { EmailVerification } from './schemas/email-verification.schema';

const mockUser = {
  _id: { toString: () => 'user-id-1' },
  email: 'test@example.com',
  passwordHash: '',
  displayName: 'Test User',
  emailVerified: false,
};

const mockUsersService = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  updatePassword: jest.fn(),
  markEmailVerified: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(() => 'signed-token'),
};

const mockMailService = {
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'passwordReset.expiresInMinutes') return 60;
    if (key === 'emailVerification.expiresInHours') return 24;
    if (key === 'frontendUrl') return 'http://localhost:5173';
    return undefined;
  }),
};

const mockPasswordResetModel = {
  create: jest.fn(),
  findOne: jest.fn(),
  updateMany: jest.fn(),
};

const mockEmailVerificationModel = {
  create: jest.fn(),
  findOne: jest.fn(),
  updateMany: jest.fn(),
};

function execMock<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Sensible defaults so register()'s verification email path doesn't throw;
    // individual tests override as needed.
    mockEmailVerificationModel.updateMany.mockReturnValue(execMock({}));
    mockEmailVerificationModel.create.mockResolvedValue({});
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: getModelToken(PasswordReset.name),
          useValue: mockPasswordResetModel,
        },
        {
          provide: getModelToken(EmailVerification.name),
          useValue: mockEmailVerificationModel,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('throws ConflictException if email already in use', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
          displayName: 'Test',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user and returns token on success', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'new@example.com',
        password: 'password123',
        displayName: 'New User',
      });

      expect(result).toEqual({ token: 'signed-token' });
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com' }),
      );
    });

    it('hashes the password before storing', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      await service.register({
        email: 'new@example.com',
        password: 'plaintext',
        displayName: 'User',
      });

      const [createArg] = mockUsersService.create.mock.calls[0] as [
        { passwordHash: string },
      ];
      expect(createArg.passwordHash).not.toBe('plaintext');
      const valid = await bcrypt.compare('plaintext', createArg.passwordHash);
      expect(valid).toBe(true);
    });

    it('issues a verification token and emails the verification link', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      await service.register({
        email: 'new@example.com',
        password: 'password123',
        displayName: 'New User',
      });

      expect(mockEmailVerificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser._id,
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      );
      const [emailArg] = mockMailService.sendEmailVerification.mock
        .calls[0] as [{ to: string; verifyUrl: string }];
      expect(emailArg.to).toBe('test@example.com');
      expect(emailArg.verifyUrl).toContain('/verify-email?token=');
    });

    it('still returns a token even if the verification email fails', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      mockMailService.sendEmailVerification.mockRejectedValueOnce(
        new Error('smtp down'),
      );

      const result = await service.register({
        email: 'new@example.com',
        password: 'password123',
        displayName: 'New User',
      });

      expect(result).toEqual({ token: 'signed-token' });
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'no@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      const hash = await bcrypt.hash('correct-pass', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: hash,
      });
      await expect(
        service.login({ email: 'test@example.com', password: 'wrong-pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns token on valid credentials', async () => {
      const hash = await bcrypt.hash('correct-pass', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: hash,
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'correct-pass',
      });

      expect(result).toEqual({ token: 'signed-token' });
    });
  });

  describe('forgotPassword', () => {
    it('does nothing (no token, no email) when the user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('ghost@example.com');

      expect(result).toEqual({ message: expect.any(String) });
      expect(mockPasswordResetModel.create).not.toHaveBeenCalled();
      expect(mockMailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('invalidates old tokens, creates a token, and emails the reset link', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockPasswordResetModel.updateMany.mockReturnValue(execMock({}));
      mockPasswordResetModel.create.mockResolvedValue({});

      await service.forgotPassword('test@example.com');

      expect(mockPasswordResetModel.updateMany).toHaveBeenCalledWith(
        { userId: mockUser._id, usedAt: null },
        expect.objectContaining({ usedAt: expect.any(Date) }),
      );
      expect(mockPasswordResetModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser._id,
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      );
      const [emailArg] = mockMailService.sendPasswordReset.mock.calls[0] as [
        { to: string; resetUrl: string },
      ];
      expect(emailArg.to).toBe('test@example.com');
      expect(emailArg.resetUrl).toContain('/reset-password?token=');
    });

    it('returns the generic message even if email delivery fails', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockPasswordResetModel.updateMany.mockReturnValue(execMock({}));
      mockPasswordResetModel.create.mockResolvedValue({});
      mockMailService.sendPasswordReset.mockRejectedValueOnce(
        new Error('smtp down'),
      );

      const result = await service.forgotPassword('test@example.com');

      expect(result).toEqual({ message: expect.any(String) });
    });
  });

  describe('resetPassword', () => {
    it('throws BadRequestException when token is unknown', async () => {
      mockPasswordResetModel.findOne.mockReturnValue(execMock(null));
      await expect(
        service.resetPassword('nope', 'newpassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when token was already used', async () => {
      mockPasswordResetModel.findOne.mockReturnValue(
        execMock({
          userId: mockUser._id,
          usedAt: new Date(),
          expiresAt: new Date(Date.now() + 60_000),
        }),
      );
      await expect(
        service.resetPassword('used', 'newpassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when token is expired', async () => {
      mockPasswordResetModel.findOne.mockReturnValue(
        execMock({
          userId: mockUser._id,
          usedAt: null,
          expiresAt: new Date(Date.now() - 60_000),
        }),
      );
      await expect(
        service.resetPassword('expired', 'newpassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('hashes the new password, updates the user, and marks the token used', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const reset = {
        userId: mockUser._id,
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        save,
      };
      mockPasswordResetModel.findOne.mockReturnValue(execMock(reset));
      mockUsersService.updatePassword.mockResolvedValue(mockUser);

      await service.resetPassword('valid', 'plaintext-pass');

      const [userId, passwordHash] = mockUsersService.updatePassword.mock
        .calls[0] as [string, string];
      expect(userId).toBe('user-id-1');
      expect(passwordHash).not.toBe('plaintext-pass');
      expect(await bcrypt.compare('plaintext-pass', passwordHash)).toBe(true);
      expect(reset.usedAt).toBeInstanceOf(Date);
      expect(save).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('throws BadRequestException when token is unknown', async () => {
      mockEmailVerificationModel.findOne.mockReturnValue(execMock(null));
      await expect(service.verifyEmail('nope')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when token was already used', async () => {
      mockEmailVerificationModel.findOne.mockReturnValue(
        execMock({
          userId: mockUser._id,
          usedAt: new Date(),
          expiresAt: new Date(Date.now() + 60_000),
        }),
      );
      await expect(service.verifyEmail('used')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when token is expired', async () => {
      mockEmailVerificationModel.findOne.mockReturnValue(
        execMock({
          userId: mockUser._id,
          usedAt: null,
          expiresAt: new Date(Date.now() - 60_000),
        }),
      );
      await expect(service.verifyEmail('expired')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('marks the user verified and the token used', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const verification = {
        userId: mockUser._id,
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        save,
      };
      mockEmailVerificationModel.findOne.mockReturnValue(
        execMock(verification),
      );
      mockUsersService.markEmailVerified.mockResolvedValue(mockUser);

      await service.verifyEmail('valid');

      expect(mockUsersService.markEmailVerified).toHaveBeenCalledWith(
        'user-id-1',
      );
      expect(verification.usedAt).toBeInstanceOf(Date);
      expect(save).toHaveBeenCalled();
    });
  });

  describe('resendVerification', () => {
    it('does nothing when the user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.resendVerification('ghost@example.com');

      expect(result).toEqual({ message: expect.any(String) });
      expect(mockEmailVerificationModel.create).not.toHaveBeenCalled();
      expect(mockMailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('does not reissue when the email is already verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });

      await service.resendVerification('test@example.com');

      expect(mockEmailVerificationModel.create).not.toHaveBeenCalled();
      expect(mockMailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('reissues a token and emails the link for an unverified user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await service.resendVerification('test@example.com');

      expect(mockEmailVerificationModel.updateMany).toHaveBeenCalledWith(
        { userId: mockUser._id, usedAt: null },
        expect.objectContaining({ usedAt: expect.any(Date) }),
      );
      expect(mockEmailVerificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser._id,
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      );
      const [emailArg] = mockMailService.sendEmailVerification.mock
        .calls[0] as [{ to: string; verifyUrl: string }];
      expect(emailArg.verifyUrl).toContain('/verify-email?token=');
    });
  });
});

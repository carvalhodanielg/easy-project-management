import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailService } from '../../common/mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserDocument } from '../users/schemas/user.schema';
import {
  PasswordReset,
  PasswordResetDocument,
} from './schemas/password-reset.schema';
import {
  EmailVerification,
  EmailVerificationDocument,
} from './schemas/email-verification.schema';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';
import {
  InvitationStatus,
  SpaceInvitation,
  SpaceInvitationDocument,
} from '../spaces/schemas/space-invitation.schema';

const SALT_ROUNDS = 10;

// Registration is invite-only. This account is the bootstrap admin (created by
// the seed) and is the only email allowed to register without an invitation.
// Kept in sync with the seed via the same env var + default.
const ADMIN_SEED_EMAIL = (
  process.env.SEED_ADMIN_EMAIL ?? 'admin@teste.com'
).toLowerCase();

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

// Returned regardless of whether the email exists, to avoid leaking which
// addresses have accounts (account enumeration).
const FORGOT_PASSWORD_MESSAGE =
  'Se o e-mail estiver cadastrado, enviaremos instruções para redefinir a senha.';

// Same anti-enumeration stance for resending verification links.
const RESEND_VERIFICATION_MESSAGE =
  'Se o e-mail estiver cadastrado e ainda não verificado, enviaremos um novo link.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    @InjectModel(PasswordReset.name)
    private readonly passwordResetModel: Model<PasswordResetDocument>,
    @InjectModel(EmailVerification.name)
    private readonly emailVerificationModel: Model<EmailVerificationDocument>,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(SpaceInvitation.name)
    private readonly invitationModel: Model<SpaceInvitationDocument>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    await this.assertRegistrationAllowed(dto.email);

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
    });

    // Email verification is opt-in (off by default): an invite link addressed
    // to the email already proves ownership. When enabled, send the link and
    // surface an "unverified" state in the UI.
    if (this.configService.get<boolean>('emailVerification.enabled')) {
      await this.issueEmailVerification(user);
    }

    return this.issueTokens(user);
  }

  // Invite-only gate: registration is allowed only for the bootstrap admin or
  // for an email that has a pending, non-expired space invitation.
  private async assertRegistrationAllowed(email: string): Promise<void> {
    const normalized = email.toLowerCase().trim();
    if (normalized === ADMIN_SEED_EMAIL) return;

    const invitation = await this.invitationModel
      .findOne({
        email: normalized,
        status: InvitationStatus.Pending,
        expiresAt: { $gt: new Date() },
      })
      .exec();

    if (!invitation) {
      throw new ForbiddenException('Cadastro disponível apenas por convite.');
    }
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  // Exchanges a valid, non-revoked, non-expired refresh token for a fresh
  // access token. The refresh token itself stays the same (revocable, no
  // rotation), so the client keeps using it until it expires or logs out.
  async refresh(refreshToken: string): Promise<{ token: string }> {
    const stored = await this.refreshTokenModel
      .findOne({ token: refreshToken })
      .exec();

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(stored.userId.toString());
    return { token: this.signToken(user) };
  }

  // Revokes a refresh token so it can no longer mint access tokens. Idempotent:
  // unknown or already-revoked tokens succeed silently (no enumeration signal).
  async logout(refreshToken: string): Promise<{ message: string }> {
    await this.refreshTokenModel
      .updateOne(
        { token: refreshToken, revokedAt: null },
        { revokedAt: new Date() },
      )
      .exec();

    return { message: 'Sessão encerrada.' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    // Always respond the same way; only actually issue a token if the user
    // exists, so the response never reveals whether the email is registered.
    if (!user) return { message: FORGOT_PASSWORD_MESSAGE };

    // Invalidate any outstanding reset tokens for this user, so only the
    // newest link works.
    await this.passwordResetModel
      .updateMany({ userId: user._id, usedAt: null }, { usedAt: new Date() })
      .exec();

    const token = randomBytes(32).toString('hex');
    await this.passwordResetModel.create({
      userId: user._id,
      token,
      expiresAt: this.computeExpiry(),
    });

    const resetUrl = this.buildResetUrl(token);

    try {
      await this.mailService.sendPasswordReset({ to: user.email, resetUrl });
    } catch (err) {
      // Best-effort delivery: the link is also logged by MailService.
      this.logger.error(
        `Failed to send password reset email to ${user.email}`,
        err as Error,
      );
    }

    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const reset = await this.passwordResetModel.findOne({ token }).exec();

    if (!reset || reset.usedAt || reset.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.usersService.updatePassword(
      reset.userId.toString(),
      passwordHash,
    );

    reset.usedAt = new Date();
    await reset.save();

    return { message: 'Senha redefinida com sucesso.' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const verification = await this.emailVerificationModel
      .findOne({ token })
      .exec();

    if (
      !verification ||
      verification.usedAt ||
      verification.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.usersService.markEmailVerified(verification.userId.toString());

    verification.usedAt = new Date();
    await verification.save();

    return { message: 'E-mail verificado com sucesso.' };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    // Always respond the same way; only reissue when there is an unverified
    // account, so the response never reveals whether the email is registered.
    if (user && !user.emailVerified) {
      await this.issueEmailVerification(user);
    }

    return { message: RESEND_VERIFICATION_MESSAGE };
  }

  // Invalidates any pending verification tokens, issues a fresh one and emails
  // the verification link (best-effort delivery).
  private async issueEmailVerification(user: UserDocument): Promise<void> {
    await this.emailVerificationModel
      .updateMany({ userId: user._id, usedAt: null }, { usedAt: new Date() })
      .exec();

    const token = randomBytes(32).toString('hex');
    await this.emailVerificationModel.create({
      userId: user._id,
      token,
      expiresAt: this.computeVerificationExpiry(),
    });

    const verifyUrl = this.buildVerifyUrl(token);

    try {
      await this.mailService.sendEmailVerification({
        to: user.email,
        verifyUrl,
      });
    } catch (err) {
      // Best-effort delivery: the link is also logged by MailService.
      this.logger.error(
        `Failed to send verification email to ${user.email}`,
        err as Error,
      );
    }
  }

  private computeExpiry(): Date {
    const minutes =
      this.configService.get<number>('passwordReset.expiresInMinutes') ?? 60;
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  private buildResetUrl(token: string): string {
    const base =
      this.configService.get<string>('frontendUrl') ?? 'http://localhost:5173';
    return `${base.replace(/\/$/, '')}/reset-password?token=${token}`;
  }

  private computeVerificationExpiry(): Date {
    const hours =
      this.configService.get<number>('emailVerification.expiresInHours') ?? 24;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  private buildVerifyUrl(token: string): string {
    const base =
      this.configService.get<string>('frontendUrl') ?? 'http://localhost:5173';
    return `${base.replace(/\/$/, '')}/verify-email?token=${token}`;
  }

  // Issues a short-lived access token plus a long-lived, revocable refresh
  // token persisted for the session.
  private async issueTokens(user: UserDocument): Promise<AuthTokens> {
    const refreshToken = await this.createRefreshToken(user);
    return { token: this.signToken(user), refreshToken };
  }

  private async createRefreshToken(user: UserDocument): Promise<string> {
    const token = randomBytes(32).toString('hex');
    await this.refreshTokenModel.create({
      userId: user._id,
      token,
      expiresAt: this.computeRefreshExpiry(),
    });
    return token;
  }

  private computeRefreshExpiry(): Date {
    const days =
      this.configService.get<number>('refreshToken.expiresInDays') ?? 30;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private signToken(user: UserDocument): string {
    return this.jwtService.sign({
      sub: user._id.toString(),
      email: user.email,
    });
  }
}

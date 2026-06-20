import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

const SALT_ROUNDS = 10;

/**
 * Bootstraps a single admin account so an invite-only deployment has someone who
 * can create the first space and invite everyone else.
 *
 * - In development the password falls back to a known default for convenience.
 * - In production no default user is ever created with a public password: the
 *   admin is only seeded when SEED_ADMIN_PASSWORD is explicitly provided.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly usersService: UsersService) {}

  async onApplicationBootstrap() {
    const email = (
      process.env.SEED_ADMIN_EMAIL ?? 'admin@teste.com'
    ).toLowerCase();
    const isProduction = process.env.NODE_ENV === 'production';
    const password =
      process.env.SEED_ADMIN_PASSWORD ??
      (isProduction ? undefined : 'admin123');

    if (!password) {
      this.logger.warn(
        'Skipping admin seed: set SEED_ADMIN_PASSWORD to create the admin in production.',
      );
      return;
    }

    const existing = await this.usersService.findByEmail(email);
    if (existing) return;

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.usersService.create({
      email,
      passwordHash,
      displayName: 'Admin',
    });
    this.logger.log(`Seed admin created: ${email}`);
  }
}

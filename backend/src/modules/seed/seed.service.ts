import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

const SEED_USERS = [
  { email: 'teste-daniel@gmail.com', displayName: 'Daniel (Teste)', password: 'SenhaDo@pp' },
  { email: 'teste-jorgin@gmail.com', displayName: 'Jorgin (Teste)', password: 'SenhaDo@pp' },
];

const SALT_ROUNDS = 10;

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly usersService: UsersService) {}

  async onApplicationBootstrap() {
    for (const seed of SEED_USERS) {
      const existing = await this.usersService.findByEmail(seed.email);
      if (existing) continue;

      const passwordHash = await bcrypt.hash(seed.password, SALT_ROUNDS);
      await this.usersService.create({ email: seed.email, passwordHash, displayName: seed.displayName });
      this.logger.log(`Seed user created: ${seed.email}`);
    }
  }
}

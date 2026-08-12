import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async check() {
    const isDatabaseUp = await this.pingDatabase();

    if (!isDatabaseUp) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }

    return { status: 'ok', database: 'up' };
  }

  private async pingDatabase(): Promise<boolean> {
    if (!this.connection.db) {
      return false;
    }

    try {
      await this.connection.db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }
}

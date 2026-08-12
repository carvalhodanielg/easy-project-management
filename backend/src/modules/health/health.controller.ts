import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

// Intentionally has no @UseGuards(JwtAuthGuard): unlike every other controller
// in this project, this route must stay public so infra (Nginx/Docker/uptime
// monitors) can probe it without a JWT. JwtAuthGuard is applied per-controller
// here (not globally via APP_GUARD), so simply omitting it is enough.
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check() {
    return this.healthService.check();
  }
}

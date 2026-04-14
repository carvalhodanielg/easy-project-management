import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TaskEventsService } from './task-events.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SpaceRoleGuard } from '../../common/guards/space-role.guard';
import { ObjectIdValidationPipe } from '../../common/pipes/object-id-validation.pipe';

@Controller('spaces/:spaceId/tasks/:taskId/events')
@UseGuards(JwtAuthGuard, SpaceRoleGuard)
export class TaskEventsController {
  constructor(private readonly taskEventsService: TaskEventsService) {}

  @Get()
  findAll(@Param('taskId', ObjectIdValidationPipe) taskId: string) {
    return this.taskEventsService.findByTask(taskId);
  }
}

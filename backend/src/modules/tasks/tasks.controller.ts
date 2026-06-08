import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksFilterService } from './tasks-filter.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  MoveTaskDto,
  AddDependencyDto,
  BulkMoveDto,
  BulkDuplicateDto,
  BulkPatchDto,
  ConvertToSubtaskDto,
  PromoteToMainTaskDto,
  MoveSubtaskDto,
  DuplicateSubtaskDto,
} from './dto/create-task.dto';
import { TaskFilterQueryDto } from './dto/task-filter-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SpaceRoleGuard } from '../../common/guards/space-role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ObjectIdValidationPipe } from '../../common/pipes/object-id-validation.pipe';
import { SpaceRole } from '../spaces/schemas/space-member.schema';
import type { UserDocument } from '../users/schemas/user.schema';

@Controller('spaces/:spaceId/tasks')
@UseGuards(JwtAuthGuard, SpaceRoleGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly tasksFilterService: TasksFilterService,
  ) {}

  @Get()
  findAll(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Query() query: TaskFilterQueryDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.tasksFilterService.findFiltered(
      spaceId,
      query,
      user._id.toString(),
    );
  }

  @Post()
  @Roles(SpaceRole.Editor)
  create(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.tasksService.create(spaceId, user._id.toString(), dto);
  }

  @Post('bulk-move')
  @Roles(SpaceRole.Editor)
  @HttpCode(HttpStatus.NO_CONTENT)
  bulkMove(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: BulkMoveDto,
  ) {
    return this.tasksService.bulkMove(spaceId, dto.taskIds, dto);
  }

  @Post('bulk-duplicate')
  @Roles(SpaceRole.Editor)
  @HttpCode(HttpStatus.NO_CONTENT)
  bulkDuplicate(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: BulkDuplicateDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.tasksService.bulkDuplicate(
      spaceId,
      dto.taskIds,
      user._id.toString(),
      dto,
    );
  }

  // Unified bulk action endpoint (status / priority / assignees / move / delete).
  // Declared before `@Patch(':taskId')` so the static `bulk` segment wins.
  @Patch('bulk')
  @Roles(SpaceRole.Editor)
  bulkPatch(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: BulkPatchDto,
  ) {
    return this.tasksService.bulkPatch(spaceId, dto);
  }

  @Post('convert-to-subtask')
  @Roles(SpaceRole.Editor)
  @HttpCode(HttpStatus.NO_CONTENT)
  convertToSubtask(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: ConvertToSubtaskDto,
  ) {
    return this.tasksService.convertToSubtask(
      spaceId,
      dto.taskIds,
      dto.parentTaskId,
    );
  }

  @Post('promote-to-main')
  @Roles(SpaceRole.Editor)
  @HttpCode(HttpStatus.NO_CONTENT)
  promoteToMainTask(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: PromoteToMainTaskDto,
  ) {
    return this.tasksService.promoteToMainTask(spaceId, dto.taskIds, dto);
  }

  @Post('move-subtask')
  @Roles(SpaceRole.Editor)
  @HttpCode(HttpStatus.NO_CONTENT)
  moveSubtask(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: MoveSubtaskDto,
  ) {
    return this.tasksService.moveSubtask(
      spaceId,
      dto.taskIds,
      dto.newParentTaskId,
    );
  }

  @Post('duplicate-subtask')
  @Roles(SpaceRole.Editor)
  @HttpCode(HttpStatus.NO_CONTENT)
  duplicateSubtask(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: DuplicateSubtaskDto,
  ) {
    return this.tasksService.duplicateSubtask(
      spaceId,
      dto.taskId,
      dto.newParentTaskId,
    );
  }

  // Static segment — declared before `:taskId` so it isn't parsed as an id.
  @Get('trash')
  findArchived(@Param('spaceId', ObjectIdValidationPipe) spaceId: string) {
    return this.tasksService.findArchivedBySpace(spaceId);
  }

  @Get(':taskId')
  findOne(@Param('taskId', ObjectIdValidationPipe) taskId: string) {
    return this.tasksService.findById(taskId);
  }

  @Patch(':taskId')
  @Roles(SpaceRole.Editor)
  update(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('taskId', ObjectIdValidationPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.tasksService.update(spaceId, taskId, dto, user._id.toString());
  }

  @Patch(':taskId/move')
  @Roles(SpaceRole.Editor)
  move(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('taskId', ObjectIdValidationPipe) taskId: string,
    @Body() dto: MoveTaskDto,
  ) {
    return this.tasksService.move(spaceId, taskId, dto);
  }

  // Soft delete: moves the task (and its subtasks) to the trash.
  @Delete(':taskId')
  @Roles(SpaceRole.Editor)
  archive(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('taskId', ObjectIdValidationPipe) taskId: string,
  ) {
    return this.tasksService.archive(spaceId, taskId);
  }

  @Post(':taskId/restore')
  @Roles(SpaceRole.Editor)
  restore(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('taskId', ObjectIdValidationPipe) taskId: string,
  ) {
    return this.tasksService.restore(spaceId, taskId);
  }

  @Delete(':taskId/permanent')
  @Roles(SpaceRole.Editor)
  @HttpCode(HttpStatus.NO_CONTENT)
  permanentRemove(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('taskId', ObjectIdValidationPipe) taskId: string,
  ) {
    return this.tasksService.permanentRemove(spaceId, taskId);
  }

  @Get(':taskId/subtasks')
  getSubtasks(@Param('taskId', ObjectIdValidationPipe) taskId: string) {
    return this.tasksService.findSubtasks(taskId);
  }

  @Post(':taskId/dependencies')
  @Roles(SpaceRole.Editor)
  addDependency(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('taskId', ObjectIdValidationPipe) taskId: string,
    @Body() dto: AddDependencyDto,
  ) {
    return this.tasksService.addDependency(spaceId, taskId, dto);
  }

  @Delete(':taskId/dependencies/:targetId')
  @Roles(SpaceRole.Editor)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDependency(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('taskId', ObjectIdValidationPipe) taskId: string,
    @Param('targetId', ObjectIdValidationPipe) targetId: string,
  ) {
    return this.tasksService.removeDependency(spaceId, taskId, targetId);
  }
}

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
import { CreateTaskDto, UpdateTaskDto, MoveTaskDto, AddDependencyDto } from './dto/create-task.dto';
import { TaskFilterQueryDto } from './dto/task-filter-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SpaceRoleGuard } from '../../common/guards/space-role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ObjectIdValidationPipe } from '../../common/pipes/object-id-validation.pipe';
import { SpaceRole } from '../spaces/schemas/space-member.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { Types } from 'mongoose';

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
      (user._id as Types.ObjectId).toString(),
    );
  }

  @Post()
  @Roles(SpaceRole.Editor)
  create(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.tasksService.create(spaceId, (user._id as Types.ObjectId).toString(), dto);
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
  ) {
    return this.tasksService.update(spaceId, taskId, dto);
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

  @Delete(':taskId')
  @Roles(SpaceRole.Editor)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('taskId', ObjectIdValidationPipe) taskId: string,
  ) {
    return this.tasksService.remove(spaceId, taskId);
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

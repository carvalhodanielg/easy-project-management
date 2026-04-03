import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SpaceRoleGuard } from '../../common/guards/space-role.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ObjectIdValidationPipe } from '../../common/pipes/object-id-validation.pipe';
import type { UserDocument } from '../users/schemas/user.schema';
import { Types } from 'mongoose';
import { SpacesService } from '../spaces/spaces.service';
import { SpaceRole } from '../spaces/schemas/space-member.schema';
import { TasksService } from '../tasks/tasks.service';

@Controller('spaces/:spaceId/tasks/:taskId/comments')
@UseGuards(JwtAuthGuard, SpaceRoleGuard)
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly tasksService: TasksService,
    private readonly spacesService: SpacesService,
  ) {}

  @Get()
  findAll(@Param('taskId', ObjectIdValidationPipe) taskId: string) {
    return this.commentsService.findByTask(taskId);
  }

  @Post()
  create(
    @Param('taskId', ObjectIdValidationPipe) taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.commentsService.create(
      taskId,
      (user._id as Types.ObjectId).toString(),
      dto,
    );
  }

  @Patch(':commentId')
  update(
    @Param('commentId', ObjectIdValidationPipe) commentId: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.commentsService.update(
      commentId,
      (user._id as Types.ObjectId).toString(),
      dto,
    );
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('commentId', ObjectIdValidationPipe) commentId: string,
    @CurrentUser() user: UserDocument,
  ) {
    const userId = (user._id as Types.ObjectId).toString();
    const role = await this.spacesService.getUserRole(spaceId, userId);
    const isEditor = role === SpaceRole.Editor;

    return this.commentsService.remove(commentId, userId, isEditor);
  }
}

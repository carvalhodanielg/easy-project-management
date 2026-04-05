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
import { NotesService } from './notes.service';
import { CreateNoteDto, UpdateNoteDto } from './dto/create-note.dto';
import { CreateNoteCommentDto, UpdateNoteCommentDto } from './dto/create-note-comment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SpaceRoleGuard } from '../../common/guards/space-role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ObjectIdValidationPipe } from '../../common/pipes/object-id-validation.pipe';
import { SpaceRole } from '../spaces/schemas/space-member.schema';
import { SpacesService } from '../spaces/spaces.service';
import type { UserDocument } from '../users/schemas/user.schema';
import { Types } from 'mongoose';

@Controller('spaces/:spaceId/sprints/:sprintId/notes')
@UseGuards(JwtAuthGuard, SpaceRoleGuard)
export class SprintNotesController {
  constructor(
    private readonly notesService: NotesService,
    private readonly spacesService: SpacesService,
  ) {}

  @Get()
  findAll(@Param('sprintId', ObjectIdValidationPipe) sprintId: string) {
    return this.notesService.findBySprint(sprintId);
  }

  @Post()
  create(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('sprintId', ObjectIdValidationPipe) sprintId: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.notesService.create(
      spaceId,
      sprintId,
      (user._id as Types.ObjectId).toString(),
      dto,
    );
  }
}

@Controller('spaces/:spaceId/notes/:noteId')
@UseGuards(JwtAuthGuard, SpaceRoleGuard)
export class NoteDetailController {
  constructor(
    private readonly notesService: NotesService,
    private readonly spacesService: SpacesService,
  ) {}

  @Get()
  findOne(@Param('noteId', ObjectIdValidationPipe) noteId: string) {
    return this.notesService.findById(noteId);
  }

  @Patch()
  update(
    @Param('noteId', ObjectIdValidationPipe) noteId: string,
    @Body() dto: UpdateNoteDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.notesService.update(
      noteId,
      (user._id as Types.ObjectId).toString(),
      dto,
    );
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('noteId', ObjectIdValidationPipe) noteId: string,
    @CurrentUser() user: UserDocument,
  ) {
    const userId = (user._id as Types.ObjectId).toString();
    const role = await this.spacesService.getUserRole(spaceId, userId);
    return this.notesService.remove(noteId, userId, role === SpaceRole.Editor);
  }

  @Get('comments')
  findComments(@Param('noteId', ObjectIdValidationPipe) noteId: string) {
    return this.notesService.findComments(noteId);
  }

  @Post('comments')
  createComment(
    @Param('noteId', ObjectIdValidationPipe) noteId: string,
    @Body() dto: CreateNoteCommentDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.notesService.createComment(
      noteId,
      (user._id as Types.ObjectId).toString(),
      dto,
    );
  }

  @Patch('comments/:commentId')
  updateComment(
    @Param('commentId', ObjectIdValidationPipe) commentId: string,
    @Body() dto: UpdateNoteCommentDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.notesService.updateComment(
      commentId,
      (user._id as Types.ObjectId).toString(),
      dto,
    );
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeComment(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('commentId', ObjectIdValidationPipe) commentId: string,
    @CurrentUser() user: UserDocument,
  ) {
    const userId = (user._id as Types.ObjectId).toString();
    const role = await this.spacesService.getUserRole(spaceId, userId);
    return this.notesService.removeComment(commentId, userId, role === SpaceRole.Editor);
  }
}

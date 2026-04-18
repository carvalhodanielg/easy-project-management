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
import { SprintFoldersService } from './sprint-folders.service';
import {
  CreateSprintFolderDto,
  UpdateSprintFolderDto,
} from './dto/sprint-folder.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SpaceRoleGuard } from '../../common/guards/space-role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ObjectIdValidationPipe } from '../../common/pipes/object-id-validation.pipe';
import { SpaceRole } from '../spaces/schemas/space-member.schema';

@Controller('spaces/:spaceId/sprint-folders')
@UseGuards(JwtAuthGuard, SpaceRoleGuard)
export class SprintFoldersController {
  constructor(private readonly sprintFoldersService: SprintFoldersService) {}

  @Get()
  findAll(@Param('spaceId', ObjectIdValidationPipe) spaceId: string) {
    return this.sprintFoldersService.findBySpace(spaceId);
  }

  @Get(':folderId')
  findOne(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('folderId', ObjectIdValidationPipe) folderId: string,
  ) {
    return this.sprintFoldersService.findById(spaceId, folderId);
  }

  @Post()
  @Roles(SpaceRole.Editor)
  create(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: CreateSprintFolderDto,
  ) {
    return this.sprintFoldersService.create(spaceId, dto);
  }

  @Patch(':folderId')
  @Roles(SpaceRole.Editor)
  update(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('folderId', ObjectIdValidationPipe) folderId: string,
    @Body() dto: UpdateSprintFolderDto,
  ) {
    return this.sprintFoldersService.update(spaceId, folderId, dto);
  }

  @Delete(':folderId')
  @Roles(SpaceRole.Editor)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('folderId', ObjectIdValidationPipe) folderId: string,
  ) {
    return this.sprintFoldersService.remove(spaceId, folderId);
  }
}

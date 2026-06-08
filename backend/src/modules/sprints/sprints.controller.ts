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
import { SprintsService } from './sprints.service';
import { CreateSprintDto, UpdateSprintDto } from './dto/create-sprint.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SpaceRoleGuard } from '../../common/guards/space-role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ObjectIdValidationPipe } from '../../common/pipes/object-id-validation.pipe';
import { SpaceRole } from '../spaces/schemas/space-member.schema';

@Controller('spaces/:spaceId/sprints')
@UseGuards(JwtAuthGuard, SpaceRoleGuard)
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Get()
  findAll(@Param('spaceId', ObjectIdValidationPipe) spaceId: string) {
    return this.sprintsService.findBySpace(spaceId);
  }

  // Static segment — declared before `:sprintId` so it isn't parsed as an id.
  @Get('trash')
  findArchived(@Param('spaceId', ObjectIdValidationPipe) spaceId: string) {
    return this.sprintsService.findArchivedBySpace(spaceId);
  }

  @Post()
  @Roles(SpaceRole.Editor)
  create(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: CreateSprintDto,
  ) {
    return this.sprintsService.create(spaceId, dto);
  }

  @Get(':sprintId/stats')
  getStats(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('sprintId', ObjectIdValidationPipe) sprintId: string,
  ) {
    return this.sprintsService.getStats(spaceId, sprintId);
  }

  @Get(':sprintId')
  findOne(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('sprintId', ObjectIdValidationPipe) sprintId: string,
  ) {
    return this.sprintsService.findById(spaceId, sprintId);
  }

  @Patch(':sprintId')
  @Roles(SpaceRole.Editor)
  update(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('sprintId', ObjectIdValidationPipe) sprintId: string,
    @Body() dto: UpdateSprintDto,
  ) {
    return this.sprintsService.update(spaceId, sprintId, dto);
  }

  // Soft delete: moves the sprint (and its tasks) to the trash.
  @Delete(':sprintId')
  @Roles(SpaceRole.Editor)
  archive(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('sprintId', ObjectIdValidationPipe) sprintId: string,
  ) {
    return this.sprintsService.archive(spaceId, sprintId);
  }

  @Post(':sprintId/restore')
  @Roles(SpaceRole.Editor)
  restore(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('sprintId', ObjectIdValidationPipe) sprintId: string,
  ) {
    return this.sprintsService.restore(spaceId, sprintId);
  }

  @Delete(':sprintId/permanent')
  @Roles(SpaceRole.Editor)
  @HttpCode(HttpStatus.NO_CONTENT)
  permanentRemove(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('sprintId', ObjectIdValidationPipe) sprintId: string,
  ) {
    return this.sprintsService.permanentRemove(spaceId, sprintId);
  }
}

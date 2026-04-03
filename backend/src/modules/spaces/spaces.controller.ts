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
import { SpacesService } from './spaces.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { AddMemberDto, UpdateMemberRoleDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SpaceRoleGuard } from '../../common/guards/space-role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ObjectIdValidationPipe } from '../../common/pipes/object-id-validation.pipe';
import { SpaceRole } from './schemas/space-member.schema';
import type { UserDocument } from '../users/schemas/user.schema';
import { Types } from 'mongoose';

@Controller('spaces')
@UseGuards(JwtAuthGuard)
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post()
  create(@Body() dto: CreateSpaceDto, @CurrentUser() user: UserDocument) {
    return this.spacesService.create(dto, (user._id as Types.ObjectId).toString());
  }

  @Get()
  findAll(@CurrentUser() user: UserDocument) {
    return this.spacesService.findAllForUser((user._id as Types.ObjectId).toString());
  }

  @Get(':spaceId')
  @UseGuards(SpaceRoleGuard)
  findOne(@Param('spaceId', ObjectIdValidationPipe) spaceId: string) {
    return this.spacesService.findById(spaceId);
  }

  @Patch(':spaceId')
  @UseGuards(SpaceRoleGuard)
  @Roles(SpaceRole.Editor)
  update(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: UpdateSpaceDto,
  ) {
    return this.spacesService.update(spaceId, dto);
  }

  @Delete(':spaceId')
  @UseGuards(SpaceRoleGuard)
  @Roles(SpaceRole.Editor)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('spaceId', ObjectIdValidationPipe) spaceId: string) {
    return this.spacesService.remove(spaceId);
  }

  @Get(':spaceId/members')
  @UseGuards(SpaceRoleGuard)
  getMembers(@Param('spaceId', ObjectIdValidationPipe) spaceId: string) {
    return this.spacesService.getMembers(spaceId);
  }

  @Post(':spaceId/members')
  @UseGuards(SpaceRoleGuard)
  @Roles(SpaceRole.Editor)
  addMember(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.spacesService.addMember(spaceId, dto);
  }

  @Patch(':spaceId/members/:userId')
  @UseGuards(SpaceRoleGuard)
  @Roles(SpaceRole.Editor)
  updateMemberRole(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('userId', ObjectIdValidationPipe) userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.spacesService.updateMemberRole(spaceId, userId, dto);
  }

  @Delete(':spaceId/members/:userId')
  @UseGuards(SpaceRoleGuard)
  @Roles(SpaceRole.Editor)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('userId', ObjectIdValidationPipe) userId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.spacesService.removeMember(
      spaceId,
      userId,
      (user._id as Types.ObjectId).toString(),
    );
  }
}

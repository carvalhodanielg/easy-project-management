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
import { InvitationsService } from './invitations.service';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { AddMemberDto, UpdateMemberRoleDto } from './dto/add-member.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SpaceRoleGuard } from '../../common/guards/space-role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ObjectIdValidationPipe } from '../../common/pipes/object-id-validation.pipe';
import { SpaceRole } from './schemas/space-member.schema';
import type { UserDocument } from '../users/schemas/user.schema';

@Controller('spaces')
@UseGuards(JwtAuthGuard)
export class SpacesController {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly invitationsService: InvitationsService,
  ) {}

  @Post()
  create(@Body() dto: CreateSpaceDto, @CurrentUser() user: UserDocument) {
    return this.spacesService.create(dto, user._id.toString());
  }

  @Get()
  findAll(@CurrentUser() user: UserDocument) {
    return this.spacesService.findAllForUser(user._id.toString());
  }

  @Get(':spaceId')
  @UseGuards(SpaceRoleGuard)
  findOne(@Param('spaceId', ObjectIdValidationPipe) spaceId: string) {
    return this.spacesService.findById(spaceId);
  }

  @Patch(':spaceId')
  @UseGuards(SpaceRoleGuard)
  @Roles(SpaceRole.Owner)
  update(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: UpdateSpaceDto,
  ) {
    return this.spacesService.update(spaceId, dto);
  }

  @Delete(':spaceId')
  @UseGuards(SpaceRoleGuard)
  @Roles(SpaceRole.Owner)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('spaceId', ObjectIdValidationPipe) spaceId: string) {
    return this.spacesService.remove(spaceId);
  }

  @Post(':spaceId/transfer-ownership')
  @UseGuards(SpaceRoleGuard)
  @Roles(SpaceRole.Owner)
  @HttpCode(HttpStatus.OK)
  transferOwnership(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: TransferOwnershipDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.spacesService.transferOwnership(
      spaceId,
      user._id.toString(),
      dto.userId,
    );
  }

  @Get(':spaceId/members')
  @UseGuards(SpaceRoleGuard)
  getMembers(@Param('spaceId', ObjectIdValidationPipe) spaceId: string) {
    return this.spacesService.getMembers(spaceId);
  }

  @Post(':spaceId/members')
  @UseGuards(SpaceRoleGuard)
  @Roles(SpaceRole.Owner)
  addMember(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.spacesService.addMember(spaceId, dto);
  }

  @Get(':spaceId/invitations')
  @UseGuards(SpaceRoleGuard)
  @Roles(SpaceRole.Owner)
  listInvitations(@Param('spaceId', ObjectIdValidationPipe) spaceId: string) {
    return this.invitationsService.listInvitations(spaceId);
  }

  @Post(':spaceId/invitations')
  @UseGuards(SpaceRoleGuard)
  @Roles(SpaceRole.Owner)
  inviteMember(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.invitationsService.createInvitation(spaceId, dto, user);
  }

  @Delete(':spaceId/invitations/:invitationId')
  @UseGuards(SpaceRoleGuard)
  @Roles(SpaceRole.Owner)
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeInvitation(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('invitationId', ObjectIdValidationPipe) invitationId: string,
  ) {
    return this.invitationsService.revokeInvitation(spaceId, invitationId);
  }

  @Patch(':spaceId/members/:userId')
  @UseGuards(SpaceRoleGuard)
  @Roles(SpaceRole.Owner)
  updateMemberRole(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('userId', ObjectIdValidationPipe) userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.spacesService.updateMemberRole(spaceId, userId, dto);
  }

  @Delete(':spaceId/members/:userId')
  @UseGuards(SpaceRoleGuard)
  @Roles(SpaceRole.Owner)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('userId', ObjectIdValidationPipe) userId: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.spacesService.removeMember(
      spaceId,
      userId,
      user._id.toString(),
    );
  }
}

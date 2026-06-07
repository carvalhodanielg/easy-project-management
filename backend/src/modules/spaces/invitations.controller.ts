import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';

/**
 * Token-addressed invitation endpoints. These are not scoped to a space the
 * caller already belongs to, so they live outside SpaceRoleGuard:
 * - GET is public, so the accept page can show context before the user logs in.
 * - POST .../accept requires authentication; the logged-in user joins the space.
 */
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get(':token')
  getByToken(@Param('token') token: string) {
    return this.invitationsService.getInvitationByToken(token);
  }

  @Post(':token/accept')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  accept(@Param('token') token: string, @CurrentUser() user: UserDocument) {
    return this.invitationsService.acceptInvitation(token, user);
  }
}

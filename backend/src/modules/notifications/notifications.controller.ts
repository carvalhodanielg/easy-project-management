import {
  Controller,
  Get,
  Patch,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ObjectIdValidationPipe } from '../../common/pipes/object-id-validation.pipe';
import type { UserDocument } from '../users/schemas/user.schema';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: UserDocument) {
    const userId = user._id.toString();
    return this.notificationsService.findByUser(userId);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: UserDocument) {
    const userId = user._id.toString();
    const count = await this.notificationsService.countUnread(userId);
    return { count };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id', ObjectIdValidationPipe) id: string,
    @CurrentUser() user: UserDocument,
  ) {
    const userId = user._id.toString();
    const notif = await this.notificationsService.markAsRead(id, userId);
    if (!notif) throw new NotFoundException('Notification not found');
    return notif;
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllAsRead(@CurrentUser() user: UserDocument) {
    const userId = user._id.toString();
    return this.notificationsService.markAllAsRead(userId);
  }
}

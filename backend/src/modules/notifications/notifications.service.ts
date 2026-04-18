import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from './schemas/notification.schema';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  message: string;
  taskId?: string;
  spaceId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<NotificationDocument> {
    return this.notificationModel.create({
      userId: new Types.ObjectId(dto.userId),
      type: dto.type,
      message: dto.message,
      taskId: dto.taskId ? new Types.ObjectId(dto.taskId) : null,
      spaceId: dto.spaceId ? new Types.ObjectId(dto.spaceId) : null,
    });
  }

  async findByUser(userId: string): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationModel
      .countDocuments({ userId: new Types.ObjectId(userId), read: false })
      .exec();
  }

  async markAsRead(
    notifId: string,
    userId: string,
  ): Promise<NotificationDocument | null> {
    const notif = await this.notificationModel.findById(notifId).exec();
    if (!notif) return null;
    if (notif.userId.toString() !== userId) return null;

    notif.read = true;
    await notif.save();
    return notif;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const notifs = await this.notificationModel
      .find({ userId: new Types.ObjectId(userId), read: false })
      .exec();
    await Promise.all(
      notifs.map((n) => {
        n.read = true;
        return n.save();
      }),
    );
  }
}

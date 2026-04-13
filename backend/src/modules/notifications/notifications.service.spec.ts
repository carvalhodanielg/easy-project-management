import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationType } from './schemas/notification.schema';

const userId = new Types.ObjectId().toString();
const notifId = new Types.ObjectId().toString();
const taskId = new Types.ObjectId().toString();

const mockNotif = {
  _id: new Types.ObjectId(notifId),
  userId: new Types.ObjectId(userId),
  type: NotificationType.TaskAssigned,
  message: 'Você foi atribuído a uma tarefa',
  taskId: new Types.ObjectId(taskId),
  read: false,
  save: jest.fn(),
};

function execMock<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

function chainMock<T>(value: T) {
  return {
    sort: jest.fn().mockReturnValue(execMock(value)),
  };
}

const mockModel = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  countDocuments: jest.fn(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getModelToken(Notification.name), useValue: mockModel },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('create', () => {
    it('creates a notification and returns it', async () => {
      mockModel.create.mockResolvedValue(mockNotif);
      const result = await service.create({
        userId,
        type: NotificationType.TaskAssigned,
        message: 'Você foi atribuído a uma tarefa',
        taskId,
      });
      expect(result.type).toBe(NotificationType.TaskAssigned);
      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: new Types.ObjectId(userId) }),
      );
    });

    it('creates a notification without taskId', async () => {
      const notifNoTask = { ...mockNotif, taskId: null };
      mockModel.create.mockResolvedValue(notifNoTask);
      const result = await service.create({
        userId,
        type: NotificationType.Mention,
        message: 'Você foi mencionado',
      });
      expect(result.taskId).toBeNull();
    });
  });

  describe('findByUser', () => {
    it('returns notifications for a user sorted by newest first', async () => {
      mockModel.find.mockReturnValue(chainMock([mockNotif]));
      const result = await service.findByUser(userId);
      expect(result).toHaveLength(1);
      expect(mockModel.find).toHaveBeenCalledWith({
        userId: new Types.ObjectId(userId),
      });
    });
  });

  describe('countUnread', () => {
    it('returns count of unread notifications', async () => {
      mockModel.countDocuments.mockReturnValue(execMock(3));
      const result = await service.countUnread(userId);
      expect(result).toBe(3);
      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        userId: new Types.ObjectId(userId),
        read: false,
      });
    });
  });

  describe('markAsRead', () => {
    it('marks a notification as read and returns it', async () => {
      const notif = { ...mockNotif, read: false };
      mockModel.findById.mockReturnValue(execMock(notif));
      const result = await service.markAsRead(notifId, userId);
      expect(notif.save).toHaveBeenCalled();
      expect(result.read).toBe(true);
    });

    it('returns null when notification does not belong to user', async () => {
      const otherId = new Types.ObjectId().toString();
      const notif = { ...mockNotif };
      mockModel.findById.mockReturnValue(execMock(notif));
      const result = await service.markAsRead(notifId, otherId);
      expect(result).toBeNull();
    });

    it('returns null when notification not found', async () => {
      mockModel.findById.mockReturnValue(execMock(null));
      const result = await service.markAsRead(notifId, userId);
      expect(result).toBeNull();
    });
  });

  describe('markAllAsRead', () => {
    it('marks all unread notifications as read for a user', async () => {
      mockModel.find.mockReturnValue(
        execMock([
          { ...mockNotif, read: false, save: jest.fn() },
          { ...mockNotif, read: false, save: jest.fn() },
        ]),
      );
      await service.markAllAsRead(userId);
      expect(mockModel.find).toHaveBeenCalledWith({
        userId: new Types.ObjectId(userId),
        read: false,
      });
    });
  });
});

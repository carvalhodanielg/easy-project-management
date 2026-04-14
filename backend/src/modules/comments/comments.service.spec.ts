import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { CommentsService } from './comments.service';
import { Comment } from './schemas/comment.schema';
import { Task } from '../tasks/schemas/task.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { Types } from 'mongoose';

const mockNotificationsService = { create: jest.fn() };
const mockTaskModel = { findById: jest.fn() };

const authorId = new Types.ObjectId().toString();
const otherId = new Types.ObjectId().toString();
const commentId = new Types.ObjectId().toString();
const taskId = new Types.ObjectId().toString();

const mockComment = {
  _id: new Types.ObjectId(commentId),
  taskId: new Types.ObjectId(taskId),
  author: new Types.ObjectId(authorId),
  content: 'Initial comment',
  attachments: [],
  edited: false,
  save: jest.fn(),
};

function populateMock<T>(value: T) {
  const chain = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
  return chain;
}

const mockCommentModel = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

describe('CommentsService', () => {
  let service: CommentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: getModelToken(Comment.name), useValue: mockCommentModel },
        { provide: getModelToken(Task.name), useValue: mockTaskModel },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    service = module.get<CommentsService>(CommentsService);
  });

  describe('create', () => {
    it('creates a comment and returns it populated', async () => {
      const created = { ...mockComment, _id: new Types.ObjectId() };
      mockCommentModel.create.mockResolvedValue(created);
      mockCommentModel.findById.mockReturnValue(populateMock(created));
      mockTaskModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await service.create(taskId, authorId, { content: 'Hello!' });
      expect(result.content).toBe('Initial comment');
    });

    it('sends Mention notifications to mentioned users (excluding commenter)', async () => {
      const mentionedId1 = new Types.ObjectId().toString();
      const mentionedId2 = new Types.ObjectId().toString();
      const created = { ...mockComment, _id: new Types.ObjectId() };
      mockCommentModel.create.mockResolvedValue(created);
      mockCommentModel.findById.mockReturnValue(populateMock(created));
      mockTaskModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await service.create(taskId, authorId, {
        content: `Olá @pessoa1 e @pessoa2`,
        mentionIds: [mentionedId1, mentionedId2],
      });

      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: mentionedId1, type: 'mention' }),
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: mentionedId2, type: 'mention' }),
      );
    });

    it('does not send Mention notification to the commenter themselves', async () => {
      const created = { ...mockComment, _id: new Types.ObjectId() };
      mockCommentModel.create.mockResolvedValue(created);
      mockCommentModel.findById.mockReturnValue(populateMock(created));
      mockTaskModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await service.create(taskId, authorId, {
        content: `Eu mesmo @me`,
        mentionIds: [authorId],
      });

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('deduplicates mention notifications', async () => {
      const mentionedId = new Types.ObjectId().toString();
      const created = { ...mockComment, _id: new Types.ObjectId() };
      mockCommentModel.create.mockResolvedValue(created);
      mockCommentModel.findById.mockReturnValue(populateMock(created));
      mockTaskModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await service.create(taskId, authorId, {
        content: `@pessoa @pessoa novamente`,
        mentionIds: [mentionedId, mentionedId],
      });

      expect(mockNotificationsService.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when comment not found', async () => {
      mockCommentModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(
        service.update(commentId, authorId, { content: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when non-author tries to edit', async () => {
      const comment = { ...mockComment };
      mockCommentModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(comment) });
      await expect(
        service.update(commentId, otherId, { content: 'Updated' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows author to edit comment', async () => {
      const comment = { ...mockComment };
      mockCommentModel.findById
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(comment) })
        .mockReturnValue(populateMock({ ...comment, content: 'Updated', edited: true }));
      comment.save.mockResolvedValue(comment);

      const result = await service.update(commentId, authorId, { content: 'Updated' });
      expect(result.content).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when comment not found', async () => {
      mockCommentModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.remove(commentId, authorId, false)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when non-author non-editor tries to delete', async () => {
      mockCommentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockComment),
      });
      await expect(service.remove(commentId, otherId, false)).rejects.toThrow(ForbiddenException);
    });

    it('allows author to delete own comment', async () => {
      mockCommentModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockComment) });
      mockCommentModel.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockComment) });
      await expect(service.remove(commentId, authorId, false)).resolves.not.toThrow();
    });

    it('allows editor to delete any comment', async () => {
      mockCommentModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockComment) });
      mockCommentModel.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockComment) });
      await expect(service.remove(commentId, otherId, true)).resolves.not.toThrow();
    });
  });
});

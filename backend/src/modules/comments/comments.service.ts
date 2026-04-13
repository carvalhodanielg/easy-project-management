import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { CreateCommentDto, UpdateCommentDto } from './dto/create-comment.dto';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name)
    private readonly commentModel: Model<CommentDocument>,
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findByTask(taskId: string): Promise<CommentDocument[]> {
    return this.commentModel
      .find({ taskId: new Types.ObjectId(taskId) })
      .populate('author', 'email displayName avatarUrl')
      .populate('attachments')
      .sort({ createdAt: 1 })
      .exec();
  }

  async create(
    taskId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<CommentDocument> {
    const comment = await this.commentModel.create({
      taskId: new Types.ObjectId(taskId),
      author: new Types.ObjectId(userId),
      content: dto.content,
      attachments: (dto.attachments ?? []).map((id) => new Types.ObjectId(id)),
    });

    const populated = await this.commentModel
      .findById(comment._id)
      .populate('author', 'email displayName avatarUrl')
      .populate('attachments')
      .exec() as CommentDocument;

    // Notify task assignees about the new comment (excluding commenter)
    const task = await this.taskModel.findById(taskId).exec();
    if (task) {
      const recipients = (task.assignees as Types.ObjectId[])
        .map((id) => id.toString())
        .filter((id) => id !== userId);

      await Promise.all(
        recipients.map((recipientId) =>
          this.notificationsService.create({
            userId: recipientId,
            type: NotificationType.CommentAdded,
            message: `Novo comentário na tarefa "${task.name}"`,
            taskId,
          }),
        ),
      );
    }

    return populated;
  }

  async update(
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
  ): Promise<CommentDocument> {
    const comment = await this.commentModel.findById(commentId).exec();
    if (!comment) throw new NotFoundException('Comment not found');

    if ((comment.author as Types.ObjectId).toString() !== userId) {
      throw new ForbiddenException('Only the author can edit this comment');
    }

    comment.content = dto.content;
    comment.edited = true;
    await comment.save();

    return this.commentModel
      .findById(commentId)
      .populate('author', 'email displayName avatarUrl')
      .populate('attachments')
      .exec() as Promise<CommentDocument>;
  }

  async remove(commentId: string, userId: string, isEditor: boolean): Promise<void> {
    const comment = await this.commentModel.findById(commentId).exec();
    if (!comment) throw new NotFoundException('Comment not found');

    const isAuthor = (comment.author as Types.ObjectId).toString() === userId;
    if (!isAuthor && !isEditor) {
      throw new ForbiddenException('Cannot delete this comment');
    }

    await this.commentModel.findByIdAndDelete(commentId).exec();
  }
}

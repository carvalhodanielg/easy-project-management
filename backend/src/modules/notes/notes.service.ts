import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Note, NoteDocument } from './schemas/note.schema';
import { NoteComment, NoteCommentDocument } from './schemas/note-comment.schema';
import { CreateNoteDto, UpdateNoteDto } from './dto/create-note.dto';
import { CreateNoteCommentDto, UpdateNoteCommentDto } from './dto/create-note-comment.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectModel(Note.name) private readonly noteModel: Model<NoteDocument>,
    @InjectModel(NoteComment.name) private readonly commentModel: Model<NoteCommentDocument>,
  ) {}

  // ── Notes ────────────────────────────────────────────────────────────────

  async findBySprint(sprintId: string): Promise<NoteDocument[]> {
    return this.noteModel
      .find({ sprintId: new Types.ObjectId(sprintId) })
      .populate('createdBy', 'email displayName avatarUrl')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(noteId: string): Promise<NoteDocument> {
    const note = await this.noteModel
      .findById(noteId)
      .populate('createdBy', 'email displayName avatarUrl')
      .exec();
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async create(
    spaceId: string,
    sprintId: string,
    userId: string,
    dto: CreateNoteDto,
  ): Promise<NoteDocument> {
    const note = await this.noteModel.create({
      ...dto,
      spaceId: new Types.ObjectId(spaceId),
      sprintId: new Types.ObjectId(sprintId),
      createdBy: new Types.ObjectId(userId),
    });
    return this.noteModel
      .findById(note._id)
      .populate('createdBy', 'email displayName avatarUrl')
      .exec() as Promise<NoteDocument>;
  }

  async update(noteId: string, userId: string, dto: UpdateNoteDto): Promise<NoteDocument> {
    const note = await this.noteModel.findById(noteId).exec();
    if (!note) throw new NotFoundException('Note not found');
    if ((note.createdBy as Types.ObjectId).toString() !== userId) {
      throw new ForbiddenException('Only the author can edit this note');
    }

    // Build update with only the fields explicitly sent in the request body.
    // Avoids overwriting required fields with `undefined` when class-transformer
    // initialises all DTO properties (useDefineForClassFields=true with ES2023+).
    const patch: Record<string, unknown> = {};
    if (dto.title   !== undefined) patch.title   = dto.title;
    if (dto.content !== undefined) patch.content = dto.content;
    if ('label' in dto)            patch.label   = dto.label; // allow explicit null

    const updated = await this.noteModel
      .findByIdAndUpdate(noteId, { $set: patch }, { returnDocument: 'after' })
      .populate('createdBy', 'email displayName avatarUrl')
      .exec();

    if (!updated) throw new NotFoundException('Note not found');
    return updated as unknown as NoteDocument;
  }

  async remove(noteId: string, userId: string, isEditor: boolean): Promise<void> {
    const note = await this.noteModel.findById(noteId).exec();
    if (!note) throw new NotFoundException('Note not found');
    const isAuthor = (note.createdBy as Types.ObjectId).toString() === userId;
    if (!isAuthor && !isEditor) throw new ForbiddenException('Cannot delete this note');
    await this.noteModel.findByIdAndDelete(noteId).exec();
    await this.commentModel.deleteMany({ noteId: new Types.ObjectId(noteId) }).exec();
  }

  // ── Comments ─────────────────────────────────────────────────────────────

  async findComments(noteId: string): Promise<NoteCommentDocument[]> {
    return this.commentModel
      .find({ noteId: new Types.ObjectId(noteId) })
      .populate('author', 'email displayName avatarUrl')
      .sort({ createdAt: 1 })
      .exec();
  }

  async createComment(
    noteId: string,
    userId: string,
    dto: CreateNoteCommentDto,
  ): Promise<NoteCommentDocument> {
    const noteExists = await this.noteModel.exists({ _id: noteId });
    if (!noteExists) throw new NotFoundException('Note not found');
    const comment = await this.commentModel.create({
      noteId: new Types.ObjectId(noteId),
      author: new Types.ObjectId(userId),
      content: dto.content,
    });
    return this.commentModel
      .findById(comment._id)
      .populate('author', 'email displayName avatarUrl')
      .exec() as Promise<NoteCommentDocument>;
  }

  async updateComment(
    commentId: string,
    userId: string,
    dto: UpdateNoteCommentDto,
  ): Promise<NoteCommentDocument> {
    const comment = await this.commentModel.findById(commentId).exec();
    if (!comment) throw new NotFoundException('Comment not found');
    if ((comment.author as Types.ObjectId).toString() !== userId) {
      throw new ForbiddenException('Only the author can edit this comment');
    }

    const updated = await this.commentModel
      .findByIdAndUpdate(
        commentId,
        { $set: { content: dto.content ?? comment.content, edited: true } },
        { returnDocument: 'after' },
      )
      .populate('author', 'email displayName avatarUrl')
      .exec();

    if (!updated) throw new NotFoundException('Comment not found');
    return updated as unknown as NoteCommentDocument;
  }

  async removeComment(commentId: string, userId: string, isEditor: boolean): Promise<void> {
    const comment = await this.commentModel.findById(commentId).exec();
    if (!comment) throw new NotFoundException('Comment not found');
    const isAuthor = (comment.author as Types.ObjectId).toString() === userId;
    if (!isAuthor && !isEditor) throw new ForbiddenException('Cannot delete this comment');
    await this.commentModel.findByIdAndDelete(commentId).exec();
  }
}

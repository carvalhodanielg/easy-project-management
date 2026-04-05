import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotesService } from './notes.service';
import { Note } from './schemas/note.schema';
import { NoteComment } from './schemas/note-comment.schema';

const userId   = new Types.ObjectId().toString();
const spaceId  = new Types.ObjectId().toString();
const sprintId = new Types.ObjectId().toString();
const noteId   = new Types.ObjectId().toString();

const mockNote = {
  _id: new Types.ObjectId(noteId),
  title: 'Test Note',
  content: '# Hello',
  label: 'ideia',
  spaceId: new Types.ObjectId(spaceId),
  sprintId: new Types.ObjectId(sprintId),
  createdBy: new Types.ObjectId(userId),
  save: jest.fn().mockResolvedValue(undefined),
};

const populateChain = (returnValue: unknown) => ({
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(returnValue),
});

function makeMockModel(findResult: unknown, findByIdResult: unknown) {
  return {
    find: jest.fn().mockReturnValue(populateChain(findResult)),
    findById: jest.fn().mockReturnValue(populateChain(findByIdResult)),
    findByIdAndDelete: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    deleteMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    exists: jest.fn().mockResolvedValue({ _id: 'some-id' }),
    create: jest.fn(),
  };
}

describe('NotesService', () => {
  let service: NotesService;
  let noteModel: ReturnType<typeof makeMockModel>;
  let commentModel: ReturnType<typeof makeMockModel>;

  beforeEach(async () => {
    noteModel    = makeMockModel([mockNote], mockNote);
    commentModel = makeMockModel([], null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        { provide: getModelToken(Note.name),        useValue: noteModel },
        { provide: getModelToken(NoteComment.name), useValue: commentModel },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
  });

  describe('findBySprint', () => {
    it('returns notes for a sprint', async () => {
      const result = await service.findBySprint(sprintId);
      expect(noteModel.find).toHaveBeenCalledWith({ sprintId: new Types.ObjectId(sprintId) });
      expect(result).toEqual([mockNote]);
    });
  });

  describe('findById', () => {
    it('returns a note by id', async () => {
      const result = await service.findById(noteId);
      expect(result).toEqual(mockNote);
    });

    it('throws NotFoundException when note does not exist', async () => {
      noteModel.findById.mockReturnValue(populateChain(null));
      await expect(service.findById(noteId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a note and returns it populated', async () => {
      noteModel.create = jest.fn().mockResolvedValue(mockNote);
      const dto = { title: 'Test Note', content: '# Hello', label: 'ideia' };
      const result = await service.create(spaceId, sprintId, userId, dto);
      expect(noteModel.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Test Note' }));
      expect(result).toEqual(mockNote);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      noteModel.findByIdAndUpdate = jest.fn().mockReturnValue(populateChain(mockNote));
    });

    it('updates a note when user is the author', async () => {
      noteModel.findById.mockReturnValue(populateChain(mockNote));
      const result = await service.update(noteId, userId, { title: 'Updated' });
      expect(noteModel.findByIdAndUpdate).toHaveBeenCalledWith(
        noteId,
        { $set: { title: 'Updated' } },
        { returnDocument: 'after' },
      );
      expect(result).toEqual(mockNote);
    });

    it('only includes defined fields in the patch', async () => {
      noteModel.findById.mockReturnValue(populateChain(mockNote));
      await service.update(noteId, userId, { content: 'new content' });
      const call = noteModel.findByIdAndUpdate.mock.calls[0];
      expect(call[1]).toEqual({ $set: { content: 'new content' } });
      expect(call[1].$set).not.toHaveProperty('title');
    });

    it('throws ForbiddenException when user is not the author', async () => {
      noteModel.findById.mockReturnValue(populateChain(mockNote));
      const otherId = new Types.ObjectId().toString();
      await expect(service.update(noteId, otherId, { title: 'X' })).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when note does not exist', async () => {
      noteModel.findById.mockReturnValue(populateChain(null));
      await expect(service.update(noteId, userId, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes a note when user is the author', async () => {
      noteModel.findById.mockReturnValue(populateChain(mockNote));
      await service.remove(noteId, userId, false);
      expect(noteModel.findByIdAndDelete).toHaveBeenCalledWith(noteId);
      expect(commentModel.deleteMany).toHaveBeenCalled();
    });

    it('removes a note when user is editor (even if not author)', async () => {
      noteModel.findById.mockReturnValue(populateChain(mockNote));
      const otherId = new Types.ObjectId().toString();
      await service.remove(noteId, otherId, true);
      expect(noteModel.findByIdAndDelete).toHaveBeenCalled();
    });

    it('throws ForbiddenException when user is neither author nor editor', async () => {
      noteModel.findById.mockReturnValue(populateChain(mockNote));
      const otherId = new Types.ObjectId().toString();
      await expect(service.remove(noteId, otherId, false)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createComment', () => {
    const commentId = new Types.ObjectId();
    const mockComment = {
      _id: commentId,
      noteId: new Types.ObjectId(noteId),
      author: new Types.ObjectId(userId),
      content: 'Great note!',
    };

    it('creates a comment on an existing note', async () => {
      noteModel.exists = jest.fn().mockResolvedValue({ _id: noteId });
      commentModel.create = jest.fn().mockResolvedValue(mockComment);
      commentModel.findById.mockReturnValue(populateChain(mockComment));
      const result = await service.createComment(noteId, userId, { content: 'Great note!' });
      expect(commentModel.create).toHaveBeenCalledWith(expect.objectContaining({ content: 'Great note!' }));
      expect(result).toEqual(mockComment);
    });

    it('throws NotFoundException when note does not exist', async () => {
      noteModel.exists = jest.fn().mockResolvedValue(null);
      await expect(service.createComment(noteId, userId, { content: 'x' })).rejects.toThrow(NotFoundException);
    });
  });
});

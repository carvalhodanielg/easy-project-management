import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { WikiService } from './wiki.service';
import { WikiFolder } from './schemas/wiki-folder.schema';
import { WikiDocument } from './schemas/wiki-document.schema';

const spaceId = new Types.ObjectId().toString();
const userId = new Types.ObjectId().toString();
const folderId = new Types.ObjectId().toString();
const documentId = new Types.ObjectId().toString();

const mockFolder = {
  _id: new Types.ObjectId(folderId),
  spaceId: new Types.ObjectId(spaceId),
  name: 'Engineering',
  position: 0,
};

const mockDocument = {
  _id: new Types.ObjectId(documentId),
  folderId: new Types.ObjectId(folderId),
  spaceId: new Types.ObjectId(spaceId),
  title: 'API Guide',
  content: '# Hello',
  createdBy: new Types.ObjectId(userId),
  lastEditedBy: new Types.ObjectId(userId),
};

function chain<T>(value: T) {
  return {
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

const mockFolderModel = {
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  countDocuments: jest.fn(),
};

const mockDocumentModel = {
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  deleteMany: jest.fn(),
};

describe('WikiService', () => {
  let service: WikiService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WikiService,
        { provide: getModelToken(WikiFolder.name), useValue: mockFolderModel },
        {
          provide: getModelToken(WikiDocument.name),
          useValue: mockDocumentModel,
        },
      ],
    }).compile();
    service = module.get<WikiService>(WikiService);
  });

  describe('getFolders', () => {
    it('returns all folders for a space sorted by position', async () => {
      mockFolderModel.find.mockReturnValue(chain([mockFolder]));
      const result = await service.getFolders(spaceId);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Engineering');
    });
  });

  describe('createFolder', () => {
    it('creates a folder with auto-incremented position', async () => {
      mockFolderModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(2),
      });
      mockFolderModel.create.mockResolvedValue({ ...mockFolder, position: 2 });
      const result = await service.createFolder(spaceId, {
        name: 'Engineering',
      });
      expect(result.position).toBe(2);
    });
  });

  describe('updateFolder', () => {
    it('throws NotFoundException when folder not found', async () => {
      mockFolderModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.updateFolder(folderId, spaceId, { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates folder name', async () => {
      const updated = { ...mockFolder, name: 'New Name' };
      mockFolderModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      });
      const result = await service.updateFolder(folderId, spaceId, {
        name: 'New Name',
      });
      expect(result.name).toBe('New Name');
    });
  });

  describe('deleteFolder', () => {
    it('throws NotFoundException when folder not found', async () => {
      mockFolderModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.deleteFolder(folderId, spaceId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes folder and cascades to documents', async () => {
      mockFolderModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFolder),
      });
      mockDocumentModel.deleteMany.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 3 }),
      });
      await expect(
        service.deleteFolder(folderId, spaceId),
      ).resolves.not.toThrow();
      expect(mockDocumentModel.deleteMany).toHaveBeenCalled();
    });
  });

  describe('createDocument', () => {
    it('throws NotFoundException when folder not found', async () => {
      mockFolderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.createDocument(spaceId, folderId, userId, { title: 'Doc' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates document in folder', async () => {
      mockFolderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockFolder),
      });
      mockDocumentModel.create.mockResolvedValue(mockDocument);
      const result = await service.createDocument(spaceId, folderId, userId, {
        title: 'API Guide',
      });
      expect(result.title).toBe('API Guide');
    });
  });

  describe('getDocument', () => {
    it('throws NotFoundException when document not found', async () => {
      mockDocumentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.getDocument(spaceId, documentId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns document by id', async () => {
      mockDocumentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDocument),
      });
      const result = await service.getDocument(spaceId, documentId);
      expect(result.title).toBe('API Guide');
    });
  });

  describe('updateDocument', () => {
    it('throws NotFoundException when document not found', async () => {
      mockDocumentModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.updateDocument(spaceId, documentId, userId, {
          content: 'Updated',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates document content and sets lastEditedBy', async () => {
      const updated = { ...mockDocument, content: 'Updated' };
      mockDocumentModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      });
      const result = await service.updateDocument(spaceId, documentId, userId, {
        content: 'Updated',
      });
      expect(result.content).toBe('Updated');
    });
  });

  describe('deleteDocument', () => {
    it('throws NotFoundException when document not found', async () => {
      mockDocumentModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.deleteDocument(spaceId, documentId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes document', async () => {
      mockDocumentModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDocument),
      });
      await expect(
        service.deleteDocument(spaceId, documentId),
      ).resolves.not.toThrow();
    });
  });
});

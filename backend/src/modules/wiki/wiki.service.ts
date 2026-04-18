import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WikiFolder, WikiFolderDocument } from './schemas/wiki-folder.schema';
import {
  WikiDocument,
  WikiDocumentDocument,
} from './schemas/wiki-document.schema';
import { CreateWikiFolderDto } from './dto/create-wiki-folder.dto';
import { CreateWikiDocumentDto } from './dto/create-wiki-document.dto';
import { UpdateWikiDocumentDto } from './dto/update-wiki-document.dto';

@Injectable()
export class WikiService {
  constructor(
    @InjectModel(WikiFolder.name)
    private readonly folderModel: Model<WikiFolderDocument>,
    @InjectModel(WikiDocument.name)
    private readonly documentModel: Model<WikiDocumentDocument>,
  ) {}

  // ─── Folders ────────────────────────────────────────────────────────────────

  async createFolder(
    spaceId: string,
    dto: CreateWikiFolderDto,
  ): Promise<WikiFolderDocument> {
    const position =
      dto.position ??
      (await this.folderModel
        .countDocuments({ spaceId: new Types.ObjectId(spaceId) })
        .exec());
    return this.folderModel.create({
      spaceId: new Types.ObjectId(spaceId),
      name: dto.name,
      position,
    });
  }

  async getFolders(spaceId: string): Promise<WikiFolderDocument[]> {
    return this.folderModel
      .find({ spaceId: new Types.ObjectId(spaceId) })
      .sort({ position: 1 })
      .exec();
  }

  async updateFolder(
    folderId: string,
    spaceId: string,
    dto: Partial<CreateWikiFolderDto>,
  ): Promise<WikiFolderDocument> {
    const folder = await this.folderModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(folderId),
          spaceId: new Types.ObjectId(spaceId),
        },
        dto,
        { returnDocument: 'after' },
      )
      .exec();
    if (!folder) throw new NotFoundException('Wiki folder not found');
    return folder;
  }

  async deleteFolder(folderId: string, spaceId: string): Promise<void> {
    const folder = await this.folderModel
      .findOneAndDelete({
        _id: new Types.ObjectId(folderId),
        spaceId: new Types.ObjectId(spaceId),
      })
      .exec();
    if (!folder) throw new NotFoundException('Wiki folder not found');
    // Cascade delete all documents in this folder
    await this.documentModel
      .deleteMany({ folderId: new Types.ObjectId(folderId) })
      .exec();
  }

  // ─── Documents ──────────────────────────────────────────────────────────────

  async createDocument(
    spaceId: string,
    folderId: string,
    userId: string,
    dto: CreateWikiDocumentDto,
  ): Promise<WikiDocumentDocument> {
    // Verify folder belongs to space
    const folder = await this.folderModel
      .findOne({
        _id: new Types.ObjectId(folderId),
        spaceId: new Types.ObjectId(spaceId),
      })
      .exec();
    if (!folder) throw new NotFoundException('Wiki folder not found');

    return this.documentModel.create({
      folderId: new Types.ObjectId(folderId),
      spaceId: new Types.ObjectId(spaceId),
      title: dto.title,
      content: dto.content ?? '',
      createdBy: new Types.ObjectId(userId),
      lastEditedBy: new Types.ObjectId(userId),
    });
  }

  async getDocumentsByFolder(
    spaceId: string,
    folderId: string,
  ): Promise<WikiDocumentDocument[]> {
    return this.documentModel
      .find({
        folderId: new Types.ObjectId(folderId),
        spaceId: new Types.ObjectId(spaceId),
      })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getDocument(
    spaceId: string,
    documentId: string,
  ): Promise<WikiDocumentDocument> {
    const doc = await this.documentModel
      .findOne({
        _id: new Types.ObjectId(documentId),
        spaceId: new Types.ObjectId(spaceId),
      })
      .exec();
    if (!doc) throw new NotFoundException('Wiki document not found');
    return doc;
  }

  async updateDocument(
    spaceId: string,
    documentId: string,
    userId: string,
    dto: UpdateWikiDocumentDto,
  ): Promise<WikiDocumentDocument> {
    const doc = await this.documentModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(documentId),
          spaceId: new Types.ObjectId(spaceId),
        },
        { ...dto, lastEditedBy: new Types.ObjectId(userId) },
        { returnDocument: 'after' },
      )
      .exec();
    if (!doc) throw new NotFoundException('Wiki document not found');
    return doc;
  }

  async deleteDocument(spaceId: string, documentId: string): Promise<void> {
    const doc = await this.documentModel
      .findOneAndDelete({
        _id: new Types.ObjectId(documentId),
        spaceId: new Types.ObjectId(spaceId),
      })
      .exec();
    if (!doc) throw new NotFoundException('Wiki document not found');
  }
}

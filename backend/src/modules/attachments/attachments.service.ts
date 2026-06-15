import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attachment, AttachmentDocument } from './schemas/attachment.schema';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

@Injectable()
export class AttachmentsService {
  private readonly uploadDest: string;

  constructor(
    @InjectModel(Attachment.name)
    private readonly attachmentModel: Model<AttachmentDocument>,
    private readonly config: ConfigService,
  ) {
    this.uploadDest = this.config.get<string>('uploadDest') ?? './uploads';
    if (!fs.existsSync(this.uploadDest)) {
      fs.mkdirSync(this.uploadDest, { recursive: true });
    }
  }

  async create(
    userId: string,
    file: Express.Multer.File,
  ): Promise<AttachmentDocument> {
    const ext = path.extname(file.originalname);
    const storedName = `${randomUUID()}${ext}`;
    const dest = path.join(this.uploadDest, storedName);
    fs.writeFileSync(dest, file.buffer);

    return this.attachmentModel.create({
      uploadedBy: new Types.ObjectId(userId),
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      url: `/uploads/${storedName}`,
    });
  }

  async remove(userId: string, attachmentId: string): Promise<void> {
    // Owner-scoping: only the uploader can delete their attachment. Scoping the
    // delete (instead of fetch-then-check) means a non-owner gets a 404 and the
    // file on disk is never unlinked.
    const attachment = await this.attachmentModel
      .findOneAndDelete({
        _id: new Types.ObjectId(attachmentId),
        uploadedBy: new Types.ObjectId(userId),
      })
      .exec();

    if (!attachment) throw new NotFoundException('Attachment not found');

    const filePath = path.join(this.uploadDest, attachment.storedName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getUploadDest(): string {
    return this.uploadDest;
  }
}

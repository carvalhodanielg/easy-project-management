import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import * as fs from 'fs';
import { AttachmentsService } from './attachments.service';
import { Attachment } from './schemas/attachment.schema';

jest.mock('fs');

const mockedFs = fs as jest.Mocked<typeof fs>;

const userId = new Types.ObjectId().toString();
const attachmentId = new Types.ObjectId().toString();

const mockAttachmentModel = {
  create: jest.fn(),
  findOneAndDelete: jest.fn(),
};

const mockConfig = { get: jest.fn().mockReturnValue('./uploads') };

function execMock<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

describe('AttachmentsService', () => {
  let service: AttachmentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockedFs.existsSync.mockReturnValue(true);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        {
          provide: getModelToken(Attachment.name),
          useValue: mockAttachmentModel,
        },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get<AttachmentsService>(AttachmentsService);
  });

  describe('remove', () => {
    it('only deletes an attachment owned by the requesting user (owner-scoping)', async () => {
      mockAttachmentModel.findOneAndDelete.mockReturnValue(
        execMock({ storedName: 'abc.png' }),
      );

      await service.remove(userId, attachmentId);

      expect(mockAttachmentModel.findOneAndDelete).toHaveBeenCalledWith(
        expect.objectContaining({ uploadedBy: expect.anything() }),
      );
      expect(mockedFs.unlinkSync).toHaveBeenCalled();
    });

    it("throws NotFoundException and does not unlink when the attachment isn't owned by the user", async () => {
      mockAttachmentModel.findOneAndDelete.mockReturnValue(execMock(null));

      await expect(service.remove(userId, attachmentId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
    });
  });
});

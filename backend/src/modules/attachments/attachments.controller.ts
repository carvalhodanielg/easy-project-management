import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ObjectIdValidationPipe } from '../../common/pipes/object-id-validation.pipe';
import { UserDocument } from '../users/schemas/user.schema';
import { Types } from 'mongoose';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: UserDocument,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.attachmentsService.create(
      (user._id as Types.ObjectId).toString(),
      file,
    );
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('attachmentId', ObjectIdValidationPipe) attachmentId: string) {
    return this.attachmentsService.remove(attachmentId);
  }
}

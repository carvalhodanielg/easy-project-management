import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WikiService } from './wiki.service';
import { CreateWikiFolderDto } from './dto/create-wiki-folder.dto';
import { CreateWikiDocumentDto } from './dto/create-wiki-document.dto';
import { UpdateWikiDocumentDto } from './dto/update-wiki-document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SpaceRoleGuard } from '../../common/guards/space-role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ObjectIdValidationPipe } from '../../common/pipes/object-id-validation.pipe';
import { UserDocument } from '../users/schemas/user.schema';

@UseGuards(JwtAuthGuard, SpaceRoleGuard)
@Controller('spaces/:spaceId/wiki')
export class WikiController {
  constructor(private readonly wikiService: WikiService) {}

  // ─── Folders ────────────────────────────────────────────────────────────────

  @Roles('editor', 'viewer')
  @Get('folders')
  getFolders(@Param('spaceId', ObjectIdValidationPipe) spaceId: string) {
    return this.wikiService.getFolders(spaceId);
  }

  @Roles('editor')
  @Post('folders')
  createFolder(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Body() dto: CreateWikiFolderDto,
  ) {
    return this.wikiService.createFolder(spaceId, dto);
  }

  @Roles('editor')
  @Patch('folders/:folderId')
  updateFolder(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('folderId', ObjectIdValidationPipe) folderId: string,
    @Body() dto: Partial<CreateWikiFolderDto>,
  ) {
    return this.wikiService.updateFolder(folderId, spaceId, dto);
  }

  @Roles('editor')
  @Delete('folders/:folderId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteFolder(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('folderId', ObjectIdValidationPipe) folderId: string,
  ) {
    return this.wikiService.deleteFolder(folderId, spaceId);
  }

  // ─── Documents ──────────────────────────────────────────────────────────────

  @Roles('editor', 'viewer')
  @Get('folders/:folderId/documents')
  getDocuments(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('folderId', ObjectIdValidationPipe) folderId: string,
  ) {
    return this.wikiService.getDocumentsByFolder(spaceId, folderId);
  }

  @Roles('editor')
  @Post('folders/:folderId/documents')
  createDocument(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('folderId', ObjectIdValidationPipe) folderId: string,
    @CurrentUser() user: UserDocument,
    @Body() dto: CreateWikiDocumentDto,
  ) {
    return this.wikiService.createDocument(spaceId, folderId, user._id.toString(), dto);
  }

  @Roles('editor', 'viewer')
  @Get('documents/:documentId')
  getDocument(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('documentId', ObjectIdValidationPipe) documentId: string,
  ) {
    return this.wikiService.getDocument(spaceId, documentId);
  }

  @Roles('editor')
  @Patch('documents/:documentId')
  updateDocument(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('documentId', ObjectIdValidationPipe) documentId: string,
    @CurrentUser() user: UserDocument,
    @Body() dto: UpdateWikiDocumentDto,
  ) {
    return this.wikiService.updateDocument(spaceId, documentId, user._id.toString(), dto);
  }

  @Roles('editor')
  @Delete('documents/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDocument(
    @Param('spaceId', ObjectIdValidationPipe) spaceId: string,
    @Param('documentId', ObjectIdValidationPipe) documentId: string,
  ) {
    return this.wikiService.deleteDocument(spaceId, documentId);
  }
}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WikiFolder, WikiFolderSchema } from './schemas/wiki-folder.schema';
import {
  WikiDocument,
  WikiDocumentSchema,
} from './schemas/wiki-document.schema';
import { WikiService } from './wiki.service';
import { WikiController } from './wiki.controller';
import { SpacesModule } from '../spaces/spaces.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WikiFolder.name, schema: WikiFolderSchema },
      { name: WikiDocument.name, schema: WikiDocumentSchema },
    ]),
    SpacesModule,
  ],
  controllers: [WikiController],
  providers: [WikiService],
})
export class WikiModule {}

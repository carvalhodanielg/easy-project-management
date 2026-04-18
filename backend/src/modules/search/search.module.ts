import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { Note, NoteSchema } from '../notes/schemas/note.schema';
import {
  WikiDocument,
  WikiDocumentSchema,
} from '../wiki/schemas/wiki-document.schema';
import { SpacesModule } from '../spaces/spaces.module';

@Module({
  imports: [
    SpacesModule,
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Note.name, schema: NoteSchema },
      { name: WikiDocument.name, schema: WikiDocumentSchema },
    ]),
  ],
  providers: [SearchService],
  controllers: [SearchController],
})
export class SearchModule {}

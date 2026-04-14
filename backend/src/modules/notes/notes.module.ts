import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Note, NoteSchema } from './schemas/note.schema';
import { NoteComment, NoteCommentSchema } from './schemas/note-comment.schema';
import { NotesService } from './notes.service';
import { SprintNotesController, NoteDetailController } from './notes.controller';
import { SpacesModule } from '../spaces/spaces.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Note.name, schema: NoteSchema },
      { name: NoteComment.name, schema: NoteCommentSchema },
    ]),
    SpacesModule,
    NotificationsModule,
  ],
  controllers: [SprintNotesController, NoteDetailController],
  providers: [NotesService],
})
export class NotesModule {}

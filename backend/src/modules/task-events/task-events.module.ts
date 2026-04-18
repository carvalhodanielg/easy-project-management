import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskEvent, TaskEventSchema } from './schemas/task-event.schema';
import { TaskEventsService } from './task-events.service';
import { TaskEventsController } from './task-events.controller';
import { SpacesModule } from '../spaces/spaces.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TaskEvent.name, schema: TaskEventSchema },
    ]),
    SpacesModule,
  ],
  controllers: [TaskEventsController],
  providers: [TaskEventsService],
  exports: [TaskEventsService],
})
export class TaskEventsModule {}

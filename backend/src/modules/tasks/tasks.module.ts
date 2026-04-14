import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './schemas/task.schema';
import { TasksService } from './tasks.service';
import { TasksFilterService } from './tasks-filter.service';
import { TasksController } from './tasks.controller';
import { SpacesModule } from '../spaces/spaces.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TaskEventsModule } from '../task-events/task-events.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    SpacesModule,
    NotificationsModule,
    TaskEventsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksFilterService],
  exports: [TasksService, TasksFilterService, MongooseModule],
})
export class TasksModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { SprintFolder, SprintFolderSchema } from './schemas/sprint-folder.schema';
import { SprintFoldersService } from './sprint-folders.service';
import { SprintFoldersController } from './sprint-folders.controller';
import { SprintFolderScheduler } from './sprint-folder.scheduler';
import { SpacesModule } from '../spaces/spaces.module';
import { SprintsModule } from '../sprints/sprints.module';
import { Sprint, SprintSchema } from '../sprints/schemas/sprint.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: SprintFolder.name, schema: SprintFolderSchema },
      { name: Sprint.name, schema: SprintSchema },
    ]),
    SpacesModule,
    SprintsModule,
  ],
  controllers: [SprintFoldersController],
  providers: [SprintFoldersService, SprintFolderScheduler],
  exports: [SprintFoldersService],
})
export class SprintFoldersModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SpacesModule } from './modules/spaces/spaces.module';
import { ListsModule } from './modules/lists/lists.module';
import { SprintsModule } from './modules/sprints/sprints.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TagsModule } from './modules/tags/tags.module';
import { CommentsModule } from './modules/comments/comments.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => [
        {
          rootPath: path.resolve(config.get<string>('uploadDest') ?? './uploads'),
          serveRoot: '/uploads',
          serveStaticOptions: { index: false },
        },
      ],
      inject: [ConfigService],
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    SpacesModule,
    ListsModule,
    SprintsModule,
    TasksModule,
    TagsModule,
    CommentsModule,
    AttachmentsModule,
  ],
})
export class AppModule {}

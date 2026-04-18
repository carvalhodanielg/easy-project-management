import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SprintFolder,
  SprintFolderDocument,
} from './schemas/sprint-folder.schema';
import { SprintFoldersService } from './sprint-folders.service';

@Injectable()
export class SprintFolderScheduler {
  private readonly logger = new Logger(SprintFolderScheduler.name);

  constructor(
    @InjectModel(SprintFolder.name)
    private readonly folderModel: Model<SprintFolderDocument>,
    private readonly sprintFoldersService: SprintFoldersService,
  ) {}

  /** Runs every day at midnight UTC */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyMaintenance(): Promise<void> {
    this.logger.log('Running daily sprint folder maintenance…');

    const folders = await this.folderModel.find().exec();

    for (const folder of folders) {
      try {
        await this.sprintFoldersService.autoCompleteExpiredSprints(folder);
        await this.sprintFoldersService.fillOpenSprints(folder);
      } catch (err) {
        this.logger.error(
          `Error processing sprint folder ${folder._id.toString()}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(`Processed ${folders.length} sprint folder(s).`);
  }
}

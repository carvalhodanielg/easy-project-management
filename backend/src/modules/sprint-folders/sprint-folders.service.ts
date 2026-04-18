import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SprintFolder,
  SprintFolderDocument,
  DayOfWeek,
} from './schemas/sprint-folder.schema';
import {
  CreateSprintFolderDto,
  UpdateSprintFolderDto,
} from './dto/sprint-folder.dto';
import {
  Sprint,
  SprintDocument,
  SprintStatus,
} from '../sprints/schemas/sprint.schema';

@Injectable()
export class SprintFoldersService {
  constructor(
    @InjectModel(SprintFolder.name)
    private readonly folderModel: Model<SprintFolderDocument>,
    @InjectModel(Sprint.name)
    private readonly sprintModel: Model<SprintDocument>,
  ) {}

  async findBySpace(spaceId: string): Promise<SprintFolderDocument[]> {
    return this.folderModel
      .find({ spaceId: new Types.ObjectId(spaceId) })
      .sort({ createdAt: 1 })
      .exec();
  }

  async findById(
    spaceId: string,
    folderId: string,
  ): Promise<SprintFolderDocument> {
    const folder = await this.folderModel
      .findOne({
        _id: new Types.ObjectId(folderId),
        spaceId: new Types.ObjectId(spaceId),
      })
      .exec();
    if (!folder) throw new NotFoundException('Sprint folder not found');
    return folder;
  }

  async create(
    spaceId: string,
    dto: CreateSprintFolderDto,
  ): Promise<SprintFolderDocument> {
    const folder = await this.folderModel.create({
      spaceId: new Types.ObjectId(spaceId),
      name: dto.name,
      startDayOfWeek: dto.startDayOfWeek as DayOfWeek,
      durationWeeks: dto.durationWeeks,
      autoComplete: dto.autoComplete,
      openFutureSprints: dto.openFutureSprints,
      folderEndDate: dto.folderEndDate ? new Date(dto.folderEndDate) : null,
    });

    await this.fillOpenSprints(folder);
    return folder;
  }

  async update(
    spaceId: string,
    folderId: string,
    dto: UpdateSprintFolderDto,
  ): Promise<SprintFolderDocument> {
    const updates: Record<string, unknown> = { ...dto };
    if (dto.folderEndDate !== undefined) {
      updates.folderEndDate = dto.folderEndDate
        ? new Date(dto.folderEndDate)
        : null;
    }

    const folder = await this.folderModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(folderId),
          spaceId: new Types.ObjectId(spaceId),
        },
        updates,
        { returnDocument: 'after' },
      )
      .exec();

    if (!folder) throw new NotFoundException('Sprint folder not found');
    return folder;
  }

  async remove(spaceId: string, folderId: string): Promise<void> {
    const result = await this.folderModel
      .findOneAndDelete({
        _id: new Types.ObjectId(folderId),
        spaceId: new Types.ObjectId(spaceId),
      })
      .exec();
    if (!result) throw new NotFoundException('Sprint folder not found');
  }

  // ── Scheduler helpers (also called by SprintFolderScheduler) ──────────────

  /**
   * Mark expired sprints in a folder as completed if folder.autoComplete is true.
   */
  async autoCompleteExpiredSprints(
    folder: SprintFolderDocument,
  ): Promise<void> {
    if (!folder.autoComplete) return;
    const now = new Date();
    await this.sprintModel.updateMany(
      {
        folderId: folder._id,
        endDate: { $lt: now },
        status: { $in: [SprintStatus.Planning, SprintStatus.Active] },
      },
      { $set: { status: SprintStatus.Completed } },
    );
  }

  /**
   * Create sprints until the folder has `openFutureSprints` open sprints.
   */
  async fillOpenSprints(folder: SprintFolderDocument): Promise<void> {
    const now = new Date();

    // Bail out if folder has a hard end date that has already passed
    if (folder.folderEndDate && folder.folderEndDate <= now) return;

    const openCount = await this.sprintModel.countDocuments({
      folderId: folder._id,
      status: { $in: [SprintStatus.Planning, SprintStatus.Active] },
    });

    let toCreate = folder.openFutureSprints - openCount;
    if (toCreate <= 0) return;

    // Find the last sprint in this folder to anchor the next start date and folderNumber
    const lastFolderSprint = await this.sprintModel
      .findOne({ folderId: folder._id })
      .sort({ folderNumber: -1 })
      .exec();

    let nextStart = lastFolderSprint
      ? nextDayAfter(lastFolderSprint.endDate, folder.startDayOfWeek)
      : nextOccurrence(now, folder.startDayOfWeek);

    let nextFolderNumber = (lastFolderSprint?.folderNumber ?? 0) + 1;

    while (toCreate > 0) {
      // Don't create sprints that start after the folder end date
      if (folder.folderEndDate && nextStart >= folder.folderEndDate) break;

      const nextEnd = addDays(nextStart, folder.durationWeeks * 7 - 1);

      const lastSprintInSpace = await this.sprintModel
        .findOne({ spaceId: folder.spaceId })
        .sort({ number: -1 })
        .select('number')
        .exec();
      const number = (lastSprintInSpace?.number ?? 0) + 1;

      await this.sprintModel.create({
        spaceId: folder.spaceId,
        folderId: folder._id,
        number,
        folderNumber: nextFolderNumber,
        name: folder.name,
        startDate: nextStart,
        endDate: nextEnd,
        status: SprintStatus.Planning,
      });

      nextStart = nextDayAfter(nextEnd, folder.startDayOfWeek);
      nextFolderNumber++;
      toCreate--;
    }
  }
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Returns the next occurrence of `dayOfWeek` starting from (but not including) `after`. */
function nextDayAfter(after: Date, dayOfWeek: number): Date {
  const d = new Date(after);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1); // day after
  while (d.getDay() !== dayOfWeek) d.setDate(d.getDate() + 1);
  return d;
}

/** Returns the next occurrence of `dayOfWeek` on or after `from`. */
function nextOccurrence(from: Date, dayOfWeek: number): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  while (d.getDay() !== dayOfWeek) d.setDate(d.getDate() + 1);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

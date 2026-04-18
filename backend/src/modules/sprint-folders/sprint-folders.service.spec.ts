import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { SprintFoldersService } from './sprint-folders.service';
import { SprintFolder } from './schemas/sprint-folder.schema';
import { Sprint, SprintStatus } from '../sprints/schemas/sprint.schema';

const mockId = () => new Types.ObjectId().toString();

function makeFolder(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _id: new Types.ObjectId(),
    spaceId: new Types.ObjectId(),
    name: 'Pasta A',
    startDayOfWeek: 1, // Monday
    durationWeeks: 2,
    autoComplete: false,
    openFutureSprints: 1,
    folderEndDate: null,
    ...overrides,
  };
}

describe('SprintFoldersService', () => {
  let service: SprintFoldersService;

  const sprintModelMock = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
  };

  const folderModelMock = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SprintFoldersService,
        {
          provide: getModelToken(SprintFolder.name),
          useValue: folderModelMock,
        },
        { provide: getModelToken(Sprint.name), useValue: sprintModelMock },
      ],
    }).compile();

    service = module.get<SprintFoldersService>(SprintFoldersService);
  });

  /* ── findBySpace ── */
  describe('findBySpace', () => {
    it('returns folders sorted by createdAt', async () => {
      const folders = [makeFolder(), makeFolder()];
      folderModelMock.find.mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue(folders) }),
      });

      const result = await service.findBySpace(mockId());
      expect(result).toHaveLength(2);
    });
  });

  /* ── findById ── */
  describe('findById', () => {
    it('throws NotFoundException when folder does not exist', async () => {
      folderModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.findById(mockId(), mockId())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the folder when found', async () => {
      const folder = makeFolder();
      folderModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(folder),
      });
      const result = await service.findById(mockId(), mockId());
      expect(result).toEqual(folder);
    });
  });

  /* ── create ── */
  describe('create', () => {
    it('creates a folder and fills open sprints', async () => {
      const folder = makeFolder({ openFutureSprints: 1 });
      folderModelMock.create.mockResolvedValue(folder);

      // fillOpenSprints internals
      sprintModelMock.countDocuments.mockResolvedValue(0); // 0 open sprints
      const sortChain = {
        exec: jest.fn().mockResolvedValue(null),
        select: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      };
      sprintModelMock.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue(sortChain),
      });
      sprintModelMock.create.mockResolvedValue({});

      const dto = {
        name: 'Pasta A',
        startDayOfWeek: 1,
        durationWeeks: 2,
        autoComplete: false,
        openFutureSprints: 1,
        folderEndDate: null,
      };

      const result = await service.create(mockId(), dto);
      expect(folderModelMock.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(folder);
    });
  });

  /* ── update ── */
  describe('update', () => {
    it('throws NotFoundException when folder does not exist', async () => {
      folderModelMock.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(
        service.update(mockId(), mockId(), { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates and returns the folder', async () => {
      const folder = makeFolder({ name: 'Updated' });
      folderModelMock.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(folder),
      });
      const result = await service.update(mockId(), mockId(), {
        name: 'Updated',
      });
      expect(result.name).toBe('Updated');
    });
  });

  /* ── remove ── */
  describe('remove', () => {
    it('throws NotFoundException when folder does not exist', async () => {
      folderModelMock.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.remove(mockId(), mockId())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('resolves without error when folder exists', async () => {
      folderModelMock.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(makeFolder()),
      });
      await expect(service.remove(mockId(), mockId())).resolves.not.toThrow();
    });
  });

  /* ── autoCompleteExpiredSprints ── */
  describe('autoCompleteExpiredSprints', () => {
    it('does nothing when autoComplete is false', async () => {
      const folder = makeFolder({ autoComplete: false }) as any;
      await service.autoCompleteExpiredSprints(folder);
      expect(sprintModelMock.updateMany).not.toHaveBeenCalled();
    });

    it('marks expired sprints as completed when autoComplete is true', async () => {
      const folder = makeFolder({ autoComplete: true }) as any;
      sprintModelMock.updateMany.mockResolvedValue({ modifiedCount: 1 });
      await service.autoCompleteExpiredSprints(folder);
      expect(sprintModelMock.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          folderId: folder._id,
          status: expect.anything(),
        }),
        { $set: { status: SprintStatus.Completed } },
      );
    });
  });

  /* ── fillOpenSprints ── */
  describe('fillOpenSprints', () => {
    it('does nothing when open count already meets the target', async () => {
      const folder = makeFolder({ openFutureSprints: 2 }) as any;
      sprintModelMock.countDocuments.mockResolvedValue(2);
      await service.fillOpenSprints(folder);
      expect(sprintModelMock.create).not.toHaveBeenCalled();
    });

    it('does nothing when folderEndDate has passed', async () => {
      const past = new Date(Date.now() - 86_400_000);
      const folder = makeFolder({
        openFutureSprints: 1,
        folderEndDate: past,
      }) as any;
      sprintModelMock.countDocuments.mockResolvedValue(0);
      await service.fillOpenSprints(folder);
      expect(sprintModelMock.create).not.toHaveBeenCalled();
    });

    it('creates missing sprints to fill target', async () => {
      const folder = makeFolder({ openFutureSprints: 2 }) as any;
      sprintModelMock.countDocuments.mockResolvedValue(0); // 0 open → need 2

      // No existing sprint in folder (for anchor) and no sprint in space (for number)
      const sortChain2 = {
        exec: jest.fn().mockResolvedValue(null),
        select: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      };
      sprintModelMock.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue(sortChain2),
      });
      sprintModelMock.create.mockResolvedValue({});

      await service.fillOpenSprints(folder);
      expect(sprintModelMock.create).toHaveBeenCalledTimes(2);
    });
  });
});

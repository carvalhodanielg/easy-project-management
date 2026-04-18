import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { SavedFiltersService } from './saved-filters.service';
import { SavedFilter } from './schemas/saved-filter.schema';

const spaceId = new Types.ObjectId().toString();
const userId = new Types.ObjectId().toString();
const filterId = new Types.ObjectId().toString();

const mockFilters = {
  status: ['pendente'],
  priority: [],
  assignees: [],
  tags: [],
  q: '',
};

const mockSavedFilter = {
  _id: new Types.ObjectId(filterId),
  spaceId: new Types.ObjectId(spaceId),
  createdBy: new Types.ObjectId(userId),
  name: 'Minhas urgentes',
  filters: mockFilters,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockModel = {
  find: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
};

describe('SavedFiltersService', () => {
  let service: SavedFiltersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedFiltersService,
        { provide: getModelToken(SavedFilter.name), useValue: mockModel },
      ],
    }).compile();
    service = module.get<SavedFiltersService>(SavedFiltersService);
  });

  describe('findBySpace', () => {
    it('returns all saved filters for a space sorted by name', async () => {
      const list = [mockSavedFilter];
      mockModel.find.mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue(list) }),
      });

      const result = await service.findBySpace(spaceId);

      expect(mockModel.find).toHaveBeenCalledWith({
        spaceId: new Types.ObjectId(spaceId),
      });
      expect(result).toEqual(list);
    });
  });

  describe('create', () => {
    it('creates and returns a saved filter', async () => {
      mockModel.create.mockResolvedValue(mockSavedFilter);

      const result = await service.create(spaceId, userId, {
        name: 'Minhas urgentes',
        filters: mockFilters,
      });

      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: new Types.ObjectId(spaceId),
          createdBy: new Types.ObjectId(userId),
          name: 'Minhas urgentes',
          filters: mockFilters,
        }),
      );
      expect(result.name).toBe('Minhas urgentes');
    });
  });

  describe('update', () => {
    it('renames a saved filter that belongs to the space', async () => {
      const updated = { ...mockSavedFilter, name: 'Novo nome' };
      mockModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      });

      const result = await service.update(filterId, spaceId, {
        name: 'Novo nome',
      });

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(filterId),
          spaceId: new Types.ObjectId(spaceId),
        },
        { $set: { name: 'Novo nome' } },
        { new: true },
      );
      expect(result.name).toBe('Novo nome');
    });

    it('throws NotFoundException when filter does not belong to the space', async () => {
      mockModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update(filterId, spaceId, { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes a saved filter that belongs to the space', async () => {
      mockModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSavedFilter),
      });

      await service.remove(filterId, spaceId);

      expect(mockModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: new Types.ObjectId(filterId),
        spaceId: new Types.ObjectId(spaceId),
      });
    });

    it('throws NotFoundException when filter does not belong to the space', async () => {
      mockModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(filterId, spaceId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

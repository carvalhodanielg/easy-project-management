import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ListsService } from './lists.service';
import { List } from './schemas/list.schema';
import { Task } from '../tasks/schemas/task.schema';
import { Types } from 'mongoose';

const spaceId = new Types.ObjectId().toString();
const listId = new Types.ObjectId().toString();

function execMock<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

const mockListModel = {
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  deleteOne: jest.fn(),
};

const mockTaskModel = {
  updateMany: jest.fn(),
  deleteMany: jest.fn(),
};

describe('ListsService', () => {
  let service: ListsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListsService,
        { provide: getModelToken(List.name), useValue: mockListModel },
        { provide: getModelToken(Task.name), useValue: mockTaskModel },
      ],
    }).compile();

    service = module.get<ListsService>(ListsService);
  });

  describe('findBySpace', () => {
    it('excludes archived lists', async () => {
      const sortExec = { sort: jest.fn().mockReturnValue(execMock([])) };
      mockListModel.find.mockReturnValue(sortExec);

      await service.findBySpace(spaceId);

      expect(mockListModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ archivedAt: null }),
      );
    });
  });

  describe('archive', () => {
    it('stamps archivedAt and cascade-archives still-active tasks', async () => {
      const archived = {
        _id: new Types.ObjectId(listId),
        archivedAt: new Date(),
      };
      mockListModel.findOneAndUpdate.mockReturnValue(execMock(archived));
      mockTaskModel.updateMany.mockReturnValue(execMock({}));

      const result = await service.archive(spaceId, listId);

      expect(result).toEqual(archived);
      expect(mockListModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ archivedAt: null }),
        expect.objectContaining({ archivedAt: expect.any(Date) }),
        expect.anything(),
      );
      expect(mockTaskModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          listId: expect.anything(),
          archivedAt: null,
        }),
        expect.objectContaining({ archivedAt: expect.any(Date) }),
      );
    });

    it('throws NotFoundException when list not found or already archived', async () => {
      mockListModel.findOneAndUpdate.mockReturnValue(execMock(null));
      await expect(service.archive(spaceId, listId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('restore', () => {
    it('clears archivedAt and restores tasks archived in the same op', async () => {
      const archivedAt = new Date();
      const save = jest.fn().mockResolvedValue(undefined);
      const list = { _id: new Types.ObjectId(listId), archivedAt, save };
      mockListModel.findOne.mockReturnValue(execMock(list));
      mockTaskModel.updateMany.mockReturnValue(execMock({}));

      await service.restore(spaceId, listId);

      expect(list.archivedAt).toBeNull();
      expect(save).toHaveBeenCalled();
      expect(mockTaskModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ listId: expect.anything(), archivedAt }),
        expect.objectContaining({ archivedAt: null }),
      );
    });

    it('throws NotFoundException when the list is not archived', async () => {
      mockListModel.findOne.mockReturnValue(
        execMock({ _id: new Types.ObjectId(listId), archivedAt: null }),
      );
      await expect(service.restore(spaceId, listId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('permanentRemove', () => {
    it('deletes the archived list and its tasks', async () => {
      mockListModel.findOne.mockReturnValue(
        execMock({ _id: new Types.ObjectId(listId), archivedAt: new Date() }),
      );
      mockListModel.deleteOne.mockReturnValue(execMock({}));
      mockTaskModel.deleteMany.mockReturnValue(execMock({}));

      await service.permanentRemove(spaceId, listId);

      expect(mockListModel.deleteOne).toHaveBeenCalled();
      expect(mockTaskModel.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ listId: expect.anything() }),
      );
    });

    it('throws BadRequestException when the list is not archived', async () => {
      mockListModel.findOne.mockReturnValue(
        execMock({ _id: new Types.ObjectId(listId), archivedAt: null }),
      );
      await expect(service.permanentRemove(spaceId, listId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

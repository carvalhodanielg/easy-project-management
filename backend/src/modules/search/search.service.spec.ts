import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { SearchService } from './search.service';
import { Task } from '../tasks/schemas/task.schema';
import { Note } from '../notes/schemas/note.schema';
import { WikiDocument } from '../wiki/schemas/wiki-document.schema';

const spaceId = new Types.ObjectId().toString();

function makeMockModel(results: unknown[]) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(results),
  };
  return { find: jest.fn().mockReturnValue(chain) };
}

describe('SearchService', () => {
  let service: SearchService;
  let taskModel: ReturnType<typeof makeMockModel>;
  let noteModel: ReturnType<typeof makeMockModel>;
  let wikiModel: ReturnType<typeof makeMockModel>;

  const mockTask = {
    _id: new Types.ObjectId(),
    name: 'Implementar autenticação',
    status: 'pendente',
  };

  const mockNote = {
    _id: new Types.ObjectId(),
    title: 'Nota de planejamento',
    label: 'ideia',
  };

  const mockWiki = {
    _id: new Types.ObjectId(),
    title: 'Guia de instalação',
    folderId: { name: 'Docs' },
  };

  beforeEach(async () => {
    taskModel = makeMockModel([mockTask]);
    noteModel = makeMockModel([mockNote]);
    wikiModel = makeMockModel([mockWiki]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: getModelToken(Task.name),         useValue: taskModel },
        { provide: getModelToken(Note.name),         useValue: noteModel },
        { provide: getModelToken(WikiDocument.name), useValue: wikiModel },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('returns empty results for blank query', async () => {
    const result = await service.search(spaceId, '');
    expect(result).toEqual({ tasks: [], notes: [], wiki: [] });
    expect(taskModel.find).not.toHaveBeenCalled();
  });

  it('returns empty results for single-character query', async () => {
    const result = await service.search(spaceId, 'a');
    expect(result).toEqual({ tasks: [], notes: [], wiki: [] });
  });

  it('searches all three models in parallel for valid query', async () => {
    await service.search(spaceId, 'autenticação');
    expect(taskModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(RegExp) }),
    );
    expect(noteModel.find).toHaveBeenCalled();
    expect(wikiModel.find).toHaveBeenCalled();
  });

  it('returns mapped task results with correct shape', async () => {
    const result = await service.search(spaceId, 'autenticação');
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]).toMatchObject({
      type: 'task',
      title: 'Implementar autenticação',
      subtitle: 'pendente',
      url: expect.stringContaining('/tasks/'),
    });
  });

  it('returns mapped note results with correct shape', async () => {
    const result = await service.search(spaceId, 'planejamento');
    expect(result.notes[0]).toMatchObject({
      type: 'note',
      title: 'Nota de planejamento',
      subtitle: 'ideia',
      url: expect.stringContaining('/notes/'),
    });
  });

  it('returns mapped wiki results with correct shape', async () => {
    const result = await service.search(spaceId, 'instalação');
    expect(result.wiki[0]).toMatchObject({
      type: 'wiki',
      title: 'Guia de instalação',
      subtitle: 'Docs',
      url: expect.stringContaining('/wiki/documents/'),
    });
  });

  it('uses case-insensitive regex', async () => {
    await service.search(spaceId, 'AUTENTICAÇÃO');
    const call = taskModel.find.mock.calls[0][0];
    expect(call.name.flags).toContain('i');
  });

  it('falls back to "nota" subtitle when note label is null', async () => {
    noteModel.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ ...mockNote, label: null }]),
    });
    const result = await service.search(spaceId, 'planejamento');
    expect(result.notes[0].subtitle).toBe('nota');
  });
});

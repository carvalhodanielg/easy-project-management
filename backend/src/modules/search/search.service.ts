import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';
import { Note, NoteDocument } from '../notes/schemas/note.schema';
import {
  WikiDocument as WikiDoc,
  WikiDocumentDocument,
} from '../wiki/schemas/wiki-document.schema';

export interface SearchResultItem {
  _id: string;
  type: 'task' | 'note' | 'wiki';
  title: string;
  subtitle: string;
  url: string;
}

export interface SearchResult {
  tasks: SearchResultItem[];
  notes: SearchResultItem[];
  wiki: SearchResultItem[];
}

const MAX_PER_TYPE = 5;

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    @InjectModel(Note.name) private readonly noteModel: Model<NoteDocument>,
    @InjectModel(WikiDoc.name)
    private readonly wikiModel: Model<WikiDocumentDocument>,
  ) {}

  async search(spaceId: string, q: string): Promise<SearchResult> {
    if (!q || q.trim().length < 2) {
      return { tasks: [], notes: [], wiki: [] };
    }

    // $text uses the per-collection text index (whole-word + stemming) instead
    // of an unindexed $regex scan across every document.
    const text = { $text: { $search: q.trim() } };
    const oid = new Types.ObjectId(spaceId);

    const [tasks, notes, wiki] = await Promise.all([
      this.taskModel
        .find({ spaceId: oid, ...text })
        .select('_id name status sprintId listId')
        .limit(MAX_PER_TYPE)
        .exec(),
      this.noteModel
        .find({ spaceId: oid, ...text })
        .select('_id title label')
        .limit(MAX_PER_TYPE)
        .exec(),
      this.wikiModel
        .find({ spaceId: oid, ...text })
        .select('_id title folderId')
        .populate('folderId', 'name')
        .limit(MAX_PER_TYPE)
        .exec(),
    ]);

    return {
      tasks: tasks.map((t) => ({
        _id: t._id.toString(),
        type: 'task',
        title: t.name,
        subtitle: t.status,
        url: `/spaces/${spaceId}/tasks/${t._id}`,
      })),
      notes: notes.map((n) => ({
        _id: n._id.toString(),
        type: 'note',
        title: n.title,
        subtitle: n.label ?? 'nota',
        url: `/spaces/${spaceId}/notes/${n._id}`,
      })),
      wiki: wiki.map((d) => ({
        _id: d._id.toString(),
        type: 'wiki',
        title: d.title,
        subtitle:
          (d.folderId as unknown as { name: string } | null)?.name ?? 'wiki',
        url: `/spaces/${spaceId}/wiki/documents/${d._id}`,
      })),
    };
  }
}

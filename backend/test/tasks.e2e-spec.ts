import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Task, TaskDocument } from '../src/modules/tasks/schemas/task.schema';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { SpacesModule } from '../src/modules/spaces/spaces.module';
import { ListsModule } from '../src/modules/lists/lists.module';
import { SprintsModule } from '../src/modules/sprints/sprints.module';
import { TasksModule } from '../src/modules/tasks/tasks.module';
import { TagsModule } from '../src/modules/tags/tags.module';
import { MailModule } from '../src/common/mail/mail.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import configuration from '../src/config/configuration';

async function buildApp(uri: string): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
      MongooseModule.forRoot(uri),
      MailModule,
      UsersModule,
      AuthModule,
      SpacesModule,
      ListsModule,
      SprintsModule,
      TasksModule,
      TagsModule,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.init();
  return app;
}

describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let token: string;
  let spaceId: string;
  let listId: string;
  let sprintId: string;
  let taskId: string;
  let subtaskId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    app = await buildApp(mongod.getUri());

    // Ensure the $text index on Task.name is built before any $text query runs,
    // otherwise MongoDB throws "text index required for $text query".
    const taskModel = app.get<Model<TaskDocument>>(getModelToken(Task.name));
    await taskModel.init();

    const reg = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'dev@test.com',
      password: 'password123',
      displayName: 'Dev',
    });
    token = reg.body.data.token as string;

    const space = await request(app.getHttpServer())
      .post('/spaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dev Space' });
    spaceId = space.body.data._id as string;

    const list = await request(app.getHttpServer())
      .post(`/spaces/${spaceId}/lists`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Backlog' });
    listId = list.body.data._id as string;

    const sprint = await request(app.getHttpServer())
      .post(`/spaces/${spaceId}/sprints`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Sprint 1',
        startDate: '2025-01-01',
        endDate: '2025-01-14',
      });
    sprintId = sprint.body.data._id as string;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('POST /spaces/:spaceId/tasks', () => {
    it('creates a task in a list', async () => {
      const res = await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'First Task', listId, storyPoints: 5, priority: 'alta' })
        .expect(201);

      expect(res.body.data).toMatchObject({
        name: 'First Task',
        storyPoints: 5,
      });
      taskId = res.body.data._id as string;
    });

    it('creates a task in a sprint', async () => {
      await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Sprint Task', sprintId, storyPoints: 3 })
        .expect(201);
    });

    it('rejects task with no list or sprint', async () => {
      await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Orphan Task' })
        .expect(400);
    });

    it('rejects non-Fibonacci story points', async () => {
      await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Task', listId, storyPoints: 4 })
        .expect(400);
    });
  });

  describe('GET /spaces/:spaceId/tasks', () => {
    it('returns all root tasks in space', async () => {
      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('filters tasks by listId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks?listId=${listId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      const tasks = res.body.data as { listId: string }[];
      tasks.forEach((t) => expect(t.listId).toBe(listId));
    });

    it('filters tasks by sprintId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks?sprintId=${sprintId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('filters tasks by text search (q) using the $text index', async () => {
      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks?q=Sprint`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const names = (res.body.data as { name: string }[]).map((t) => t.name);
      expect(names).toContain('Sprint Task');
      expect(names).not.toContain('First Task');
    });

    it('returns no matches for a word that is not in any task name', async () => {
      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks?q=nonexistentword`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('GET /spaces/:spaceId/tasks — contextual substring search', () => {
    beforeAll(async () => {
      const parent = await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Amarração de cabos', sprintId });
      const parentId = parent.body.data._id as string;

      // Subtask inherits the parent's sprintId; "Tamanduá" contains "am" as a
      // substring, which a whole-word $text search would never match.
      await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Tamanduá listado', parentTask: parentId });
    });

    it('matches tasks and subtasks by substring within a sprint', async () => {
      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks?sprintId=${sprintId}&q=am`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const names = (res.body.data as { name: string }[]).map((t) => t.name);
      expect(names).toContain('Amarração de cabos');
      expect(names).toContain('Tamanduá listado');
    });

    it('is case-insensitive', async () => {
      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks?sprintId=${sprintId}&q=AM`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const names = (res.body.data as { name: string }[]).map((t) => t.name);
      expect(names).toContain('Amarração de cabos');
    });
  });

  describe('GET /spaces/:spaceId/tasks/:taskId', () => {
    it('returns populated task', async () => {
      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data._id).toBe(taskId);
      expect(res.body.data).toHaveProperty('assignees');
    });
  });

  describe('PATCH /spaces/:spaceId/tasks/:taskId', () => {
    it('updates task status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/spaces/${spaceId}/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'feito' })
        .expect(200);

      expect(res.body.data.status).toBe('feito');
    });
  });

  describe('PATCH /spaces/:spaceId/tasks/bulk', () => {
    let bulkA: string;
    let bulkB: string;

    beforeAll(async () => {
      const a = await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bulk A', listId, priority: 'baixa' });
      bulkA = a.body.data._id as string;

      const b = await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bulk B', listId, priority: 'baixa' });
      bulkB = b.body.data._id as string;
    });

    it('bulk-updates status and returns affected count', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/spaces/${spaceId}/tasks/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          taskIds: [bulkA, bulkB],
          action: 'status',
          status: 'em_progresso',
        })
        .expect(200);

      expect(res.body.data).toEqual({ affected: 2 });

      const check = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks/${bulkA}`)
        .set('Authorization', `Bearer ${token}`);
      expect(check.body.data.status).toBe('em_progresso');
    });

    it('bulk-moves to a sprint, clearing listId (domain rule)', async () => {
      await request(app.getHttpServer())
        .patch(`/spaces/${spaceId}/tasks/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({ taskIds: [bulkA], action: 'move', sprintId })
        .expect(200);

      const check = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks/${bulkA}`)
        .set('Authorization', `Bearer ${token}`);
      expect(check.body.data.sprintId).toBe(sprintId);
      expect(check.body.data.listId).toBeNull();
    });

    it('rejects a move with both listId and sprintId', async () => {
      await request(app.getHttpServer())
        .patch(`/spaces/${spaceId}/tasks/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({ taskIds: [bulkA], action: 'move', listId, sprintId })
        .expect(400);
    });

    it('rejects an invalid action', async () => {
      await request(app.getHttpServer())
        .patch(`/spaces/${spaceId}/tasks/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({ taskIds: [bulkA], action: 'frobnicate' })
        .expect(400);
    });

    it('rejects non-ObjectId taskIds', async () => {
      await request(app.getHttpServer())
        .patch(`/spaces/${spaceId}/tasks/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({ taskIds: ['not-an-id'], action: 'status', status: 'feito' })
        .expect(400);
    });

    it('bulk-archives and returns affected count', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/spaces/${spaceId}/tasks/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({ taskIds: [bulkA, bulkB], action: 'delete' })
        .expect(200);

      expect(res.body.data.affected).toBeGreaterThanOrEqual(2);

      // Soft delete: the tasks leave the active listing and land in the trash.
      const active = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(active.body.data.map((t: { _id: string }) => t._id)).not.toContain(
        bulkA,
      );

      const trash = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks/trash`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(trash.body.data.map((t: { _id: string }) => t._id)).toContain(
        bulkA,
      );
    });
  });

  describe('Subtasks', () => {
    it('creates a subtask linked to parent', async () => {
      const res = await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Subtask 1', listId, parentTask: taskId })
        .expect(201);

      subtaskId = res.body.data._id as string;
      expect(res.body.data.parentTask).toBe(taskId);
    });

    it('lists subtasks', async () => {
      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks/${taskId}/subtasks`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('Dependencies', () => {
    let task2Id: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Task 2', listId });
      task2Id = res.body.data._id as string;
    });

    it('adds a blocks dependency', async () => {
      await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks/${taskId}/dependencies`)
        .set('Authorization', `Bearer ${token}`)
        .send({ targetTaskId: task2Id, type: 'blocks' })
        .expect(201);
    });

    it('removes a dependency', async () => {
      await request(app.getHttpServer())
        .delete(`/spaces/${spaceId}/tasks/${taskId}/dependencies/${task2Id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
    });
  });

  describe('Sprint auto-increment', () => {
    it('creates second sprint with number 2', async () => {
      const res = await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/sprints`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Sprint 2',
          startDate: '2025-01-15',
          endDate: '2025-01-28',
        })
        .expect(201);

      expect(res.body.data.number).toBe(2);
    });
  });

  describe('DELETE /spaces/:spaceId/tasks/:taskId', () => {
    it('archives a task (soft delete) and removes it from active listings', async () => {
      await request(app.getHttpServer())
        .delete(`/spaces/${spaceId}/tasks/${subtaskId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .query({ includeSubtasks: true })
        .expect(200);
      expect(res.body.data.map((t: { _id: string }) => t._id)).not.toContain(
        subtaskId,
      );
    });
  });

  describe('Tags', () => {
    let tagId: string;

    it('creates a tag', async () => {
      const res = await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tags`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bug', color: '#FF0000' })
        .expect(201);

      tagId = res.body.data._id as string;
      expect(res.body.data.name).toBe('Bug');
    });

    it('rejects duplicate tag in same space', async () => {
      await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tags`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bug' })
        .expect(409);
    });

    it('lists space tags', async () => {
      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tags`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
    });

    it('deletes a tag', async () => {
      await request(app.getHttpServer())
        .delete(`/spaces/${spaceId}/tags/${tagId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
    });
  });

  describe('Epics', () => {
    let epicId: string;
    let childAId: string;
    let childBId: string;

    it('creates an epic in a list', async () => {
      const res = await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Big Epic', listId, isEpic: true })
        .expect(201);
      expect(res.body.data.isEpic).toBe(true);
      epicId = res.body.data._id as string;
    });

    it('rejects an epic without a list', async () => {
      await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Orphan Epic', isEpic: true })
        .expect(400);
    });

    it('creates epic children in the epic backlog, keeping epicId', async () => {
      const a = await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Child A', epicId, storyPoints: 5 })
        .expect(201);
      expect(a.body.data.epicId).toBe(epicId);
      expect(a.body.data.listId).toBe(listId);
      expect(a.body.data.sprintId).toBeNull();
      expect(a.body.data.parentTask).toBeNull();
      childAId = a.body.data._id as string;

      const b = await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Child B', epicId, storyPoints: 3 })
        .expect(201);
      childBId = b.body.data._id as string;
    });

    it('moves a child into a sprint independently, preserving the epic link', async () => {
      await request(app.getHttpServer())
        .patch(`/spaces/${spaceId}/tasks/${childAId}/move`)
        .set('Authorization', `Bearer ${token}`)
        .send({ sprintId })
        .expect(200);

      const check = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks/${childAId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(check.body.data.sprintId).toBe(sprintId);
      expect(check.body.data.listId).toBeNull();
      expect(check.body.data.epicId).toBe(epicId);
    });

    it('shows the moved child on the sprint board', async () => {
      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks?sprintId=${sprintId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const ids = (res.body.data as { _id: string }[]).map((t) => t._id);
      expect(ids).toContain(childAId);
    });

    it('rolls up effort/progress across sprints and backlog', async () => {
      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks/${epicId}/rollup`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.data.totalPoints).toBe(8);
      expect(res.body.data.totalTasks).toBe(2);
      const bySprint = res.body.data.bySprint as {
        sprintId: string | null;
        points: number;
      }[];
      expect(bySprint.find((s) => s.sprintId === sprintId)?.points).toBe(5);
      expect(bySprint.find((s) => s.sprintId === null)?.points).toBe(3);
    });

    it('groups list tasks by epic, labelling the group with the epic name', async () => {
      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks?listId=${listId}&groupBy=epic`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const groups = res.body.data as {
        groupKey: string | null;
        tasks: { _id: string }[];
        count: number;
      }[];

      // Child B lives in the list backlog and is linked to the epic.
      const epicGroup = groups.find((g) => g.groupKey === 'Big Epic');
      expect(epicGroup).toBeDefined();
      expect(epicGroup!.tasks.map((t) => t._id)).toContain(childBId);

      // The epic task itself has no epicId, so it falls under the null group.
      const noEpicGroup = groups.find((g) => g.groupKey === null);
      expect(noEpicGroup).toBeDefined();
      expect(noEpicGroup!.tasks.map((t) => t._id)).toContain(epicId);
    });

    it('detaches a child from the epic via PATCH epicId:null', async () => {
      await request(app.getHttpServer())
        .patch(`/spaces/${spaceId}/tasks/${childBId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ epicId: null })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks/${epicId}/rollup`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.data.totalTasks).toBe(1);
    });

    it('rejects rollup for a non-epic task', async () => {
      await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks/${childAId}/rollup`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('Story-point rollup (Option A)', () => {
    let rSprintId: string;
    let parentId: string;

    it('sets up a parent with pointed subtasks in a sprint', async () => {
      const sp = await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/sprints`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Rollup Sprint',
          startDate: '2025-02-01',
          endDate: '2025-02-14',
        })
        .expect(201);
      rSprintId = sp.body.data._id as string;

      const parent = await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Parent', sprintId: rSprintId, storyPoints: 5 })
        .expect(201);
      parentId = parent.body.data._id as string;

      // Subtasks inherit the parent's sprint.
      await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Sub 1', parentTask: parentId, storyPoints: 8 })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Sub 2',
          parentTask: parentId,
          storyPoints: 2,
          status: 'feito',
        })
        .expect(201);
    });

    it('reports the parent points as the rolled-up sum of subtasks', async () => {
      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/tasks/${parentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.data.subtaskPoints).toBe(10);
    });

    it('counts leaves only in sprint stats (no double count with the parent)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/sprints/${rSprintId}/stats`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      // Σ subtasks (8 + 2) — the parent's own 5 is excluded as a rolled-up parent.
      expect(res.body.data.totalPoints).toBe(10);
      expect(res.body.data.donePoints).toBe(2);
    });
  });
});

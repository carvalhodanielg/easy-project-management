import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { SpacesModule } from '../src/modules/spaces/spaces.module';
import { ListsModule } from '../src/modules/lists/lists.module';
import { SprintsModule } from '../src/modules/sprints/sprints.module';
import { TasksModule } from '../src/modules/tasks/tasks.module';
import { TagsModule } from '../src/modules/tags/tags.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import configuration from '../src/config/configuration';

async function buildApp(uri: string): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
      MongooseModule.forRoot(uri),
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
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
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

    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'dev@test.com', password: 'password123', displayName: 'Dev' });
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
      .send({ name: 'Sprint 1', startDate: '2025-01-01', endDate: '2025-01-14' });
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

      expect(res.body.data).toMatchObject({ name: 'First Task', storyPoints: 5 });
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
        .send({ name: 'Sprint 2', startDate: '2025-01-15', endDate: '2025-01-28' })
        .expect(201);

      expect(res.body.data.number).toBe(2);
    });
  });

  describe('DELETE /spaces/:spaceId/tasks/:taskId', () => {
    it('deletes a task', async () => {
      await request(app.getHttpServer())
        .delete(`/spaces/${spaceId}/tasks/${subtaskId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
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
});

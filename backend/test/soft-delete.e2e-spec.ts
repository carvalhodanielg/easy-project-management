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

describe('Soft delete / archiving (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let ownerToken: string;
  let viewerToken: string;
  let viewerId: string;
  const http = () => request(app.getHttpServer());
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    app = await buildApp(mongod.getUri());

    const owner = await http().post('/auth/register').send({
      email: 'owner@test.com',
      password: 'password123',
      displayName: 'Owner',
    });
    ownerToken = owner.body.data.token as string;

    const viewer = await http().post('/auth/register').send({
      email: 'viewer@test.com',
      password: 'password123',
      displayName: 'Viewer',
    });
    viewerToken = viewer.body.data.token as string;
    viewerId = (await http().get('/auth/me').set(auth(viewerToken))).body.data
      ._id as string;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  // Helpers to scaffold a fresh space with one list, one sprint and tasks.
  async function scaffold() {
    const space = await http()
      .post('/spaces')
      .set(auth(ownerToken))
      .send({ name: 'Space' });
    const spaceId = space.body.data._id as string;

    const list = await http()
      .post(`/spaces/${spaceId}/lists`)
      .set(auth(ownerToken))
      .send({ name: 'Backlog' });
    const listId = list.body.data._id as string;

    const sprint = await http()
      .post(`/spaces/${spaceId}/sprints`)
      .set(auth(ownerToken))
      .send({
        name: 'Sprint 1',
        startDate: '2025-01-01',
        endDate: '2025-01-14',
      });
    const sprintId = sprint.body.data._id as string;

    const task = await http()
      .post(`/spaces/${spaceId}/tasks`)
      .set(auth(ownerToken))
      .send({ name: 'Task in list', listId });
    const taskId = task.body.data._id as string;

    return { spaceId, listId, sprintId, taskId };
  }

  describe('Space archive / restore / permanent', () => {
    it('archives a space and hides it (and its contents) from active listings', async () => {
      const { spaceId, listId } = await scaffold();

      await http()
        .delete(`/spaces/${spaceId}`)
        .set(auth(ownerToken))
        .expect(200);

      // Space disappears from the active list, appears in the trash.
      const active = await http()
        .get('/spaces')
        .set(auth(ownerToken))
        .expect(200);
      expect(active.body.data.map((s: { _id: string }) => s._id)).not.toContain(
        spaceId,
      );

      const trash = await http()
        .get('/spaces/trash')
        .set(auth(ownerToken))
        .expect(200);
      expect(trash.body.data.map((s: { _id: string }) => s._id)).toContain(
        spaceId,
      );

      // Cascade: the space's lists are archived too.
      const lists = await http()
        .get(`/spaces/${spaceId}/lists`)
        .set(auth(ownerToken))
        .expect(200);
      expect(lists.body.data.map((l: { _id: string }) => l._id)).not.toContain(
        listId,
      );
    });

    it('restores a space and brings back its cascade-archived contents', async () => {
      const { spaceId, listId, taskId } = await scaffold();

      await http()
        .delete(`/spaces/${spaceId}`)
        .set(auth(ownerToken))
        .expect(200);
      await http()
        .post(`/spaces/${spaceId}/restore`)
        .set(auth(ownerToken))
        .expect(201);

      const active = await http()
        .get('/spaces')
        .set(auth(ownerToken))
        .expect(200);
      expect(active.body.data.map((s: { _id: string }) => s._id)).toContain(
        spaceId,
      );

      const lists = await http()
        .get(`/spaces/${spaceId}/lists`)
        .set(auth(ownerToken))
        .expect(200);
      expect(lists.body.data.map((l: { _id: string }) => l._id)).toContain(
        listId,
      );

      const tasks = await http()
        .get(`/spaces/${spaceId}/tasks`)
        .set(auth(ownerToken))
        .expect(200);
      expect(tasks.body.data.map((t: { _id: string }) => t._id)).toContain(
        taskId,
      );
    });

    it('refuses to permanently delete a space that is not archived', async () => {
      const { spaceId } = await scaffold();
      await http()
        .delete(`/spaces/${spaceId}/permanent`)
        .set(auth(ownerToken))
        .expect(400);
    });

    it('permanently deletes an archived space', async () => {
      const { spaceId } = await scaffold();
      await http()
        .delete(`/spaces/${spaceId}`)
        .set(auth(ownerToken))
        .expect(200);
      await http()
        .delete(`/spaces/${spaceId}/permanent`)
        .set(auth(ownerToken))
        .expect(204);

      // Gone from the trash too.
      const trash = await http()
        .get('/spaces/trash')
        .set(auth(ownerToken))
        .expect(200);
      expect(trash.body.data.map((s: { _id: string }) => s._id)).not.toContain(
        spaceId,
      );
    });
  });

  describe('List archive / restore', () => {
    it('archives a list and its tasks, and lists them in the trash', async () => {
      const { spaceId, listId, taskId } = await scaffold();

      await http()
        .delete(`/spaces/${spaceId}/lists/${listId}`)
        .set(auth(ownerToken))
        .expect(200);

      const tasks = await http()
        .get(`/spaces/${spaceId}/tasks`)
        .set(auth(ownerToken))
        .expect(200);
      expect(tasks.body.data.map((t: { _id: string }) => t._id)).not.toContain(
        taskId,
      );

      const trash = await http()
        .get(`/spaces/${spaceId}/lists/trash`)
        .set(auth(ownerToken))
        .expect(200);
      expect(trash.body.data.map((l: { _id: string }) => l._id)).toContain(
        listId,
      );

      // Restore brings the list and its tasks back.
      await http()
        .post(`/spaces/${spaceId}/lists/${listId}/restore`)
        .set(auth(ownerToken))
        .expect(201);

      const restored = await http()
        .get(`/spaces/${spaceId}/tasks`)
        .set(auth(ownerToken))
        .expect(200);
      expect(restored.body.data.map((t: { _id: string }) => t._id)).toContain(
        taskId,
      );
    });
  });

  describe('Task archive / restore', () => {
    it('archives and restores an individual task', async () => {
      const { spaceId, taskId } = await scaffold();

      await http()
        .delete(`/spaces/${spaceId}/tasks/${taskId}`)
        .set(auth(ownerToken))
        .expect(200);

      const trash = await http()
        .get(`/spaces/${spaceId}/tasks/trash`)
        .set(auth(ownerToken))
        .expect(200);
      expect(trash.body.data.map((t: { _id: string }) => t._id)).toContain(
        taskId,
      );

      await http()
        .post(`/spaces/${spaceId}/tasks/${taskId}/restore`)
        .set(auth(ownerToken))
        .expect(201);

      const tasks = await http()
        .get(`/spaces/${spaceId}/tasks`)
        .set(auth(ownerToken))
        .expect(200);
      expect(tasks.body.data.map((t: { _id: string }) => t._id)).toContain(
        taskId,
      );
    });
  });

  describe('Authorization', () => {
    it('forbids a viewer from archiving a task', async () => {
      const { spaceId, taskId } = await scaffold();
      await http()
        .post(`/spaces/${spaceId}/members`)
        .set(auth(ownerToken))
        .send({ userId: viewerId, role: 'viewer' })
        .expect(201);

      await http()
        .delete(`/spaces/${spaceId}/tasks/${taskId}`)
        .set(auth(viewerToken))
        .expect(403);

      await http()
        .post(`/spaces/${spaceId}/tasks/${taskId}/restore`)
        .set(auth(viewerToken))
        .expect(403);
    });
  });
});

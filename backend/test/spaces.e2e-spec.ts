import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { SpacesModule } from '../src/modules/spaces/spaces.module';
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
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.init();
  return app;
}

describe('Spaces (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let editorToken: string;
  let viewerToken: string;
  let editorId: string;
  let viewerId: string;
  let spaceId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    app = await buildApp(mongod.getUri());

    // Register editor user
    const editorReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'editor@test.com', password: 'password123', displayName: 'Editor' });
    editorToken = editorReg.body.data.token as string;

    const editorMe = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${editorToken}`);
    editorId = editorMe.body.data._id as string;

    // Register viewer user
    const viewerReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'viewer@test.com', password: 'password123', displayName: 'Viewer' });
    viewerToken = viewerReg.body.data.token as string;

    const viewerMe = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${viewerToken}`);
    viewerId = viewerMe.body.data._id as string;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('POST /spaces', () => {
    it('creates a space and returns it', async () => {
      const res = await request(app.getHttpServer())
        .post('/spaces')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Test Space', color: '#FF5733' })
        .expect(201);

      expect(res.body.data).toMatchObject({ name: 'Test Space', color: '#FF5733' });
      spaceId = res.body.data._id as string;
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer())
        .post('/spaces')
        .send({ name: 'X' })
        .expect(401);
    });
  });

  describe('GET /spaces', () => {
    it('returns only spaces the user belongs to', async () => {
      const res = await request(app.getHttpServer())
        .get('/spaces')
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]._id).toBe(spaceId);
    });

    it('viewer sees no spaces before being added', async () => {
      const res = await request(app.getHttpServer())
        .get('/spaces')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('GET /spaces/:spaceId', () => {
    it('returns space for member', async () => {
      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200);

      expect(res.body.data._id).toBe(spaceId);
    });

    it('returns 404 for non-member', async () => {
      await request(app.getHttpServer())
        .get(`/spaces/${spaceId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(404);
    });
  });

  describe('PATCH /spaces/:spaceId', () => {
    it('allows editor to update space', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/spaces/${spaceId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Renamed Space' })
        .expect(200);

      expect(res.body.data.name).toBe('Renamed Space');
    });
  });

  describe('Members management', () => {
    it('editor adds viewer as Viewer', async () => {
      await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/members`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ userId: viewerId, role: 'viewer' })
        .expect(201);
    });

    it('viewer cannot add members (forbidden)', async () => {
      // Register a third user
      const thirdReg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'third@test.com', password: 'password123', displayName: 'Third' });
      const thirdId = (
        await request(app.getHttpServer())
          .get('/auth/me')
          .set('Authorization', `Bearer ${thirdReg.body.data.token}`)
      ).body.data._id as string;

      await request(app.getHttpServer())
        .post(`/spaces/${spaceId}/members`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ userId: thirdId, role: 'viewer' })
        .expect(403);
    });

    it('viewer cannot update space (forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/spaces/${spaceId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Viewer Attempt' })
        .expect(403);
    });

    it('viewer can read the space after being added', async () => {
      await request(app.getHttpServer())
        .get(`/spaces/${spaceId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);
    });

    it('lists members', async () => {
      const res = await request(app.getHttpServer())
        .get(`/spaces/${spaceId}/members`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
    });

    it('editor removes viewer', async () => {
      await request(app.getHttpServer())
        .delete(`/spaces/${spaceId}/members/${viewerId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(204);
    });

    it('editor cannot remove self', async () => {
      await request(app.getHttpServer())
        .delete(`/spaces/${spaceId}/members/${editorId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(403);
    });
  });
});

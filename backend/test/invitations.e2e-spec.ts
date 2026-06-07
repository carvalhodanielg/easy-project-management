import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { SpacesModule } from '../src/modules/spaces/spaces.module';
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
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.init();
  return app;
}

async function register(app: INestApplication, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password: 'password123', displayName: email.split('@')[0] });
  return res.body.data.token as string;
}

describe('Invitations (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let editorToken: string;
  let spaceId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    app = await buildApp(mongod.getUri());

    editorToken = await register(app, 'owner@test.com');

    const space = await request(app.getHttpServer())
      .post('/spaces')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ name: 'Team Space', color: '#4A90E2' });
    spaceId = space.body.data._id as string;
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('lets an editor invite an email and returns a copyable invite url', async () => {
    const res = await request(app.getHttpServer())
      .post(`/spaces/${spaceId}/invitations`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ email: 'invitee@test.com', role: 'viewer' })
      .expect(201);

    expect(res.body.data.inviteUrl).toContain('/invite/accept?token=');
    expect(res.body.data.invitation.email).toBe('invitee@test.com');
    expect(res.body.data.invitation.status).toBe('pending');
  });

  it('lists pending invitations for the space', async () => {
    const res = await request(app.getHttpServer())
      .get(`/spaces/${spaceId}/invitations`)
      .set('Authorization', `Bearer ${editorToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBe('invitee@test.com');
  });

  it('exposes invite context publicly via the token (no auth)', async () => {
    const invite = await request(app.getHttpServer())
      .post(`/spaces/${spaceId}/invitations`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ email: 'public@test.com', role: 'editor' });
    const token = invite.body.data.invitation.token as string;

    const res = await request(app.getHttpServer())
      .get(`/invitations/${token}`)
      .expect(200);

    expect(res.body.data).toMatchObject({
      email: 'public@test.com',
      role: 'editor',
      valid: true,
      spaceName: 'Team Space',
      inviterName: 'owner',
    });
  });

  it('rejects accepting with an email different from the invite', async () => {
    const invite = await request(app.getHttpServer())
      .post(`/spaces/${spaceId}/invitations`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ email: 'target@test.com', role: 'viewer' });
    const token = invite.body.data.invitation.token as string;

    const wrongToken = await register(app, 'wrong@test.com');

    await request(app.getHttpServer())
      .post(`/invitations/${token}/accept`)
      .set('Authorization', `Bearer ${wrongToken}`)
      .expect(403);
  });

  it('lets the invited user register and accept, becoming a member', async () => {
    const invite = await request(app.getHttpServer())
      .post(`/spaces/${spaceId}/invitations`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ email: 'joiner@test.com', role: 'viewer' });
    const token = invite.body.data.invitation.token as string;

    const joinerToken = await register(app, 'joiner@test.com');

    const accept = await request(app.getHttpServer())
      .post(`/invitations/${token}/accept`)
      .set('Authorization', `Bearer ${joinerToken}`)
      .expect(200);
    expect(accept.body.data._id).toBe(spaceId);

    // The joiner can now read the space they joined.
    await request(app.getHttpServer())
      .get(`/spaces/${spaceId}`)
      .set('Authorization', `Bearer ${joinerToken}`)
      .expect(200);

    // A second accept of the same (now consumed) token fails.
    await request(app.getHttpServer())
      .post(`/invitations/${token}/accept`)
      .set('Authorization', `Bearer ${joinerToken}`)
      .expect(400);
  });

  it('blocks inviting someone who is already a member', async () => {
    await request(app.getHttpServer())
      .post(`/spaces/${spaceId}/invitations`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ email: 'joiner@test.com', role: 'editor' })
      .expect(409);
  });

  it('revokes a pending invitation', async () => {
    const invite = await request(app.getHttpServer())
      .post(`/spaces/${spaceId}/invitations`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({ email: 'revoke-me@test.com', role: 'viewer' });
    const id = invite.body.data.invitation._id as string;

    await request(app.getHttpServer())
      .delete(`/spaces/${spaceId}/invitations/${id}`)
      .set('Authorization', `Bearer ${editorToken}`)
      .expect(204);

    const token = invite.body.data.invitation.token as string;
    const ctx = await request(app.getHttpServer())
      .get(`/invitations/${token}`)
      .expect(200);
    expect(ctx.body.data.valid).toBe(false);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { MailModule } from '../src/common/mail/mail.module';
import { MailService } from '../src/common/mail/mail.service';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import configuration from '../src/config/configuration';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let mailService: MailService;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        MongooseModule.forRoot(uri),
        MailModule,
        UsersModule,
        AuthModule,
      ],
    }).compile();

    mailService = moduleFixture.get<MailService>(MailService);
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  const registerPayload = {
    email: 'user@example.com',
    password: 'password123',
    displayName: 'Test User',
  };

  let authToken: string;

  describe('POST /auth/register', () => {
    it('registers a new user and returns a token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerPayload)
        .expect(201);

      expect(res.body.data).toHaveProperty('token');
      expect(typeof res.body.data.token).toBe('string');
    });

    it('rejects duplicate email with 409', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerPayload)
        .expect(409);
    });

    it('rejects invalid email with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'password123',
          displayName: 'X',
        })
        .expect(400);
    });

    it('rejects short password with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'other@example.com',
          password: 'short',
          displayName: 'X',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns token with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerPayload.email,
          password: registerPayload.password,
        })
        .expect(200);

      expect(res.body.data).toHaveProperty('token');
      authToken = res.body.data.token as string;
    });

    it('rejects wrong password with 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: registerPayload.email, password: 'wrongpass' })
        .expect(401);
    });

    it('rejects unknown email with 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('returns current user with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data).toMatchObject({
        email: registerPayload.email,
        displayName: registerPayload.displayName,
      });
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('returns 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Password reset flow', () => {
    // Intercept the reset email to capture the (otherwise out-of-band) token.
    function captureResetToken(): jest.SpyInstance {
      return jest
        .spyOn(mailService, 'sendPasswordReset')
        .mockResolvedValue(undefined);
    }

    function tokenFromSpy(spy: jest.SpyInstance): string {
      const { resetUrl } = spy.mock.calls[0][0] as { resetUrl: string };
      return new URL(resetUrl).searchParams.get('token') as string;
    }

    afterEach(() => jest.restoreAllMocks());

    it('returns a generic 200 for an unknown email (no enumeration)', async () => {
      const spy = captureResetToken();
      const res = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'ghost@example.com' })
        .expect(200);

      expect(res.body.data).toHaveProperty('message');
      expect(spy).not.toHaveBeenCalled();
    });

    it('completes the full forgot -> reset -> login cycle', async () => {
      const newPassword = 'brand-new-pass-456';
      const spy = captureResetToken();

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: registerPayload.email })
        .expect(200);

      expect(spy).toHaveBeenCalledTimes(1);
      const token = tokenFromSpy(spy);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, password: newPassword })
        .expect(200);

      // New password works.
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: registerPayload.email, password: newPassword })
        .expect(200);

      // Old password no longer works.
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerPayload.email,
          password: registerPayload.password,
        })
        .expect(401);
    });

    it('rejects a reused token with 400', async () => {
      const spy = captureResetToken();
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: registerPayload.email })
        .expect(200);
      const token = tokenFromSpy(spy);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, password: 'another-pass-789' })
        .expect(200);

      // Second use of the same token must fail.
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, password: 'yet-another-000' })
        .expect(400);
    });

    it('rejects an invalid token with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'does-not-exist', password: 'whatever-123' })
        .expect(400);
    });
  });
});

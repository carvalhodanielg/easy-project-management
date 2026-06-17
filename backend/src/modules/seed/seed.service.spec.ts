import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { SeedService } from './seed.service';
import { UsersService } from '../users/users.service';

const mockUsersService = {
  findByEmail: jest.fn(),
  create: jest.fn(),
};

describe('SeedService', () => {
  let service: SeedService;
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Isolate env per test; restored in afterEach.
    process.env = { ...originalEnv };
    delete process.env.NODE_ENV;
    delete process.env.SEED_ADMIN_EMAIL;
    delete process.env.SEED_ADMIN_PASSWORD;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<SeedService>(SeedService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('creates the admin seed user (admin@teste.com) in development when missing', async () => {
    mockUsersService.findByEmail.mockResolvedValue(null);
    mockUsersService.create.mockResolvedValue({});

    await service.onApplicationBootstrap();

    expect(mockUsersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@teste.com',
        displayName: 'Admin',
        passwordHash: expect.any(String),
      }),
    );
  });

  it('does not create a default user in production without SEED_ADMIN_PASSWORD', async () => {
    process.env.NODE_ENV = 'production';
    mockUsersService.findByEmail.mockResolvedValue(null);

    await service.onApplicationBootstrap();

    expect(mockUsersService.create).not.toHaveBeenCalled();
  });

  it('uses SEED_ADMIN_PASSWORD when set', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SEED_ADMIN_PASSWORD = 'super-secret-prod';
    mockUsersService.findByEmail.mockResolvedValue(null);
    mockUsersService.create.mockResolvedValue({});

    await service.onApplicationBootstrap();

    const [createArg] = mockUsersService.create.mock.calls[0] as [
      { passwordHash: string },
    ];
    expect(
      await bcrypt.compare('super-secret-prod', createArg.passwordHash),
    ).toBe(true);
  });

  it('honors SEED_ADMIN_EMAIL override', async () => {
    process.env.SEED_ADMIN_EMAIL = 'boss@example.com';
    mockUsersService.findByEmail.mockResolvedValue(null);
    mockUsersService.create.mockResolvedValue({});

    await service.onApplicationBootstrap();

    expect(mockUsersService.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'boss@example.com' }),
    );
  });

  it('is idempotent: does not recreate an existing admin', async () => {
    mockUsersService.findByEmail.mockResolvedValue({
      email: 'admin@teste.com',
    });

    await service.onApplicationBootstrap();

    expect(mockUsersService.create).not.toHaveBeenCalled();
  });
});

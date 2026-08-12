import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let mockPing: jest.Mock;
  let mockAdmin: jest.Mock;
  let mockConnection: { db: { admin: jest.Mock } | undefined };

  const buildModule = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    return module.get<HealthService>(HealthService);
  };

  beforeEach(() => {
    mockPing = jest.fn();
    mockAdmin = jest.fn().mockReturnValue({ ping: mockPing });
    mockConnection = { db: { admin: mockAdmin } };
  });

  it('returns ok/up when the mongo ping succeeds', async () => {
    mockPing.mockResolvedValue({ ok: 1 });
    service = await buildModule();

    const result = await service.check();

    expect(result).toEqual({ status: 'ok', database: 'up' });
    expect(mockAdmin).toHaveBeenCalled();
    expect(mockPing).toHaveBeenCalled();
  });

  it('throws ServiceUnavailableException when the mongo ping rejects', async () => {
    mockPing.mockRejectedValue(new Error('connection refused'));
    service = await buildModule();

    await expect(service.check()).rejects.toThrow(ServiceUnavailableException);
  });

  it('throws ServiceUnavailableException when the connection has no db yet', async () => {
    mockConnection.db = undefined;
    service = await buildModule();

    await expect(service.check()).rejects.toThrow(ServiceUnavailableException);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

const mockHealthService = {
  check: jest.fn(),
};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: mockHealthService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('GET /health', () => {
    it('returns ok status when the service reports the database is up', async () => {
      mockHealthService.check.mockResolvedValue({
        status: 'ok',
        database: 'up',
      });

      const result = await controller.check();

      expect(result).toEqual({ status: 'ok', database: 'up' });
      expect(mockHealthService.check).toHaveBeenCalled();
    });

    it('propagates a ServiceUnavailableException when the database is down', async () => {
      mockHealthService.check.mockRejectedValue(
        new ServiceUnavailableException({ status: 'error', database: 'down' }),
      );

      await expect(controller.check()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});

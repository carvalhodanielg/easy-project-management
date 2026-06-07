import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';

describe('MailService', () => {
  let service: MailService;

  beforeEach(() => {
    service = new MailService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends a space invite without throwing and logs the invite url', async () => {
    const spy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    await expect(
      service.sendSpaceInvite({
        to: 'invitee@test.com',
        inviteUrl: 'http://localhost:5173/invite/accept?token=abc123',
        spaceName: 'My Space',
        inviterName: 'Editor',
      }),
    ).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledTimes(1);
    const logged = spy.mock.calls[0][0] as string;
    expect(logged).toContain(
      'http://localhost:5173/invite/accept?token=abc123',
    );
    expect(logged).toContain('invitee@test.com');
  });

  it('sends a password reset without throwing and logs the reset url', async () => {
    const spy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    await expect(
      service.sendPasswordReset({
        to: 'user@test.com',
        resetUrl: 'http://localhost:5173/reset-password?token=xyz789',
      }),
    ).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalledTimes(1);
    const logged = spy.mock.calls[0][0] as string;
    expect(logged).toContain(
      'http://localhost:5173/reset-password?token=xyz789',
    );
    expect(logged).toContain('user@test.com');
  });
});

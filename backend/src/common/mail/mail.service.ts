import { Injectable, Logger } from '@nestjs/common';

export interface SpaceInviteEmail {
  to: string;
  inviteUrl: string;
  spaceName: string;
  inviterName: string;
}

export interface PasswordResetEmail {
  to: string;
  resetUrl: string;
}

/**
 * Mail delivery abstraction.
 *
 * No external email provider is configured yet, so the default implementation
 * logs the message (the invite link is also returned by the API so it can be
 * shared manually). To enable real delivery, swap the body of the send methods
 * for an SMTP (nodemailer) or Resend transport — callers do not need to change.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  sendSpaceInvite(params: SpaceInviteEmail): Promise<void> {
    this.logger.log(
      `Space invite for ${params.to} to join "${params.spaceName}" ` +
        `(invited by ${params.inviterName}): ${params.inviteUrl}`,
    );
    return Promise.resolve();
  }

  sendPasswordReset(params: PasswordResetEmail): Promise<void> {
    this.logger.log(`Password reset link for ${params.to}: ${params.resetUrl}`);
    return Promise.resolve();
  }
}

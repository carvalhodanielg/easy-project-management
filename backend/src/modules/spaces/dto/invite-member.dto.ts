import { IsEmail, IsEnum } from 'class-validator';
import { SpaceRole } from '../schemas/space-member.schema';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(SpaceRole)
  role: SpaceRole;
}

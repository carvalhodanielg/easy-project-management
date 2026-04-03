import { IsString, IsEnum, IsMongoId } from 'class-validator';
import { SpaceRole } from '../schemas/space-member.schema';

export class AddMemberDto {
  @IsMongoId()
  userId: string;

  @IsEnum(SpaceRole)
  role: SpaceRole;
}

export class UpdateMemberRoleDto {
  @IsEnum(SpaceRole)
  role: SpaceRole;
}

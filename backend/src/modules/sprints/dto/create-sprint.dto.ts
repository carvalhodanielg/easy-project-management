import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsDateString,
  IsMongoId,
} from 'class-validator';
import { SprintStatus } from '../schemas/sprint.schema';

export class CreateSprintDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsMongoId()
  folderId?: string | null;
}

export class UpdateSprintDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(SprintStatus)
  status?: SprintStatus;
}

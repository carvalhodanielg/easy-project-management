import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';

export class CreateSprintFolderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  /** Day of week: 0 = Sunday … 6 = Saturday */
  @IsInt()
  @Min(0)
  @Max(6)
  startDayOfWeek: number;

  @IsInt()
  @Min(1)
  durationWeeks: number;

  @IsBoolean()
  autoComplete: boolean;

  @IsInt()
  @Min(1)
  openFutureSprints: number;

  @IsOptional()
  @IsDateString()
  folderEndDate?: string | null;
}

export class UpdateSprintFolderDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  startDayOfWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationWeeks?: number;

  @IsOptional()
  @IsBoolean()
  autoComplete?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  openFutureSprints?: number;

  @IsOptional()
  @IsDateString()
  folderEndDate?: string | null;
}

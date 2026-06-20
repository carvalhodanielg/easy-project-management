import {
  IsString,
  IsNotEmpty,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsOptional, IsArray, IsBoolean, IsIn } from 'class-validator';

export class SavedFilterFieldsDto {
  @IsOptional()
  @IsArray()
  status?: string[];

  @IsOptional()
  @IsArray()
  priority?: string[];

  @IsOptional()
  @IsArray()
  assignees?: string[];

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  groupBy?: string;

  @IsOptional()
  @IsBoolean()
  includeSubtasks?: boolean;

  @IsOptional()
  @IsIn(['collapsed', 'expanded', 'separated'])
  subtaskMode?: string;

  @IsOptional()
  @IsString()
  q?: string;
}

export class CreateSavedFilterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsObject()
  @ValidateNested()
  @Type(() => SavedFilterFieldsDto)
  filters: SavedFilterFieldsDto;
}

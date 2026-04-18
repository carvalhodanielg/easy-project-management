import {
  IsOptional,
  IsEnum,
  IsMongoId,
  IsString,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TaskStatus, TaskPriority } from '../schemas/task.schema';

type StringOrArray = string | string[];

function toArray(val: StringOrArray): string[] {
  if (Array.isArray(val)) return val;
  return [val];
}

export class TaskFilterQueryDto {
  @IsOptional()
  @IsMongoId()
  listId?: string;

  @IsOptional()
  @IsMongoId()
  sprintId?: string;

  @IsOptional()
  @Transform(({ value }: { value: StringOrArray }) => toArray(value))
  @IsEnum(TaskStatus, { each: true })
  status?: TaskStatus[];

  @IsOptional()
  @Transform(({ value }: { value: StringOrArray }) => toArray(value))
  @IsEnum(TaskPriority, { each: true })
  priority?: TaskPriority[];

  @IsOptional()
  @Transform(({ value }: { value: StringOrArray }) => toArray(value))
  @IsString({ each: true })
  assignees?: string[];

  @IsOptional()
  @Transform(({ value }: { value: StringOrArray }) => toArray(value))
  @IsMongoId({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(['status', 'assignee', 'sprint', 'priority'])
  groupBy?: 'status' | 'assignee' | 'sprint' | 'priority';

  @IsOptional()
  @Transform(({ value }: { value: string }) => value === 'true')
  @IsBoolean()
  includeSubtasks?: boolean;

  @IsOptional()
  @IsString()
  dueBefore?: string;

  @IsOptional()
  @IsString()
  dueAfter?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }: { value: string }) => value === 'true')
  @IsBoolean()
  includeSums?: boolean;
}

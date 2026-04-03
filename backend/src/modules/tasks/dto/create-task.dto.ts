import {
  IsString,
  IsOptional,
  IsEnum,
  IsMongoId,
  IsDateString,
  IsNumber,
  IsIn,
  IsArray,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { TaskStatus, TaskPriority, FIBONACCI_POINTS } from '../schemas/task.schema';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsMongoId()
  listId?: string;

  @IsOptional()
  @IsMongoId()
  sprintId?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  assignees?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @IsIn([...FIBONACCI_POINTS])
  storyPoints?: number;

  @IsOptional()
  @IsMongoId()
  parentTask?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  assignees?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @IsIn([...FIBONACCI_POINTS])
  storyPoints?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}

export class MoveTaskDto {
  @IsOptional()
  @IsMongoId()
  listId?: string;

  @IsOptional()
  @IsMongoId()
  sprintId?: string;
}

export class AddDependencyDto {
  @IsMongoId()
  targetTaskId: string;

  @IsEnum(['blocks', 'blocked_by'])
  type: 'blocks' | 'blocked_by';
}

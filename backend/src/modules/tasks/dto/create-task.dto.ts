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
} from 'class-validator';
import {
  TaskStatus,
  TaskPriority,
  FIBONACCI_POINTS,
} from '../schemas/task.schema';

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

export class BulkDeleteDto {
  @IsArray()
  @IsMongoId({ each: true })
  taskIds: string[];
}

export class BulkMoveDto {
  @IsArray()
  @IsMongoId({ each: true })
  taskIds: string[];

  @IsOptional()
  @IsMongoId()
  listId?: string;

  @IsOptional()
  @IsMongoId()
  sprintId?: string;
}

export class BulkDuplicateDto {
  @IsArray()
  @IsMongoId({ each: true })
  taskIds: string[];

  @IsOptional()
  @IsMongoId()
  listId?: string;

  @IsOptional()
  @IsMongoId()
  sprintId?: string;
}

export class ConvertToSubtaskDto {
  @IsArray()
  @IsMongoId({ each: true })
  taskIds: string[];

  @IsMongoId()
  parentTaskId: string;
}

export class PromoteToMainTaskDto {
  @IsArray()
  @IsMongoId({ each: true })
  taskIds: string[];

  @IsOptional()
  @IsMongoId()
  listId?: string;

  @IsOptional()
  @IsMongoId()
  sprintId?: string;
}

export class MoveSubtaskDto {
  @IsArray()
  @IsMongoId({ each: true })
  taskIds: string[];

  @IsMongoId()
  newParentTaskId: string;
}

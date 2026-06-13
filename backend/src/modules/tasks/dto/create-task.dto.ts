import {
  IsString,
  IsOptional,
  IsEnum,
  IsMongoId,
  IsDateString,
  IsNumber,
  IsIn,
  IsArray,
  IsBoolean,
  ArrayNotEmpty,
  MinLength,
  MaxLength,
  ValidateIf,
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

  /** Marks this task as an Epic (must live in a list; cannot be a subtask/child). */
  @IsOptional()
  @IsBoolean()
  isEpic?: boolean;

  /** Link this task to a parent Epic (planning axis). */
  @IsOptional()
  @IsMongoId()
  epicId?: string;

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

  /** Attach to (mongoId) or detach from (null) a parent Epic. */
  @IsOptional()
  @ValidateIf((o: UpdateTaskDto) => o.epicId !== null)
  @IsMongoId()
  epicId?: string | null;

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

export class DuplicateSubtaskDto {
  @IsMongoId()
  taskId: string;

  @IsMongoId()
  newParentTaskId: string;
}

export type BulkAction =
  | 'status'
  | 'priority'
  | 'assignees'
  | 'move'
  | 'delete';

export class BulkPatchDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  taskIds: string[];

  @IsIn(['status', 'priority', 'assignees', 'move', 'delete'])
  action: BulkAction;

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
  @IsMongoId()
  listId?: string;

  @IsOptional()
  @IsMongoId()
  sprintId?: string;
}

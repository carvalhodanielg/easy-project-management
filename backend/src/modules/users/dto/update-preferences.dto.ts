import { IsIn, IsOptional } from 'class-validator';
import type {
  TaskGroupBy,
  TaskSubtaskMode,
  ThemeMode,
} from '../schemas/user.schema';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsIn(['light', 'dark'])
  theme?: ThemeMode;

  @IsOptional()
  @IsIn(['none', 'status', 'assignee'])
  taskGroupBy?: TaskGroupBy;

  @IsOptional()
  @IsIn(['collapsed', 'expanded', 'separated'])
  taskSubtaskMode?: TaskSubtaskMode;
}

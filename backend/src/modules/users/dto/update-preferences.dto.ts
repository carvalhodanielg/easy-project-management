import { IsIn, IsOptional } from 'class-validator';
import type { ThemeMode } from '../schemas/user.schema';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsIn(['light', 'dark'])
  theme?: ThemeMode;
}

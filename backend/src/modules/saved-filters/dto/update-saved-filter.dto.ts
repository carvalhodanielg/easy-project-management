import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateSavedFilterDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

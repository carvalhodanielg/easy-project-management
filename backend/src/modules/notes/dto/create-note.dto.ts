import { IsString, IsOptional, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;
}

export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @ValidateIf((o: UpdateNoteDto) => o.label !== null)
  @IsString()
  @MaxLength(50)
  label?: string | null;
}

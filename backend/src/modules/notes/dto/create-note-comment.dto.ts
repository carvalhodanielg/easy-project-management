import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateNoteCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}

export class UpdateNoteCommentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content?: string;
}

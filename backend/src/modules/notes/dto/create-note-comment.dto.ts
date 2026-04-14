import { IsString, IsOptional, IsArray, IsMongoId, MinLength, MaxLength } from 'class-validator';

export class CreateNoteCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  mentionIds?: string[];
}

export class UpdateNoteCommentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  mentionIds?: string[];
}

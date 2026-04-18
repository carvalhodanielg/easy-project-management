import {
  IsString,
  IsOptional,
  IsArray,
  IsMongoId,
  MinLength,
} from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  mentionIds?: string[];
}

export class UpdateCommentDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  mentionIds?: string[];
}

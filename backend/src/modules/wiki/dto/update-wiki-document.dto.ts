import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateWikiDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateWikiDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  content?: string;
}

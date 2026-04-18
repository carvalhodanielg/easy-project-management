import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateListDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}

export class UpdateListDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}

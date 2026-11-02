import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class SizeInputDto {
  @IsString() @MinLength(1) @MaxLength(40)
  label!: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  sortOrder?: number;
}

export class CreateSizeTemplateDto {
  @IsString() @MinLength(1) @MaxLength(100)
  name!: string;

  @IsString() @MinLength(1) @MaxLength(120)
  slug!: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => SizeInputDto)
  sizes!: SizeInputDto[];

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class UpdateSizeTemplateDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100)
  name?: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class AddSizeDto extends SizeInputDto {}

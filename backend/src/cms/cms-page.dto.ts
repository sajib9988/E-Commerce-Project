import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsObject,
  IsOptional, IsString, IsNotEmpty, Matches, MaxLength, ValidateNested,
} from 'class-validator';


export class CmsBlockDto {
  @IsOptional() @IsString() id?: string;          // ignore kora hoy
  @IsOptional() @IsInt() sortOrder?: number;      // array index theke nibo

  @IsEnum(CmsBlockType) type!: CmsBlockType;
  @IsObject() content!: Record<string, unknown>;
  @IsOptional() @IsObject() settings?: Record<string, unknown>;
  @IsOptional() @IsBoolean() isVisible?: boolean;
}

export class CmsSectionDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsInt() sortOrder?: number;

  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsObject() settings?: Record<string, unknown>;
  @IsOptional() @IsBoolean() isVisible?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CmsBlockDto)
  blocks!: CmsBlockDto[];
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateCmsPageDto {
  @IsString() @IsNotEmpty() name!: string;
  @Matches(SLUG, { message: 'slug must be lowercase-with-dashes' }) slug!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() @MaxLength(70) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(160) seoDescription?: string;
  @IsOptional() @IsString() ogImage?: string;
  @IsOptional() @IsDateString() publishAt?: string;
}

export class UpdateCmsPageDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @Matches(SLUG) slug?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(CmsPageStatu) status?: CmsPageStatus;
  @IsOptional() @IsString() @MaxLength(70) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(160) seoDescription?: string;
  @IsOptional() @IsString() ogImage?: string;
  @IsOptional() @IsDateString() publishAt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CmsSectionDto)
  sections?: CmsSectionDto[];
}
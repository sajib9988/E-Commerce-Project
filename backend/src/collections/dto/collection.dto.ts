import {
  IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches,
  MaxLength, Min,
} from 'class-validator';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateCollectionDto {
  @IsString() @IsNotEmpty() @MaxLength(120)
  name!: string;

  @IsString() @IsNotEmpty() @Matches(SLUG)
  slug!: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @IsOptional() @IsString() @MaxLength(2048)
  bannerImage?: string;

  @IsOptional() @IsString() @MaxLength(2048)
  thumbnail?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsBoolean()
  isFeatured?: boolean;

  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;
}

export class UpdateCollectionDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120)
  name?: string;

  @IsOptional() @IsString() @IsNotEmpty() @Matches(SLUG)
  slug?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  description?: string;

  @IsOptional() @IsString() @MaxLength(2048)
  bannerImage?: string;

  @IsOptional() @IsString() @MaxLength(2048)
  thumbnail?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsBoolean()
  isFeatured?: boolean;

  @IsOptional() @IsInt() @Min(0)
  sortOrder?: number;
}

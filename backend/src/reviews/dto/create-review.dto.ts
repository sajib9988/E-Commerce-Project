import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  // An empty title is allowed so PATCH can intentionally clear an existing title.
  // The service stores blank optional titles as null.
  @ValidateIf((_object, value) => value !== '')
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  body!: string;
}

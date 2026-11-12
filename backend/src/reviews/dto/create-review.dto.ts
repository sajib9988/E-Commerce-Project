import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @Transform(({ value }) => (value === "" ? undefined : value))
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

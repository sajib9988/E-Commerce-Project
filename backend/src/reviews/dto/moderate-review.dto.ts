import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ModerateReviewDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note?: string;
}

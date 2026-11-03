import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ModerateReviewDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional() @IsString() @MaxLength(500)
  note?: string;
}

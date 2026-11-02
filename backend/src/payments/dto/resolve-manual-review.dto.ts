import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class ResolveManualReviewDto {
  @IsIn(['REFUND', 'RESOLVE_NO_REFUND'])
  decision!: 'REFUND' | 'RESOLVE_NO_REFUND';

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  note!: string;
}

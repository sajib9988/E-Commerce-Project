import { IsIn, IsString, MaxLength } from 'class-validator';

export class ReviewRefundRequestDto {
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  @IsString() @MaxLength(500)
  note!: string;
}

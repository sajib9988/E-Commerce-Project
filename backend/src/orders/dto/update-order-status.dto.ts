import { IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsIn(['SHIPPED', 'DELIVERED'])
  status!: 'SHIPPED' | 'DELIVERED';
}

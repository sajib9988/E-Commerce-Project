import { IsEnum } from 'class-validator';
import { ContactStatus } from '../../../generated/prisma/enums';

export class UpdateContactStatusDto {
  @IsEnum(ContactStatus)
  status!: ContactStatus;
}

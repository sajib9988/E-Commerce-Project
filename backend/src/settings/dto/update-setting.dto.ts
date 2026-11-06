import { IsDefined, IsString, MaxLength, MinLength } from 'class-validator';
export class UpdateSettingDto {
  @IsString() @MinLength(2) @MaxLength(100) key!: string;
  @IsDefined() value!: unknown;
}
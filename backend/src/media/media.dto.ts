import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class UploadMediaDto {
     @IsOptional() @IsString() @MaxLength(500) altText?: string;
}
 export class UpdateMediaDto {
    @IsOptional() @IsString() @IsNotEmpty() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(500) altText?: string;
}

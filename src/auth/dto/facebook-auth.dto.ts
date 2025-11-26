import { IsString, IsNotEmpty } from 'class-validator';

export class FacebookAuthDto {
  @IsString()
  @IsNotEmpty()
  token: string; // Facebook access token from frontend
}

import { IsEmail, MinLength, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  username: string;
  @IsEmail()
  email: string;
  @IsString()
  @MinLength(6)
  password: string;
  /*firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  birthDate?: Date;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  profilePictureUrl?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  role?: string; // e.g., 'user', 'admin'
  isVerified?: boolean; // for email verification
  lastLogin?: Date; // for tracking user activity
  preferences?: {
    language?: string;
    timezone?: string;
    notificationSettings?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
  };*/
  /*socialMediaLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  additionalInfo?: string; // for any extra information that might be needed
*/
}

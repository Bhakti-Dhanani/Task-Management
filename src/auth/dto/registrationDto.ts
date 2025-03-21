import{IsString,IsNotEmpty,IsEmail,MinLength}from 'class-validator'
export class registrationDto{
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @IsString()
    @IsNotEmpty()
    lastName: string;
  
    @IsEmail()
    email: string;
  
    @IsNotEmpty()
    @MinLength(8)
    password: string;

}
 
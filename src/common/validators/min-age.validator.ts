// src/common/validators/min-age.validator.ts

import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Calcula la edad exacta en años, teniendo en cuenta mes y día.
 * Acepta Date o string ISO (e.g. '1990-05-02' o '1990-05-02T00:00:00Z').
 */
function calcAge(dateInput: Date | string): number {
  const dob = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(dob.getTime())) return -1; // inválida

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Decorador @MinAge(n)
 * Uso típico en DTO:
 *
 *  @IsDateString()
 *  @MinAge(18, { message: 'Debes ser mayor de 18 años.' })
 *  dateOfBirth: string;
 */
export function MinAge(minYears = 18, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'MinAge',
      target: object.constructor,
      propertyName,
      constraints: [minYears],
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (value === null || value === undefined || value === '')
            return false;
          const age = calcAge(value);
          return age >= minYears;
        },
        defaultMessage(args?: ValidationArguments) {
          const [min] = args?.constraints ?? [18];
          return `Debes tener al menos ${min} años.`;
        },
      },
    });
  };
}

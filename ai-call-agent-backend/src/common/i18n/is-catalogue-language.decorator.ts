import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isCatalogueLanguageCode } from './language-catalogue';

@ValidatorConstraint({ name: 'isCatalogueLanguageCode', async: false })
export class IsCatalogueLanguageCodeConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    return typeof value === 'string' && isCatalogueLanguageCode(value);
  }

  defaultMessage(): string {
    return 'Language must be a supported catalogue language code (e.g. en, ur, fr).';
  }
}

export function IsCatalogueLanguageCode(
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCatalogueLanguageCodeConstraint,
    });
  };
}

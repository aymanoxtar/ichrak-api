import { SetMetadata } from '@nestjs/common';

export const CHECK_DOMAIN_KEY = 'checkDomain';
export const CheckDomain = () => SetMetadata(CHECK_DOMAIN_KEY, true);

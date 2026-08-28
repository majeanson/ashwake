// TEMPORARY scaffold so the English move typechecks; replaced by the real
// French catalogue in the same session.
import { STRINGS_EN } from './en';
import type { Strings } from './Strings';

export const STRINGS_FR: Strings = { ...STRINGS_EN, locale: 'fr-CA' };

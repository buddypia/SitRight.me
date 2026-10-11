import { DEFAULT_LOCALE, MESSAGES, type Messages } from '@/i18n/messages';
import { useAppStore } from '@/stores/appStore';

export function useT(): Messages {
  const locale = useAppStore((s) => s.settings.locale);
  return MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
}

import { useI18n } from './index';

type Props = {
  className?: string;
};

export function LanguageToggle({ className }: Props) {
  const { lang, toggleLang, t } = useI18n();
  const next = lang === 'ru' ? 'en' : 'ru';

  return (
    <button
      type="button"
      className={className ? `langToggle ${className}` : 'langToggle'}
      onClick={toggleLang}
      title={t('lang.switchTo', { lang: t(`lang.name.${next}`) })}
      aria-label={t('lang.switchTo', { lang: t(`lang.name.${next}`) })}
    >
      {t(`lang.short.${lang}`)}
    </button>
  );
}

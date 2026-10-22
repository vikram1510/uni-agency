import copy from '@data/i18n/nova.json';

export type NovaLocale = 'en';

export function getNovaCopy(_locale: NovaLocale = 'en') {
  return copy.en;
}

export function getNovaSectionCopy(locale: NovaLocale, dataKey?: string) {
  if (!dataKey) return undefined;
  return getNovaCopy(locale).sections[dataKey as keyof typeof copy.en.sections];
}

function withNovaBase(path: string): string {
  const configuredBase = process.env.PUBLIC_BASE_PATH || import.meta.env.BASE_URL;
  const base = configuredBase === '/'
    ? ''
    : `/${configuredBase.replace(/^\/+|\/+$/g, '')}`;
  return `${base}${path}` || '/';
}

export function getNovaNavigationPath(href: string, _locale: NovaLocale = 'en'): string {
  if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return href;
  }
  if (href.startsWith('#')) return withNovaBase(`/${href}`);

  return withNovaBase(href.startsWith('/') ? href : `/${href}`);
}

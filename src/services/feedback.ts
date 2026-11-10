import { Language } from '../i18n/translations';

/**
 * Constructs a prefilled GitHub issue URL with diagnostic environment information.
 */
export function getFeedbackIssueUrl(locale: Language = 'en'): string {
  const isBrowser = typeof window !== 'undefined';
  const userAgent = typeof navigator !== 'undefined' ? (navigator.userAgent || 'Unknown') : 'Unknown';
  const platform = typeof navigator !== 'undefined' ? (navigator.platform || 'Unknown') : 'Unknown';
  const screenRes = isBrowser && typeof window.screen !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'N/A';
  const viewportSize = isBrowser ? `${window.innerWidth}x${window.innerHeight}` : 'N/A';
  const dpr = isBrowser ? (window.devicePixelRatio || 1) : 1;
  const lang = typeof navigator !== 'undefined' ? (navigator.language || locale) : locale;
  const currentUrl = isBrowser && window.location ? window.location.href : 'https://sidlocz.github.io/MyiNatAnimated/';

  let browser = 'Unknown';
  if (/Edg\//i.test(userAgent)) {
    browser = 'Microsoft Edge';
  } else if (/OPR\//i.test(userAgent) || /Opera/i.test(userAgent)) {
    browser = 'Opera';
  } else if (/Chrome\//i.test(userAgent)) {
    browser = 'Google Chrome / Chromium';
  } else if (/Firefox\//i.test(userAgent)) {
    browser = 'Mozilla Firefox';
  } else if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) {
    browser = 'Apple Safari';
  }

  const body = `### Description / Popis problému či návrhu
<!-- Please describe the bug or feature request / Popište prosím chybu nebo návrh na novou funkci -->


### Steps to Reproduce / Postup reprodukce (pokud jde o chybu)
1. 
2. 
3. 

### Expected Behavior / Očekávané chování


---
### Client Environment / Diagnostické informace
- **Browser:** ${browser} (${userAgent})
- **Platform:** ${platform}
- **Screen:** ${screenRes}
- **Viewport:** ${viewportSize} (DPR: ${dpr})
- **App Language:** ${locale} (Browser: ${lang})
- **URL:** ${currentUrl}
`;

  const params = new URLSearchParams({
    title: '[Feedback]: ',
    body,
  });

  return `https://github.com/SidloCZ/MyiNatAnimated/issues/new?${params.toString()}`;
}

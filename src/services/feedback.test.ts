import { describe, it, expect } from 'vitest';
import { getFeedbackIssueUrl } from './feedback';

describe('getFeedbackIssueUrl', () => {
  it('generates a valid GitHub new issue URL with query parameters', () => {
    const url = getFeedbackIssueUrl('en');
    expect(url).toContain('https://github.com/SidloCZ/MyiNatAnimated/issues/new?');
    expect(url).toContain('title=');
    expect(url).toContain('body=');
  });

  it('includes environment diagnostics in the body parameter', () => {
    const url = getFeedbackIssueUrl('cs');
    const parsed = new URL(url);
    const body = parsed.searchParams.get('body') || '';

    expect(body).toContain('Description / Popis');
    expect(body).toContain('Steps to Reproduce');
    expect(body).toContain('Client Environment');
    expect(body).toContain('Browser:');
  });
});


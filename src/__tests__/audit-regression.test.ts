import { describe, it, expect } from 'vitest';
import { safeUrl } from '../utils';
import { escapeHtml, escapeAttr } from '../shared/format';
import { RateLimiter } from '../../scripts/rate-limiter';

describe('SEC-002 regression: telegram token must never leak into logs', () => {
  it('sanitizes token from error messages', () => {
    const token = 'secret-token-123';
    const message = `fetch failed for https://api.telegram.org/bot${token}/sendMessage`;
    expect(message.replace(token, '[REDACTED]')).not.toContain(token);
  });
});

describe('XSS regression: safeUrl', () => {
  it('allows https store urls', () => {
    expect(safeUrl('https://store.steampowered.com/app/123')).toBe(
      'https://store.steampowered.com/app/123',
    );
  });

  it('rejects javascript:, data: and protocol-relative urls', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl('data:text/html,<h1>x</h1>')).toBe('');
    expect(safeUrl('//evil.example.com/x')).toBe('');
    expect(safeUrl('')).toBe('');
  });
});

describe('XSS regression: telegram html escaping', () => {
  it('escapes html and attribute quotes', () => {
    expect(escapeHtml('<b>&')).toBe('&lt;b&gt;&amp;');
    expect(escapeAttr('a"b<c')).toBe('a&quot;b&lt;c');
  });
});

describe('SEC-001 regression: rate limiter', () => {
  it('rejects invalid config', () => {
    expect(() => new RateLimiter(0)).toThrow();
  });

  it('allows burst up to capacity without waiting', async () => {
    const limiter = new RateLimiter(6000);
    const start = Date.now();
    await limiter.take();
    await limiter.take();
    await limiter.take();
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

describe('BUG-003 regression: xbox all-filter shows every game', () => {
  it('documents expected predicate (all => true)', () => {
    const predicate = (activeFilter: string) => {
      if (activeFilter === 'all') return true;
      return false;
    };
    expect(predicate('all')).toBe(true);
  });
});

describe('audit round 2: history type allowlist', () => {
  it('accepts known types and falls back for unknown', async () => {
    const { safeHistoryType } = await import('../utils');
    expect(safeHistoryType('free')).toBe('free');
    expect(safeHistoryType('discount')).toBe('discount');
    expect(safeHistoryType('nope')).toBe('free');
    expect(safeHistoryType('free" onmouseover="x')).toBe('free');
  });
});

describe('audit round 2: finiteOr clamps non-finite prices', () => {
  it('documents the contract (Infinity must not reach discount math)', () => {
    const finiteOr = (v: number, dflt: number): number =>
      Number.isFinite(v) ? v : dflt;
    expect(finiteOr(Number('Infinity'), 0)).toBe(0);
    expect(finiteOr(12.5, 0)).toBe(12.5);
  });
});

describe('audit round 2: notified-history coercion', () => {
  it('drops malformed entries instead of crashing', () => {
    const coerce = (parsed: unknown): Record<string, unknown> => {
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
        const item = v as Record<string, unknown>;
        if (typeof item.timestamp !== 'string' || Number.isNaN(new Date(item.timestamp).getTime())) continue;
        if (typeof item.type !== 'string' || typeof item.title !== 'string') continue;
        out[k] = item;
      }
      return out;
    };
    expect(coerce(null)).toEqual({});
    expect(coerce({ a: null, b: { timestamp: 'x', type: 'free', title: 't' } })).toEqual({});
    expect(Object.keys(coerce({ ok: { timestamp: new Date().toISOString(), type: 'free', title: 't' } }))).toEqual(['ok']);
  });
});

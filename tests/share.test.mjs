import test from 'node:test';
import assert from 'node:assert/strict';
import { challengeLink } from '../public/assets/share.js';

test('a daily challenge link preserves the actual date and score on a clean origin', () => {
  assert.equal(challengeLink({origin:'https://example.com',mode:'daily',seed:'daily:2026-10-29',date:'2026-10-29',score:812,language:'zh-Hant'}),
    'https://example.com/v1/?challenge=2026-10-29&target=812&lang=zh-Hant');
});

test('a practice receipt links to its own reproducible run rather than a different daily challenge', () => {
  assert.equal(challengeLink({origin:'https://example.com',mode:'practice',seed:'practice:0123456789abcdef',date:'2026-10-29',score:936,language:'en'}),
    'https://example.com/v1/?run=0123456789abcdef&target=936&lang=en');
});

import { describe, expect, it } from 'vitest';
import { DESFECHOS, ehDesfecho } from './desfechos';

describe('ehDesfecho', () => {
  it('aceita os três e recusa o resto', () => {
    for (const d of DESFECHOS) expect(ehDesfecho(d)).toBe(true);
    expect(ehDesfecho('ganho')).toBe(false);
    expect(ehDesfecho('')).toBe(false);
    expect(ehDesfecho(null)).toBe(false);
    expect(ehDesfecho(42)).toBe(false);
  });
});

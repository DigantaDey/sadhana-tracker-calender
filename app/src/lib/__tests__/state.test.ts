import { describe, expect, it } from 'vitest';
import { createInitialState, normaliseState } from '../initialState';
import { extractLinks, extractTags, renderMarkdown } from '../markdown';

describe('a new install', () => {
  it('starts with no vows, no marks and no entries', () => {
    const state = createInitialState();
    expect(state.version).toBe(2);
    expect(state.sankalps).toEqual([]);
    expect(state.completions).toEqual({});
    expect(state.notes).toEqual([]);
    expect(state.settings.onboarded).toBe(false);
    expect(state.settings.name).toBe('');
  });

  it('keeps reminders quiet until the user asks', () => {
    expect(createInitialState().settings.notifications.enabled).toBe(false);
  });

  it('has a usable pañcāṅga place out of the box', () => {
    const place = createInitialState().settings.panchang;
    expect(place.latitude).toBeGreaterThanOrEqual(-90);
    expect(place.latitude).toBeLessThanOrEqual(90);
    expect(place.longitude).toBeGreaterThanOrEqual(-180);
    expect(place.longitude).toBeLessThanOrEqual(180);
    expect(place.timeZone.length).toBeGreaterThan(2);
  });
});

describe('loading a stored payload', () => {
  it('rejects junk instead of throwing', () => {
    expect(normaliseState(null)).toBeNull();
    expect(normaliseState('nope')).toBeNull();
    expect(normaliseState({ sankalps: 'not an array' })?.sankalps).toEqual([]);
  });

  it('drops the retired sample journal from a version-1 payload', () => {
    const migrated = normaliseState({
      version: 1,
      sankalps: [{ id: 'sk-gayatri', name: 'Gāyatrī Japa' }],
      completions: { 'sk-gayatri::2026-01-01': { sankalpId: 'sk-gayatri', date: '2026-01-01' } },
      notes: [{ id: 'note-the-dip', title: 'The dip' }],
      settings: { name: 'Aditya' },
    })!;
    expect(migrated.sankalps).toEqual([]);
    expect(migrated.notes).toEqual([]);
    expect(migrated.completions).toEqual({});
    expect(migrated.settings.onboarded).toBe(false);
  });

  it('keeps real work from a version-1 payload', () => {
    const migrated = normaliseState({
      version: 1,
      sankalps: [
        {
          id: 'sk-mine',
          name: 'My japa',
          category: 'japa',
          color: 'jade',
          glyph: 'ॐ',
          startedOn: '2026-01-01',
          endsOn: null,
          frequency: { kind: 'daily' },
          time: null,
          targetCount: 27,
          reminder: { enabled: false, leadMinutes: 0, snoozeMinutes: 15 },
          status: 'active',
          createdAt: 0,
        },
      ],
      completions: {
        'sk-mine::2026-01-02': {
          id: 'sk-mine::2026-01-02',
          sankalpId: 'sk-mine',
          date: '2026-01-02',
          done: true,
          updatedAt: 1,
        },
        'sk-gayatri::2026-01-02': {
          id: 'sk-gayatri::2026-01-02',
          sankalpId: 'sk-gayatri',
          date: '2026-01-02',
          done: true,
          updatedAt: 1,
        },
      },
      notes: [{ id: 'note-mine', date: '2026-01-02', title: 'Mine', body: '', createdAt: 0, updatedAt: 0 }],
    })!;
    expect(migrated.sankalps).toHaveLength(1);
    expect(Object.keys(migrated.completions)).toEqual(['sk-mine::2026-01-02']);
    expect(migrated.notes).toHaveLength(1);
    expect(migrated.settings.onboarded).toBe(true);
    expect(migrated.settings.panchang.timeZone).toBeTruthy();
  });
});

describe('markdown', () => {
  it('escapes everything an author could inject', () => {
    const html = renderMarkdown('<script>alert(1)</script> & "quotes"').html;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders wiki links, tags and emphasis', () => {
    const parsed = renderMarkdown('Read [[Day 40]] and **sit** #japa');
    expect(parsed.links).toEqual(['Day 40']);
    expect(parsed.tags).toEqual(['japa']);
    expect(parsed.html).toContain('<strong>sit</strong>');
  });

  it('never treats a heading as a tag', () => {
    expect(extractTags('# Heading\n\nbody #real')).toEqual(['real']);
    expect(extractLinks('[[a]] and [[b]] and [[a]]')).toEqual(['a', 'b']);
  });
});

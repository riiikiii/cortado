import { describe, expect, it } from 'vitest';
import { lessonTitle, neighbours, readingOrder } from './tree';

const paths = [
  'Welcome.md',
  'Course/10 Wrap up.md',
  'Course/2 Basics.md',
  'Course/1 Intro.html',
  'Course/assets/style.css',
  'Course/Extra/Deep dive.md',
  '.obsidian/app.json',
  'Notes/Ideas.md',
];

describe('library tree', () => {
  it('orders lessons like the sidebar, with the welcome note first', () => {
    expect(readingOrder(paths)).toEqual([
      'Welcome.md',
      'Course/Extra/Deep dive.md',
      'Course/1 Intro.html',
      'Course/2 Basics.md',
      'Course/10 Wrap up.md',
      'Notes/Ideas.md',
    ]);
    expect(readingOrder(['b/x.md', 'Zed.md'])).toEqual(['b/x.md', 'Zed.md']);
  });

  it('finds the previous and next lesson', () => {
    const order = readingOrder(paths);
    expect(neighbours(order, 'Course/2 Basics.md')).toEqual({ prev: 'Course/1 Intro.html', next: 'Course/10 Wrap up.md' });
    expect(neighbours(order, 'Welcome.md').next).toBe('Course/Extra/Deep dive.md');
    expect(neighbours(order, 'Notes/Ideas.md').next).toBeUndefined();
    expect(neighbours(order, 'missing.md')).toEqual({});
  });

  it('pulls lesson numbers out of titles', () => {
    expect(lessonTitle('01 Getting started')).toEqual({ number: '1', title: 'Getting started' });
    expect(lessonTitle('3. Loops')).toEqual({ number: '3', title: 'Loops' });
    expect(lessonTitle('2024 review')).toEqual({ title: '2024 review' });
    expect(lessonTitle('00 Start here')).toEqual({ title: 'Start here' });
    expect(lessonTitle('Colour theory')).toEqual({ title: 'Colour theory' });
  });
});

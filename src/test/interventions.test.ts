import { describe, it, expect } from 'vitest';
import { galleryItemSchema, publicationSchema, siteMediaSchema, interventionPhotos } from '@/lib/interventions';
const legacy = { url: '/after.jpeg', beforeUrl: '/before.jpeg', title: 'Canapé', category: 'Canapés' };
const complete = { ...legacy, videoUrl: '/video.mp4', beforePhotos: ['/b1.jpeg', '/b2.jpeg', '/b3.jpeg'], afterPhotos: ['/a1.jpeg', '/a2.jpeg', '/a3.jpeg'] };
describe('Publications d’interventions', () => {
  it('preserves legacy galleries', () => { expect(galleryItemSchema.safeParse(legacy).success).toBe(true); expect(interventionPhotos(legacy, 'before')).toEqual(['/before.jpeg']); });
  it('requires one video and exactly three photos each side', () => { expect(publicationSchema.safeParse(complete).success).toBe(true); expect(publicationSchema.safeParse(legacy).success).toBe(false); expect(publicationSchema.safeParse({ ...complete, beforePhotos: ['', '/2.jpeg', '/3.jpeg'] }).success).toBe(false); expect(publicationSchema.safeParse({ ...complete, afterPhotos: ['/1.jpeg'] }).success).toBe(false); });
  it('rejects unsafe media URLs', () => expect(publicationSchema.safeParse({ ...complete, videoUrl: 'javascript:alert(1)' }).success).toBe(false));
  it('limits uploads by media type', () => { expect(siteMediaSchema.safeParse({ type: 'video/mp4', size: 20 * 1024 * 1024 }).success).toBe(true); expect(siteMediaSchema.safeParse({ type: 'image/jpeg', size: 6 * 1024 * 1024 }).success).toBe(false); expect(siteMediaSchema.safeParse({ type: 'video/mp4', size: 21 * 1024 * 1024 }).success).toBe(false); });
});
import { z } from 'zod';

const mediaUrl = z.string().max(2000).refine(v => v === '' || (v.startsWith('/') && !v.startsWith('//')) || /^https:\/\//.test(v), 'Utilisez une adresse HTTPS ou du site.');
export const galleryItemSchema = z.object({
  url: mediaUrl, beforeUrl: mediaUrl, title: z.string().max(200), category: z.string().max(80),
  videoUrl: mediaUrl.optional(), beforePhotos: z.array(mediaUrl).length(3).optional(), afterPhotos: z.array(mediaUrl).length(3).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), description: z.string().max(2000).optional(),
});
export type Intervention = z.infer<typeof galleryItemSchema>;
export const publicationSchema = galleryItemSchema.refine(g => Boolean(g.title.trim() && g.videoUrl && g.beforePhotos?.every(Boolean) && g.afterPhotos?.every(Boolean)), 'Ajoutez un titre, une vidéo, trois photos avant et trois photos après.');
const MAX_SITE_VIDEO_BYTES = 20 * 1024 * 1024;
const MAX_SITE_IMAGE_BYTES = 5 * 1024 * 1024;
export const siteMediaSchema = z.object({ type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']), size: z.number().int().positive() }).refine(v => v.size <= (v.type.startsWith('video/') ? MAX_SITE_VIDEO_BYTES : MAX_SITE_IMAGE_BYTES), 'VIDÉO : 20 Mo maximum. PHOTO : 5 Mo maximum.');
export function interventionPhotos(g: Intervention, phase: 'before' | 'after') {
  return (phase === 'before' ? g.beforePhotos ?? [g.beforeUrl] : g.afterPhotos ?? [g.url]).filter(Boolean);
}
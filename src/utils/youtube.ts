/**
 * Utility to reliably convert any YouTube URL into an embeddable iframe URL.
 * Supports:
 * - Direct 11-character video IDs (e.g. Q0AY6086U2Y)
 * - Standard watch URLs (https://www.youtube.com/watch?v=...)
 * - Short URLs (https://youtu.be/...)
 * - Shorts (https://www.youtube.com/shorts/...)
 * - Live streams (https://www.youtube.com/live/...)
 * - Playlists & Mixes (https://youtube.com/playlist?list=RD...)
 * - Embed URLs (https://www.youtube.com/embed/...)
 */
export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();

  // 1. Direct 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return `https://www.youtube.com/embed/${trimmed}?autoplay=0&rel=0&modestbranding=1`;
  }

  // 2. Already an embed URL
  if (trimmed.includes('youtube.com/embed/')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);

    // Check ?v= query param
    const v = parsed.searchParams.get('v');
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
      return `https://www.youtube.com/embed/${v}?autoplay=0&rel=0&modestbranding=1`;
    }

    // Check pathname: /shorts/ID, /live/ID, /embed/ID, /v/ID
    const matchPath = parsed.pathname.match(/\/(?:shorts|live|embed|v)\/([a-zA-Z0-9_-]{11})/);
    if (matchPath && matchPath[1]) {
      return `https://www.youtube.com/embed/${matchPath[1]}?autoplay=0&rel=0&modestbranding=1`;
    }

    // youtu.be/ID
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0].split('?')[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) {
        return `https://www.youtube.com/embed/${id}?autoplay=0&rel=0&modestbranding=1`;
      }
    }

    // Check ?list= query param (playlists & RD radio mixes)
    const list = parsed.searchParams.get('list');
    if (list) {
      if (list.startsWith('RD') && list.length >= 13) {
        const potentialId = list.substring(2, 13);
        if (/^[a-zA-Z0-9_-]{11}$/.test(potentialId)) {
          return `https://www.youtube.com/embed/${potentialId}?list=${list}&autoplay=0&rel=0&modestbranding=1`;
        }
      }
      return `https://www.youtube.com/embed/videoseries?list=${list}&autoplay=0&rel=0&modestbranding=1`;
    }
  } catch (e) {
    // Ignore URL parsing errors and try fallback regex
  }

  // 3. Fallback regex search for any 11-char video ID in the string
  const idMatch = trimmed.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/|RD)([a-zA-Z0-9_-]{11})/);
  if (idMatch && idMatch[1]) {
    return `https://www.youtube.com/embed/${idMatch[1]}?autoplay=0&rel=0&modestbranding=1`;
  }

  return null;
}

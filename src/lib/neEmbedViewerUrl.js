/** Append Kissflow viewer identity onto Notification Engine embed URLs. */

export function appendNeEmbedViewerParams(rawUrl, { name = '', title = '' } = {}) {
  const href = String(rawUrl || '').trim();
  if (!href) return '';
  try {
    const url = new URL(href);
    const isNeEmbed = url.searchParams.get('embed') === '1'
      || /refex-admin-ui/i.test(url.hostname);
    if (!isNeEmbed) return href;
    const viewerName = String(name || '').trim();
    const viewerTitle = String(title || '').trim();
    if (viewerName) url.searchParams.set('user_name', viewerName);
    if (viewerTitle) url.searchParams.set('user_title', viewerTitle);
    return url.toString();
  } catch {
    return href;
  }
}

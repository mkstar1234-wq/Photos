/**
 * Generates a 512x512 colored icon for a folder based on a name string hash
 * and returns a Base64 data URL.
 */
export function generateFolderIcon(folderName: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const initial = (folderName.trim().charAt(0) || 'F').toUpperCase();

  // String to color hash for a unique, vibrant background
  let hash = 0;
  for (let i = 0; i < folderName.length; i++) {
    hash = folderName.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const hue = Math.abs(hash) % 360;
  const color1 = `hsl(${hue}, 75%, 45%)`;
  const color2 = `hsl(${(hue + 45) % 360}, 85%, 28%)`;

  // Draw background gradient
  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle inner frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, 496, 496);

  // Draw first letter precisely in center
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 280px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, 256, 268);

  return canvas.toDataURL('image/png');
}

/**
 * Generates the folder icon, replaces favicons in document.head,
 * updates document title, and returns the generated base64 URL.
 */
export function applyFolderFavicon(folderName: string): string {
  const dataUrl = generateFolderIcon(folderName);
  if (!dataUrl) return '';

  // Rel types to update/replace in <head>
  const rels = ['icon', 'shortcut icon', 'apple-touch-icon'];

  rels.forEach((rel) => {
    let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.href = dataUrl;
  });

  // Update document title so browser suggests folder name on 'Add to Home Screen'
  document.title = `${folderName} Receipt Camera`;

  return dataUrl;
}

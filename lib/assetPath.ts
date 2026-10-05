/**
 * Resolve o caminho de um asset público respeitando o `base` do Vite.
 *
 * Em desenvolvimento (base = '/'):
 *   assetPath('/waiting-background.png') → '/waiting-background.png'
 *
 * Em produção no GitHub Pages (base = '/grande_premio_da_etica/'):
 *   assetPath('/waiting-background.png') → '/grande_premio_da_etica/waiting-background.png'
 */
export function assetPath(path: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${cleanPath}`;
}

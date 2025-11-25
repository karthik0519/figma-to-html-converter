// Helper utilities

export function sanitizeClassName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function rgbaToCSS(r: number, g: number, b: number, a: number): string {
  const red = Math.round(r * 255);
  const green = Math.round(g * 255);
  const blue = Math.round(b * 255);
  
  if (a === 1) {
    return `rgb(${red}, ${green}, ${blue})`;
  }
  return `rgba(${red}, ${green}, ${blue}, ${a})`;
}

export function extractFileId(input: string): string | null {
  // Handle direct file ID
  if (/^[a-zA-Z0-9]+$/.test(input)) {
    return input;
  }
  
  // Extract from Figma URL
  const match = input.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

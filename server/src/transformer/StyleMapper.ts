import type { Fill, Stroke, Effect, RGBA, TextStyle } from '../types/figma.js';
import type { CSSProperties } from '../types/internal.js';
import { rgbaToCSS } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

const WEB_SAFE_FONTS = [
  'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Courier New', 'Courier',
  'Verdana', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
  'Trebuchet MS', 'Arial Black', 'Impact'
];

export class StyleMapper {
  private warnings: string[] = [];

  getWarnings(): string[] {
    return this.warnings;
  }

  mapFillsToCSS(fills: Fill[]): CSSProperties {
    const css: CSSProperties = {};

    if (!fills || fills.length === 0) {
      return css;
    }

    // Process fills in reverse order (Figma layers bottom-to-top, CSS top-to-bottom)
    const visibleFills = fills.filter(f => f.visible !== false);
    
    if (visibleFills.length === 0) {
      return css;
    }

    if (visibleFills.length === 1) {
      const fill = visibleFills[0];
      this.applySingleFill(css, fill);
    } else {
      // Multiple fills - use background-image with layers
      const backgrounds: string[] = [];
      
      for (let i = visibleFills.length - 1; i >= 0; i--) {
        const fill = visibleFills[i];
        const bg = this.fillToBackgroundString(fill);
        if (bg) {
          backgrounds.push(bg);
        }
      }
      
      if (backgrounds.length > 0) {
        css.background = backgrounds.join(', ');
      }
    }

    return css;
  }

  mapStrokesToCSS(strokes: Stroke[]): CSSProperties {
    const css: CSSProperties = {};

    if (!strokes || strokes.length === 0) {
      return css;
    }

    const visibleStrokes = strokes.filter(s => s.visible !== false);
    
    if (visibleStrokes.length === 0) {
      return css;
    }

    // Use the first visible stroke
    const stroke = visibleStrokes[0];
    
    if (stroke.type === 'SOLID' && stroke.color) {
      const weight = stroke.weight || 1;
      const color = rgbaToCSS(stroke.color.r, stroke.color.g, stroke.color.b, stroke.color.a);
      
      css.border = `${weight}px solid ${color}`;
      
      // Adjust for stroke alignment
      if (stroke.align === 'INSIDE') {
        css.boxSizing = 'border-box';
      } else if (stroke.align === 'OUTSIDE') {
        // Use outline for outside strokes
        css.outline = `${weight}px solid ${color}`;
        delete css.border;
      }
    } else if (stroke.type.startsWith('GRADIENT')) {
      // Gradient borders are complex - use border-image
      const gradient = this.createGradientString(stroke as any);
      if (gradient) {
        css.borderWidth = `${stroke.weight || 1}px`;
        css.borderStyle = 'solid';
        css.borderImage = `${gradient} 1`;
      }
    }

    return css;
  }

  mapEffectsToCSS(effects: Effect[]): CSSProperties {
    const css: CSSProperties = {};

    if (!effects || effects.length === 0) {
      return css;
    }

    const visibleEffects = effects.filter(e => e.visible !== false);
    
    if (visibleEffects.length === 0) {
      return css;
    }

    const shadows: string[] = [];
    const filters: string[] = [];

    for (const effect of visibleEffects) {
      switch (effect.type) {
        case 'DROP_SHADOW':
          shadows.push(this.createDropShadow(effect));
          break;
        case 'INNER_SHADOW':
          shadows.push(this.createInnerShadow(effect));
          break;
        case 'LAYER_BLUR':
          filters.push(`blur(${effect.radius}px)`);
          break;
        case 'BACKGROUND_BLUR':
          css.backdropFilter = `blur(${effect.radius}px)`;
          break;
      }
    }

    if (shadows.length > 0) {
      css.boxShadow = shadows.join(', ');
    }

    if (filters.length > 0) {
      css.filter = filters.join(' ');
    }

    return css;
  }

  mapTypographyToCSS(style?: TextStyle): CSSProperties {
    const css: CSSProperties = {};

    if (!style) {
      return css;
    }

    // Font family
    if (style.fontFamily) {
      css.fontFamily = this.normalizeFontFamily(style.fontFamily);
      
      // Check if it's a custom font
      if (!this.isWebSafeFont(style.fontFamily)) {
        const warning = `Custom font "${style.fontFamily}" may not render correctly without font files`;
        this.warnings.push(warning);
        logger.warn(warning);
      }
    }

    // Font size
    if (style.fontSize) {
      css.fontSize = `${style.fontSize}px`;
    }

    // Font weight
    if (style.fontWeight) {
      css.fontWeight = style.fontWeight;
    }

    // Line height - use exact values from Figma
    if (style.lineHeightPx) {
      // Use precise pixel value
      css.lineHeight = `${Math.round(style.lineHeightPx * 100) / 100}px`;
    } else if (style.lineHeightPercent) {
      // Convert percent to unitless value for better accuracy
      const lineHeightValue = style.lineHeightPercent / 100;
      css.lineHeight = lineHeightValue.toFixed(3);
    } else if (style.lineHeightUnit === 'AUTO') {
      css.lineHeight = 'normal';
    }

    // Letter spacing - Figma uses percentage of font size, convert to pixels
    if (style.letterSpacing !== undefined && style.letterSpacing !== 0) {
      // Figma letter spacing is in pixels or percentage
      // Use precise value with decimal places
      const letterSpacing = Math.round(style.letterSpacing * 100) / 100;
      css.letterSpacing = `${letterSpacing}px`;
    }

    // Text alignment
    if (style.textAlignHorizontal) {
      const align = style.textAlignHorizontal.toLowerCase();
      css.textAlign = align === 'justified' ? 'justify' : align;
    }

    // Text decoration
    if (style.textDecoration && style.textDecoration !== 'NONE') {
      css.textDecoration = style.textDecoration.toLowerCase().replace('_', '-');
    }

    return css;
  }

  mapOpacity(opacity: number): CSSProperties {
    return opacity < 1 ? { opacity } : {};
  }

  mapBlendMode(blendMode: string): CSSProperties {
    if (blendMode === 'NORMAL') {
      return {};
    }

    const blendModeMap: Record<string, string> = {
      'MULTIPLY': 'multiply',
      'SCREEN': 'screen',
      'OVERLAY': 'overlay',
      'DARKEN': 'darken',
      'LIGHTEN': 'lighten',
      'COLOR_DODGE': 'color-dodge',
      'COLOR_BURN': 'color-burn',
      'HARD_LIGHT': 'hard-light',
      'SOFT_LIGHT': 'soft-light',
      'DIFFERENCE': 'difference',
      'EXCLUSION': 'exclusion',
      'HUE': 'hue',
      'SATURATION': 'saturation',
      'COLOR': 'color',
      'LUMINOSITY': 'luminosity',
    };

    const cssBlendMode = blendModeMap[blendMode];
    return cssBlendMode ? { mixBlendMode: cssBlendMode } : {};
  }

  mapCornerRadius(cornerRadius?: number | number[]): CSSProperties {
    if (cornerRadius === undefined) {
      return {};
    }

    if (typeof cornerRadius === 'number') {
      // Use precise value with decimal places
      const rounded = Math.round(cornerRadius * 100) / 100;
      return { borderRadius: `${rounded}px` };
    }

    // Array of corner radii [topLeft, topRight, bottomRight, bottomLeft]
    if (Array.isArray(cornerRadius) && cornerRadius.length === 4) {
      const [tl, tr, br, bl] = cornerRadius.map(r => Math.round(r * 100) / 100);
      if (tl === tr && tr === br && br === bl) {
        return { borderRadius: `${tl}px` };
      }
      return { borderRadius: `${tl}px ${tr}px ${br}px ${bl}px` };
    }

    return {};
  }

  private applySingleFill(css: CSSProperties, fill: Fill): void {
    if (fill.type === 'SOLID' && fill.color) {
      const opacity = fill.opacity ?? 1;
      const color = rgbaToCSS(
        fill.color.r,
        fill.color.g,
        fill.color.b,
        fill.color.a * opacity
      );
      css.backgroundColor = color;
    } else if (fill.type.startsWith('GRADIENT')) {
      const gradient = this.createGradientString(fill);
      if (gradient) {
        css.background = gradient;
      }
    } else if (fill.type === 'IMAGE' && fill.imageRef) {
      css.backgroundImage = `url(assets/${fill.imageRef}.png)`;
      css.backgroundSize = 'cover';
      css.backgroundPosition = 'center';
    }
  }

  private fillToBackgroundString(fill: Fill): string | null {
    if (fill.type === 'SOLID' && fill.color) {
      const opacity = fill.opacity ?? 1;
      return rgbaToCSS(
        fill.color.r,
        fill.color.g,
        fill.color.b,
        fill.color.a * opacity
      );
    } else if (fill.type.startsWith('GRADIENT')) {
      return this.createGradientString(fill);
    } else if (fill.type === 'IMAGE' && fill.imageRef) {
      return `url(assets/${fill.imageRef}.png)`;
    }
    return null;
  }

  private createGradientString(fill: Fill): string | null {
    if (!fill.gradientStops || fill.gradientStops.length === 0) {
      return null;
    }

    // Create gradient stops with precise positioning
    const stops = fill.gradientStops
      .map(stop => {
        const color = rgbaToCSS(stop.color.r, stop.color.g, stop.color.b, stop.color.a);
        // Use precise percentage (not rounded) for better accuracy
        const position = (stop.position * 100).toFixed(2);
        return `${color} ${position}%`;
      })
      .join(', ');

    switch (fill.type) {
      case 'GRADIENT_LINEAR':
        // Calculate angle from gradient transform if available
        // Default to 180deg (top to bottom) which is most common
        const angle = (fill as any).gradientTransform ? this.calculateGradientAngle((fill as any).gradientTransform) : 180;
        return `linear-gradient(${angle}deg, ${stops})`;
      case 'GRADIENT_RADIAL':
        return `radial-gradient(circle, ${stops})`;
      case 'GRADIENT_ANGULAR':
        return `conic-gradient(${stops})`;
      default:
        return null;
    }
  }

  private calculateGradientAngle(transform: number[][]): number {
    // Figma gradient transform is a 2x3 matrix
    // Calculate angle from the transform matrix
    if (!transform || transform.length < 2) return 180;
    
    const dx = transform[0][0];
    const dy = transform[0][1];
    
    // Calculate angle in degrees
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // Normalize to 0-360 range
    angle = (angle + 90) % 360;
    if (angle < 0) angle += 360;
    
    return Math.round(angle);
  }

  private createDropShadow(effect: Effect): string {
    // Use precise values with decimal places for better accuracy
    const x = Math.round((effect.offset?.x || 0) * 100) / 100;
    const y = Math.round((effect.offset?.y || 0) * 100) / 100;
    const blur = Math.round((effect.radius || 0) * 100) / 100;
    const spread = Math.round((effect.spread || 0) * 100) / 100;
    const color = effect.color
      ? rgbaToCSS(effect.color.r, effect.color.g, effect.color.b, effect.color.a)
      : 'rgba(0, 0, 0, 0.25)';

    return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
  }

  private createInnerShadow(effect: Effect): string {
    const shadow = this.createDropShadow(effect);
    return `inset ${shadow}`;
  }

  private normalizeFontFamily(fontFamily: string): string {
    // Add fallback fonts
    const fallbacks = ', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    
    if (fontFamily.includes(',')) {
      return fontFamily;
    }
    
    return `"${fontFamily}"${fallbacks}`;
  }

  private isWebSafeFont(fontFamily: string): boolean {
    const normalized = fontFamily.toLowerCase().replace(/['"]/g, '');
    return WEB_SAFE_FONTS.some(safe => normalized.includes(safe.toLowerCase()));
  }
}

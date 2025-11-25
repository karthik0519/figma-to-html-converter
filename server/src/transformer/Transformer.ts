import type { ParsedNode, TransformedNode, HTMLElement, CSSProperties } from '../types/internal.js';
import { LayoutEngine } from './LayoutEngine.js';
import { StyleMapper } from './StyleMapper.js';
import { logger } from '../utils/logger.js';

export class Transformer {
  private layoutEngine: LayoutEngine;
  private styleMapper: StyleMapper;
  private warnings: string[] = [];

  constructor() {
    this.layoutEngine = new LayoutEngine();
    this.styleMapper = new StyleMapper();
  }

  transform(parsedNode: ParsedNode, parentNode?: ParsedNode): TransformedNode {
    logger.info('Starting transformation');
    this.warnings = [];

    const transformed = this.transformNode(parsedNode, parentNode);
    
    // Collect warnings from style mapper
    this.warnings.push(...this.styleMapper.getWarnings());
    
    if (this.warnings.length > 0) {
      logger.warn(`Transformation completed with ${this.warnings.length} warnings`);
    } else {
      logger.info('Transformation completed successfully');
    }

    return transformed;
  }

  getWarnings(): string[] {
    return this.warnings;
  }

  private transformNode(node: ParsedNode, parentNode?: ParsedNode): TransformedNode {
    // Create HTML element structure
    const element: HTMLElement = {
      tag: this.determineHTMLTag(node),
      attributes: {
        id: node.id,
        'data-name': node.name,
      },
      children: [],
    };

    // Add text content for TEXT nodes
    if (node.textContent) {
      element.textContent = node.textContent;
    }

    // Generate CSS styles
    const styles: CSSProperties = {};

    // Apply layout styles
    const layoutCSS = this.layoutEngine.generateLayoutCSS(node, parentNode);
    Object.assign(styles, layoutCSS);

    // For TEXT nodes, don't apply background fills - only apply text styles
    if (node.type === 'TEXT') {
      // Apply typography for text nodes
      if (node.styles.textStyle) {
        const typographyCSS = this.styleMapper.mapTypographyToCSS(node.styles.textStyle);
        Object.assign(styles, typographyCSS);
      }
      
      // If text doesn't have explicit alignment but is centered within parent, apply center alignment
      if (parentNode && node.layout.position && parentNode.layout.position && 
          node.layout.width && parentNode.layout.width) {
        const relativeX = node.layout.position.x - parentNode.layout.position.x;
        const parentWidth = parentNode.layout.width;
        const elementWidth = node.layout.width;
        const centerX = (parentWidth - elementWidth) / 2;
        
        // If element is roughly centered (within 5px tolerance) and no explicit alignment
        if (Math.abs(relativeX - centerX) < 5 && !styles.textAlign) {
          styles.textAlign = 'center';
        }
      }
      
      // Apply text color from fills
      if (node.styles.fills && node.styles.fills.length > 0) {
        const firstFill = node.styles.fills[0];
        if (firstFill.type === 'SOLID' && firstFill.color) {
          const { r, g, b, a } = firstFill.color;
          const opacity = firstFill.opacity ?? 1;
          styles.color = this.rgbaToCSS(r, g, b, a * opacity);
        }
      }
    } else {
      // For non-text nodes, apply fill styles as backgrounds
      const fillCSS = this.styleMapper.mapFillsToCSS(node.styles.fills);
      Object.assign(styles, fillCSS);
    }

    // Apply stroke styles
    const strokeCSS = this.styleMapper.mapStrokesToCSS(node.styles.strokes);
    Object.assign(styles, strokeCSS);

    // Apply effects
    const effectsCSS = this.styleMapper.mapEffectsToCSS(node.styles.effects);
    Object.assign(styles, effectsCSS);

    // Apply opacity
    const opacityCSS = this.styleMapper.mapOpacity(node.styles.opacity);
    Object.assign(styles, opacityCSS);

    // Apply blend mode
    const blendModeCSS = this.styleMapper.mapBlendMode(node.styles.blendMode);
    Object.assign(styles, blendModeCSS);

    // Apply corner radius
    const cornerRadiusCSS = this.styleMapper.mapCornerRadius(node.styles.cornerRadius);
    Object.assign(styles, cornerRadiusCSS);

    // Transform children recursively
    const children: TransformedNode[] = node.children.map(child =>
      this.transformNode(child, node)
    );

    return {
      element,
      styles,
      children,
    };
  }

  private rgbaToCSS(r: number, g: number, b: number, a: number): string {
    const red = Math.round(r * 255);
    const green = Math.round(g * 255);
    const blue = Math.round(b * 255);
    
    if (a === 1) {
      return `rgb(${red}, ${green}, ${blue})`;
    }
    return `rgba(${red}, ${green}, ${blue}, ${a})`;
  }

  private determineHTMLTag(node: ParsedNode): string {
    // Check if this is a recognized component first
    if (node.componentType) {
      switch (node.componentType) {
        case 'button':
          return 'button';
        case 'input':
          return 'input-text';
        case 'card':
          return 'article';
        case 'modal':
          return 'dialog';
        case 'nav':
          return 'nav';
      }
    }

    // Map Figma node types to semantic HTML tags
    switch (node.type) {
      case 'TEXT':
        return this.determineTextTag(node);
      case 'FRAME':
        return this.determineFrameTag(node);
      case 'INSTANCE':
        return this.determineFrameTag(node);
      case 'GROUP':
        return 'div';
      case 'RECTANGLE':
      case 'ELLIPSE':
        return 'div';
      case 'VECTOR':
        return 'svg';
      case 'CANVAS':
        return 'section';
      case 'DOCUMENT':
        return 'main';
      default:
        return 'div';
    }
  }

  private determineTextTag(node: ParsedNode): string {
    const name = node.name.toLowerCase();
    
    // Check for input field patterns
    if (name.includes('input') || name.includes('field') || name.includes('textbox')) {
      // Determine input type based on name
      if (name.includes('email')) return 'input-email';
      if (name.includes('password')) return 'input-password';
      return 'input-text';
    }
    
    // Check for common heading patterns
    if (name.includes('heading') || name.includes('title') || /^h[1-6]/.test(name)) {
      if (name.includes('1') || name.includes('main')) return 'h1';
      if (name.includes('2')) return 'h2';
      if (name.includes('3')) return 'h3';
      if (name.includes('4')) return 'h4';
      if (name.includes('5')) return 'h5';
      if (name.includes('6')) return 'h6';
      return 'h2'; // Default heading
    }
    
    // Check for paragraph patterns
    if (name.includes('paragraph') || name.includes('body') || name.includes('description')) {
      return 'p';
    }
    
    // Check for label patterns
    if (name.includes('label') || name.includes('placeholder')) {
      return 'label';
    }
    
    // Default to span for inline text
    return 'span';
  }

  private determineFrameTag(node: ParsedNode): string {
    const name = node.name.toLowerCase();
    
    // Check for input field patterns (frames that contain text inputs)
    if (name.includes('input') || name.includes('field') || name.includes('textbox') || name.includes('text field')) {
      // Determine input type based on name
      if (name.includes('email')) return 'input-email';
      if (name.includes('password')) return 'input-password';
      return 'input-text';
    }
    
    // Check for common UI patterns
    if (name.includes('button') || name.includes('btn')) {
      return 'button';
    }
    
    if (name.includes('header')) {
      return 'header';
    }
    
    if (name.includes('footer')) {
      return 'footer';
    }
    
    if (name.includes('nav') || name.includes('menu')) {
      return 'nav';
    }
    
    if (name.includes('article') || name.includes('post')) {
      return 'article';
    }
    
    if (name.includes('aside') || name.includes('sidebar')) {
      return 'aside';
    }
    
    if (name.includes('card') || name.includes('container') || name.includes('wrapper')) {
      return 'div';
    }
    
    // Default to div for generic containers
    return 'div';
  }
}

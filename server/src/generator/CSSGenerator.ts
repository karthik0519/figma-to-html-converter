import type { TransformedNode, CSSProperties, CSSRule } from '../types/internal.js';
import { sanitizeClassName } from '../utils/helpers.js';

export class CSSGenerator {
  private classCounter = 0;
  private styleCache = new Map<string, string>();
  private classMap = new Map<string, string>();

  generate(transformedNodes: TransformedNode[]): { css: string; classMap: Map<string, string> } {
    this.classCounter = 0;
    this.styleCache.clear();
    this.classMap.clear();

    // Collect all nodes
    const allNodes: TransformedNode[] = [];
    this.collectNodes(transformedNodes, allNodes);

    // Extract common styles
    const rules = this.extractCommonStyles(allNodes);

    // Generate CSS string
    const css = this.formatCSS(rules);

    return { css, classMap: this.classMap };
  }

  private collectNodes(nodes: TransformedNode[], result: TransformedNode[]): void {
    for (const node of nodes) {
      result.push(node);
      if (node.children.length > 0) {
        this.collectNodes(node.children, result);
      }
    }
  }

  extractCommonStyles(nodes: TransformedNode[]): CSSRule[] {
    const rules: CSSRule[] = [];
    const styleGroups = new Map<string, TransformedNode[]>();

    // Group nodes by their styles
    for (const node of nodes) {
      const styleKey = this.serializeStyles(node.styles);
      
      if (!styleGroups.has(styleKey)) {
        styleGroups.set(styleKey, []);
      }
      styleGroups.get(styleKey)!.push(node);
    }

    // Create CSS rules
    for (const [styleKey, groupNodes] of styleGroups.entries()) {
      if (groupNodes.length === 0) continue;

      const styles = groupNodes[0].styles;
      
      // Skip empty styles
      if (Object.keys(styles).length === 0) continue;

      // Generate class name
      let className: string;
      
      if (groupNodes.length > 1 && this.styleCache.has(styleKey)) {
        // Reuse existing class for common styles
        className = this.styleCache.get(styleKey)!;
      } else {
        // Create new class
        const baseName = sanitizeClassName(groupNodes[0].element.attributes['data-name']);
        className = this.generateClassName(baseName);
        this.styleCache.set(styleKey, className);
      }

      // Map all nodes in this group to the class name
      for (const node of groupNodes) {
        this.classMap.set(node.element.attributes.id, className);
      }

      // Create CSS rule
      rules.push({
        selector: `.${className}`,
        declarations: styles,
      });
    }

    return rules;
  }

  generateClassName(baseName: string): string {
    // Ensure unique class names
    const sanitized = baseName || 'element';
    const className = `${sanitized}-${this.classCounter++}`;
    return className;
  }

  private formatCSS(rules: CSSRule[]): string {
    // Add reset and base styles following Figma-to-HTML plugin best practices
    const reset = `/* Reset and base styles */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  background: #f5f5f5;
}

/* Container for Figma frame */
.figma-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* Input field styles */
input[type="text"],
input[type="email"],
input[type="password"] {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  background: white;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s;
}

input[type="text"]:focus,
input[type="email"]:focus,
input[type="password"]:focus {
  border-color: #667eea;
}

input[type="text"]::placeholder,
input[type="email"]::placeholder,
input[type="password"]::placeholder {
  color: #999;
  opacity: 1;
}

/* Button styles */
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  border: none;
  font-family: inherit;
  outline: none;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
  vertical-align: middle;
  line-height: 1;
}

button:hover {
  transform: translateY(-1px);
  opacity: 0.9;
}

button:active {
  transform: translateY(0);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Ensure button text is perfectly centered */
button > * {
  display: inline-block;
  vertical-align: middle;
}

/* Ensure images don't overflow */
img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Remove default list styles */
ul, ol {
  list-style: none;
}

/* Remove default link styles */
a {
  text-decoration: none;
  color: inherit;
}

`;

    // Format each rule with organized property order
    const formattedRules = rules.map(rule => {
      const declarations = this.organizeDeclarations(rule.declarations);
      return `${rule.selector} {\n${declarations}\n}`;
    }).join('\n\n');

    return reset + formattedRules;
  }

  private organizeDeclarations(declarations: CSSProperties): string {
    // Define property order for better readability
    const propertyOrder = [
      // Display & positioning
      'display', 'position', 'top', 'right', 'bottom', 'left', 'zIndex',
      // Flexbox & grid
      'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'alignSelf', 'gap',
      'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow',
      // Box model - spacing (padding, margin, gap)
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      // Box model - dimensions
      'width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight',
      // Typography
      'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing',
      'textAlign', 'textDecoration', 'textTransform', 'color',
      // Visual
      'background', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition',
      'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
      'borderRadius', 'borderColor', 'borderWidth', 'borderStyle',
      'boxShadow', 'opacity',
      // Transform & animation
      'transform', 'transition', 'animation',
      // Other
      'overflow', 'cursor', 'pointerEvents'
    ];

    const entries = Object.entries(declarations);
    
    // Sort entries based on property order
    const sortedEntries = entries.sort(([a], [b]) => {
      const aIndex = propertyOrder.indexOf(a);
      const bIndex = propertyOrder.indexOf(b);
      
      // If both properties are in the order list, sort by their position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only a is in the list, it comes first
      if (aIndex !== -1) return -1;
      // If only b is in the list, it comes first
      if (bIndex !== -1) return 1;
      // If neither is in the list, sort alphabetically
      return a.localeCompare(b);
    });

    return sortedEntries
      .map(([prop, value]) => {
        const cssProperty = this.camelToKebab(prop);
        return `  ${cssProperty}: ${value};`;
      })
      .join('\n');
  }

  private serializeStyles(styles: CSSProperties): string {
    // Create a stable string representation of styles for comparison
    const entries = Object.entries(styles).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(entries);
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
}

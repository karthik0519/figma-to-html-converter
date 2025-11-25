import type { TransformedNode, HTMLElement } from '../types/internal.js';
import { sanitizeClassName } from '../utils/helpers.js';

export class HTMLGenerator {
  generate(transformedNode: TransformedNode, cssClassMap: Map<string, string>): string {
    // Find the actual content frames (skip DOCUMENT and CANVAS nodes)
    let contentNode = transformedNode;
    
    // Skip DOCUMENT node
    if (contentNode.element.tag === 'main' && contentNode.children.length > 0) {
      contentNode = contentNode.children[0]; // Get CANVAS
    }
    
    // Skip CANVAS node and get actual frames
    if (contentNode.element.tag === 'section' && contentNode.children.length > 0) {
      // Render all frame children
      const bodyContent = contentNode.children
        .map(child => this.generateElement(child, cssClassMap, 1))
        .join('\n');
      return this.wrapInDocument(bodyContent);
    }
    
    // Fallback: render the node as-is
    const bodyContent = this.generateElement(contentNode, cssClassMap, 1);
    return this.wrapInDocument(bodyContent);
  }

  private generateElement(
    node: TransformedNode,
    cssClassMap: Map<string, string>,
    depth: number
  ): string {
    const indent = '  '.repeat(depth);
    const element = node.element;
    
    // Handle input fields specially
    if (element.tag.startsWith('input-')) {
      return this.generateInputField(node, cssClassMap, depth);
    }
    
    // Generate opening tag
    const className = cssClassMap.get(element.attributes.id) || sanitizeClassName(element.attributes['data-name']);
    const attributes = this.generateAttributes(element, className);
    const openTag = `${indent}<${element.tag}${attributes}>`;
    
    // Add comment with Figma layer name
    const comment = `${indent}<!-- Figma layer: ${element.attributes['data-name']} -->`;
    
    // Generate content
    let content = '';
    
    if (element.textContent) {
      // Text content
      content = this.escapeHTML(element.textContent);
    } else if (node.children.length > 0) {
      // Child elements
      const childrenHTML = node.children
        .map(child => this.generateElement(child, cssClassMap, depth + 1))
        .join('\n');
      content = `\n${childrenHTML}\n${indent}`;
    }
    
    // Generate closing tag
    const closeTag = `</${element.tag}>`;
    
    return `${comment}\n${openTag}${content}${closeTag}`;
  }

  private generateInputField(
    node: TransformedNode,
    cssClassMap: Map<string, string>,
    depth: number
  ): string {
    const indent = '  '.repeat(depth);
    const element = node.element;
    
    // Determine input type
    let inputType = 'text';
    if (element.tag === 'input-email') inputType = 'email';
    if (element.tag === 'input-password') inputType = 'password';
    
    // Get placeholder text from children or text content
    let placeholder = '';
    if (element.textContent) {
      placeholder = element.textContent;
    } else if (node.children.length > 0) {
      // Look for text in children
      const textChild = node.children.find(c => c.element.textContent);
      if (textChild) {
        placeholder = textChild.element.textContent || '';
      }
    }
    
    const className = cssClassMap.get(element.attributes.id) || sanitizeClassName(element.attributes['data-name']);
    
    const comment = `${indent}<!-- Figma layer: ${element.attributes['data-name']} -->`;
    const input = `${indent}<input type="${inputType}" class="${className}" placeholder="${this.escapeAttribute(placeholder)}" data-figma-id="${element.attributes.id}">`;
    
    return `${comment}\n${input}`;
  }

  private generateAttributes(element: HTMLElement, className: string): string {
    const attrs: string[] = [];
    
    // Add class
    if (className) {
      attrs.push(`class="${className}"`);
    }
    
    // Add data-id for debugging
    if (element.attributes.id) {
      attrs.push(`data-figma-id="${element.attributes.id}"`);
    }
    
    // Add other attributes (excluding internal ones)
    for (const [key, value] of Object.entries(element.attributes)) {
      if (key !== 'id' && key !== 'data-name' && key !== 'class') {
        attrs.push(`${key}="${this.escapeAttribute(value)}"`);
      }
    }
    
    return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
  }

  private wrapInDocument(bodyContent: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Figma Design</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="figma-container">
${bodyContent}
  </div>
</body>
</html>`;
  }

  private escapeHTML(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, char => map[char]);
  }

  private escapeAttribute(value: string): string {
    return value.replace(/"/g, '&quot;');
  }

  createSemanticElement(tag: string, attributes: Record<string, string>, children: string[]): HTMLElement {
    return {
      tag,
      attributes,
      children,
    };
  }
}

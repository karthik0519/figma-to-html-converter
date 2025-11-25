import type { ParsedNode, LayoutProperties, CSSProperties } from '../types/internal.js';
import { LayoutStrategy } from '../types/internal.js';

export class LayoutEngine {
  determineLayoutStrategy(node: ParsedNode): LayoutStrategy {
    return node.layout.strategy;
  }

  generateLayoutCSS(node: ParsedNode, parentNode?: ParsedNode): CSSProperties {
    const css: CSSProperties = {};
    const layout = node.layout;

    // Check if this is a decorative element in a flexbox parent
    const isDecorativeLine = layout.height && layout.height < 10 && layout.width && layout.width > 20;
    const isDecorativeContainer = layout.height && layout.height < 30 && node.name.toLowerCase().includes('indicator');
    const parentIsFlexbox = parentNode && parentNode.layout.strategy === LayoutStrategy.Flexbox;
    
    // Override layout strategy for decorative elements in flexbox containers
    let effectiveStrategy = layout.strategy;
    if ((isDecorativeLine || isDecorativeContainer) && parentIsFlexbox && layout.strategy === LayoutStrategy.Absolute) {
      console.log(`[LayoutEngine] Overriding Absolute to Static for decorative element: ${node.name} (${layout.width}x${layout.height})`);
      effectiveStrategy = LayoutStrategy.Static; // Use static to let flexbox handle positioning
    }

    switch (effectiveStrategy) {
      case LayoutStrategy.Absolute:
        this.applyAbsoluteLayout(css, layout, node, parentNode);
        break;
      case LayoutStrategy.Flexbox:
        this.applyFlexboxLayout(css, layout);
        break;
      case LayoutStrategy.Grid:
        this.applyGridLayout(css, layout);
        break;
      case LayoutStrategy.Static:
        this.applyStaticLayout(css, layout);
        break;
    }

    // Apply dimensions - use precise values from Figma
    if (layout.width !== undefined && layout.width > 0) {
      // Round to 2 decimal places for sub-pixel precision
      const preciseWidth = Math.round(layout.width * 100) / 100;
      css.width = `${preciseWidth}px`;
    }
    
    // For small decorative elements (like bottom indicators) or centered text, center them
    if (parentNode && layout.width && layout.height && layout.position && parentNode.layout.position && parentNode.layout.width) {
      const relativeX = layout.position.x - parentNode.layout.position.x;
      const parentWidth = parentNode.layout.width;
      const elementWidth = layout.width;
      const centerX = (parentWidth - elementWidth) / 2;
      
      // Check if element is horizontally centered (within 5px tolerance)
      const isCentered = Math.abs(relativeX - centerX) < 5;
      
      // Check if element is a decorative line (small height, reasonable width)
      const isDecorativeLine = layout.height < 10 && layout.width > 20 && layout.width < parentWidth * 0.8;
      
      // Check if element is a decorative container (like Home Indicator)
      const isDecorativeContainer = layout.height < 30 && node.name.toLowerCase().includes('indicator');
      
      // Check if element is small (like a decorative indicator)
      const isSmallElement = layout.width < 150 && layout.height < 10;
      
      // For flexbox layouts with column direction
      if (parentNode.layout.strategy === LayoutStrategy.Flexbox && 
          parentNode.layout.flexDirection === 'column') {
        // Always center decorative elements regardless of position
        if (isDecorativeLine || isDecorativeContainer) {
          css.alignSelf = 'center';
          // Use order property to move it to the bottom
          // Check if element should be at the bottom based on its Y position
          if (layout.position && parentNode.layout.position && parentNode.layout.height) {
            const relativeY = layout.position.y - parentNode.layout.position.y;
            const parentHeight = parentNode.layout.height;
            // If element is in the bottom half of the parent, move it to the end and push it down
            if (relativeY > parentHeight * 0.5) {
              css.order = '999'; // Move to end of flex container
              css.marginTop = 'auto'; // Push to the very bottom
            }
          }
          // Remove any absolute positioning that might interfere
          delete css.position;
          delete css.left;
          delete css.top;
        }
        // Center other elements if they're positioned near center
        else if (isCentered) {
          css.alignSelf = 'center';
        }
      }
      
      // For absolute positioned decorative elements that should be centered
      if (layout.strategy === LayoutStrategy.Absolute && (isDecorativeLine || (isSmallElement && isCentered))) {
        css.left = '50%';
        css.transform = 'translateX(-50%)';
      }
    }
    
    // Apply height based on layout strategy with precise values
    if (layout.height !== undefined && layout.height > 0) {
      // Round to 2 decimal places for sub-pixel precision
      const preciseHeight = Math.round(layout.height * 100) / 100;
      
      if (layout.strategy === LayoutStrategy.Flexbox) {
        // For flex containers with auto-layout, use min-height to allow growth
        css.minHeight = `${preciseHeight}px`;
      } else if (layout.strategy === LayoutStrategy.Absolute) {
        // For absolute positioned containers, use exact height from Figma
        css.height = `${preciseHeight}px`;
      } else {
        // For static layouts, use exact height
        css.height = `${preciseHeight}px`;
      }
    }

    // Apply constraints if present
    if (layout.constraints) {
      this.applyConstraints(css, layout.constraints);
    }

    return css;
  }

  private applyAbsoluteLayout(
    css: CSSProperties,
    layout: LayoutProperties,
    node: ParsedNode,
    parentNode?: ParsedNode
  ): void {
    // Only use absolute positioning for children, not the root container
    if (parentNode) {
      css.position = 'absolute';

      if (layout.position && parentNode.layout.position) {
        // Calculate position relative to parent with sub-pixel precision
        const x = Math.round((layout.position.x - parentNode.layout.position.x) * 100) / 100;
        const y = Math.round((layout.position.y - parentNode.layout.position.y) * 100) / 100;

        // Check if this is a decorative container (like Home Indicator)
        const isDecorativeContainer = layout.height && layout.height < 30 && node.name.toLowerCase().includes('indicator');
        const parentWidth = parentNode.layout.width || 0;
        const elementWidth = layout.width || 0;
        
        // For decorative containers, center them horizontally
        if (isDecorativeContainer && parentWidth > 0 && elementWidth > 0) {
          const centerX = (parentWidth - elementWidth) / 2;
          const isCentered = Math.abs(x - centerX) < 10;
          
          if (isCentered || elementWidth === parentWidth) {
            // Use left: 50% and transform for perfect centering
            css.left = '50%';
            css.transform = 'translateX(-50%)';
            css.top = `${y}px`;
            console.log(`[LayoutEngine] Centering decorative container: ${node.name}`);
          } else {
            css.left = `${x}px`;
            css.top = `${y}px`;
          }
        } else {
          css.left = `${x}px`;
          css.top = `${y}px`;
        }
      }
    } else {
      // Root container should be relatively positioned to contain absolute children
      css.position = 'relative';
      // Add overflow hidden to clip content like Figma does
      css.overflow = 'hidden';
    }
  }

  private applyFlexboxLayout(css: CSSProperties, layout: LayoutProperties): void {
    css.display = 'flex';

    // Use actual Figma layout direction
    if (layout.flexDirection) {
      css.flexDirection = layout.flexDirection;
    } else {
      css.flexDirection = 'column';
    }

    // Only apply gap if Figma specifies it - use precise value
    if (layout.gap !== undefined && layout.gap > 0) {
      const preciseGap = Math.round(layout.gap * 100) / 100;
      css.gap = `${preciseGap}px`;
    }

    // Only apply padding if Figma specifies it - use precise values
    if (layout.padding) {
      const { top, right, bottom, left } = layout.padding;
      // Use sub-pixel precision for padding
      const preciseTop = Math.round(top * 100) / 100;
      const preciseRight = Math.round(right * 100) / 100;
      const preciseBottom = Math.round(bottom * 100) / 100;
      const preciseLeft = Math.round(left * 100) / 100;
      
      if (preciseTop === preciseRight && preciseRight === preciseBottom && preciseBottom === preciseLeft) {
        if (preciseTop > 0) {
          css.padding = `${preciseTop}px`;
        }
      } else if (preciseTop === preciseBottom && preciseLeft === preciseRight) {
        if (preciseTop > 0 || preciseLeft > 0) {
          css.padding = `${preciseTop}px ${preciseRight}px`;
        }
      } else {
        // Include all padding values for maximum accuracy
        css.padding = `${preciseTop}px ${preciseRight}px ${preciseBottom}px ${preciseLeft}px`;
      }
    }

    // Always apply alignment if detected
    if (layout.alignItems) {
      css.alignItems = layout.alignItems;
    }

    if (layout.justifyContent) {
      css.justifyContent = layout.justifyContent;
    }
  }

  private applyGridLayout(css: CSSProperties, layout: LayoutProperties): void {
    css.display = 'grid';
    
    if (layout.gap !== undefined && layout.gap > 0) {
      css.gap = `${layout.gap}px`;
    }

    if (layout.padding) {
      const { top, right, bottom, left } = layout.padding;
      css.padding = `${top}px ${right}px ${bottom}px ${left}px`;
    }
  }

  private applyStaticLayout(css: CSSProperties, layout: LayoutProperties): void {
    // Static layout uses default flow
    if (layout.padding) {
      const { top, right, bottom, left } = layout.padding;
      css.padding = `${top}px ${right}px ${bottom}px ${left}px`;
    }
  }

  private applyConstraints(
    css: CSSProperties,
    constraints: { horizontal: string; vertical: string }
  ): void {
    // Handle horizontal constraints
    switch (constraints.horizontal) {
      case 'LEFT':
        // Already handled by left positioning
        break;
      case 'RIGHT':
        css.right = '0';
        delete css.left;
        break;
      case 'CENTER':
        css.left = '50%';
        css.transform = 'translateX(-50%)';
        break;
      case 'LEFT_RIGHT':
        css.left = '0';
        css.right = '0';
        delete css.width;
        break;
      case 'SCALE':
        // Percentage-based width
        if (css.width) {
          css.width = '100%';
        }
        break;
    }

    // Handle vertical constraints
    switch (constraints.vertical) {
      case 'TOP':
        // Already handled by top positioning
        break;
      case 'BOTTOM':
        css.bottom = '0';
        delete css.top;
        break;
      case 'CENTER':
        css.top = '50%';
        const existingTransform = css.transform as string;
        if (existingTransform) {
          css.transform = `${existingTransform} translateY(-50%)`;
        } else {
          css.transform = 'translateY(-50%)';
        }
        break;
      case 'TOP_BOTTOM':
        css.top = '0';
        css.bottom = '0';
        delete css.height;
        break;
      case 'SCALE':
        // Percentage-based height
        if (css.height) {
          css.height = '100%';
        }
        break;
    }
  }
}

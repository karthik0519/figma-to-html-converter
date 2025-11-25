import type { FigmaFile, FigmaNode, NodeType } from '../types/figma.js';
import type { ParsedNode, StyleProperties, LayoutProperties } from '../types/internal.js';
import { LayoutStrategy } from '../types/internal.js';
import { logger } from '../utils/logger.js';

export class Parser {
  private warnings: string[] = [];
  private components: Record<string, any> = {};

  parse(figmaFile: FigmaFile, components?: Record<string, any>): ParsedNode {
    logger.info('Starting to parse Figma file');
    this.warnings = [];
    this.components = components || {};

    const rootNode = this.parseNode(figmaFile.document);
    
    // Post-process to fix structural issues
    this.regroupByVisualContainment(rootNode);
    
    if (this.warnings.length > 0) {
      logger.warn(`Parsing completed with ${this.warnings.length} warnings`);
    } else {
      logger.info('Parsing completed successfully');
    }

    return rootNode;
  }

  private regroupByVisualContainment(node: ParsedNode): void {
    // Recursively process all nodes
    if (node.children.length === 0) return;

    // First, process children recursively
    for (const child of node.children) {
      this.regroupByVisualContainment(child);
    }

    // Then check if any children should be regrouped
    const remainingChildren: ParsedNode[] = [];

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      let wasRegrouped = false;

      // Check if this child is visually contained by any sibling
      for (let j = 0; j < node.children.length; j++) {
        if (i === j) continue;

        const potentialParent = node.children[j];
        
        // Check if child is visually inside potentialParent
        if (this.isVisuallyContained(child, potentialParent)) {
          // Move child into potentialParent
          potentialParent.children.push(child);
          wasRegrouped = true;
          logger.info(`✓ Regrouped "${child.name}" into "${potentialParent.name}"`);
          break;
        }
      }

      if (!wasRegrouped) {
        remainingChildren.push(child);
      }
    }

    // Update node's children
    node.children = remainingChildren;
  }

  private isVisuallyContained(child: ParsedNode, parent: ParsedNode): boolean {
    // Check if child's bounds are within parent's bounds
    if (!child.bounds || !parent.bounds) return false;

    const childBounds = child.bounds;
    const parentBounds = parent.bounds;

    // Special case: decorative lines (small height elements) OR their containers should be grouped
    const isDecorativeLine = childBounds.height < 10 && childBounds.width > 20;
    const isDecorativeContainer = childBounds.height < 30 && child.name.toLowerCase().includes('indicator');
    
    // For decorative elements, use more lenient tolerance
    const tolerance = (isDecorativeLine || isDecorativeContainer) ? 30 : 10;
    
    const isInsideX = childBounds.x >= parentBounds.x - tolerance &&
                      (childBounds.x + childBounds.width) <= (parentBounds.x + parentBounds.width + tolerance);
    
    const isInsideY = childBounds.y >= parentBounds.y - tolerance &&
                      (childBounds.y + childBounds.height) <= (parentBounds.y + parentBounds.height + tolerance);

    // Check if parent has a background (likely a container)
    const hasBackground = parent.styles.fills && parent.styles.fills.length > 0;

    // Child should be smaller than parent
    const isSmaller = childBounds.width < parentBounds.width * 0.95 &&
                      childBounds.height < parentBounds.height * 0.95;
    
    // If it's a decorative element and it's inside or near the parent bounds, group it
    if ((isDecorativeLine || isDecorativeContainer) && isInsideX && isInsideY) {
      logger.info(`✓ Regrouping decorative element "${child.name}" (${Math.round(childBounds.width)}x${Math.round(childBounds.height)}px) into "${parent.name}"`);
      return true;
    }

    // For other elements, require background and size check
    const shouldGroup = isInsideX && isInsideY && hasBackground && isSmaller;
    if (shouldGroup) {
      logger.debug(`Regrouping "${child.name}" into "${parent.name}"`);
    }
    return shouldGroup;
  }

  getWarnings(): string[] {
    return this.warnings;
  }

  private parseNode(node: FigmaNode): ParsedNode {
    try {
      const parsedNode: ParsedNode = {
        id: node.id,
        name: node.name,
        type: node.type as NodeType,
        children: [],
        bounds: node.absoluteBoundingBox || { x: 0, y: 0, width: 0, height: 0 },
        styles: this.extractStyles(node),
        layout: this.extractLayout(node),
      };

      // Check if this is a component instance
      if (node.type === 'INSTANCE' && (node as any).componentId) {
        const componentId = (node as any).componentId;
        const component = this.components[componentId];
        if (component) {
          parsedNode.componentName = component.name;
          parsedNode.componentType = this.detectComponentType(component.name);
          logger.debug(`Detected component: ${component.name} (${parsedNode.componentType})`);
        }
      }

      // Extract text content for TEXT nodes
      if (node.type === 'TEXT' && node.characters) {
        parsedNode.textContent = node.characters;
      }

      // Recursively parse children
      if (node.children && Array.isArray(node.children)) {
        parsedNode.children = node.children.map(child => this.parseNode(child));
      }

      return parsedNode;
    } catch (error) {
      const errorMsg = `Error parsing node ${node.id} (${node.name}): ${error}`;
      logger.error(errorMsg);
      this.warnings.push(errorMsg);
      
      // Return a minimal valid node
      return {
        id: node.id,
        name: node.name,
        type: node.type as NodeType,
        children: [],
        bounds: { x: 0, y: 0, width: 0, height: 0 },
        styles: this.getDefaultStyles(),
        layout: this.getDefaultLayout(),
      };
    }
  }

  private detectComponentType(name: string): string | undefined {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('button') || lowerName.includes('btn')) {
      return 'button';
    }
    if (lowerName.includes('input') || lowerName.includes('textfield') || lowerName.includes('text field')) {
      return 'input';
    }
    if (lowerName.includes('card')) {
      return 'card';
    }
    if (lowerName.includes('modal') || lowerName.includes('dialog')) {
      return 'modal';
    }
    if (lowerName.includes('nav') || lowerName.includes('menu')) {
      return 'nav';
    }
    
    return undefined;
  }

  private extractStyles(node: FigmaNode): StyleProperties {
    return {
      fills: node.fills?.filter(f => f.visible !== false) || [],
      strokes: node.strokes?.filter(s => s.visible !== false) || [],
      effects: node.effects?.filter(e => e.visible !== false) || [],
      opacity: node.opacity ?? 1,
      blendMode: node.blendMode || 'NORMAL',
      cornerRadius: node.cornerRadius,
      textStyle: node.style,
    };
  }

  private extractLayout(node: FigmaNode): LayoutProperties {
    const layout: LayoutProperties = {
      strategy: this.determineLayoutStrategy(node),
    };

    // Extract position and size
    if (node.absoluteBoundingBox) {
      layout.position = {
        x: node.absoluteBoundingBox.x,
        y: node.absoluteBoundingBox.y,
      };
      layout.width = node.absoluteBoundingBox.width;
      layout.height = node.absoluteBoundingBox.height;
    }

    // Extract auto-layout properties (when explicitly set in Figma)
    if (node.layoutMode && node.layoutMode !== 'NONE') {
      layout.flexDirection = node.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
      
      // Use exact values from Figma - no rounding or adjustment
      layout.gap = node.itemSpacing || 0;
      
      layout.padding = {
        top: node.paddingTop || 0,
        right: node.paddingRight || 0,
        bottom: node.paddingBottom || 0,
        left: node.paddingLeft || 0,
      };

      // Map Figma alignment to CSS - exact mapping
      if (node.primaryAxisAlignItems) {
        layout.justifyContent = this.mapPrimaryAxisAlignment(node.primaryAxisAlignItems);
      }
      
      if (node.counterAxisAlignItems) {
        layout.alignItems = this.mapCounterAxisAlignment(node.counterAxisAlignItems);
      }
    } else if (layout.strategy === LayoutStrategy.Flexbox && node.children && node.children.length > 1) {
      // For detected flexbox layouts (without explicit auto-layout)
      const arrangement = this.detectChildArrangement(node.children);
      layout.flexDirection = arrangement === 'horizontal' ? 'row' : 'column';
      
      // Calculate gap from child positions with sub-pixel precision
      const gaps = this.calculateChildGaps(node.children, arrangement);
      if (gaps.averageGap > 0.5) {
        // Use precise gap value (already rounded to 2 decimals in calculateChildGaps)
        layout.gap = gaps.averageGap;
      }
      
      // Calculate padding
      const padding = this.calculatePadding(node, node.children);
      if (padding) {
        layout.padding = padding;
      }
      
      // Detect alignment
      const alignment = this.detectAlignment(node, node.children, arrangement);
      if (alignment.alignItems) {
        layout.alignItems = alignment.alignItems;
      } else if (arrangement === 'vertical') {
        // Default to center for vertical arrangements if not detected
        layout.alignItems = 'center';
      }
      
      if (alignment.justifyContent) {
        layout.justifyContent = alignment.justifyContent;
      }
    }

    // Extract constraints
    if (node.constraints) {
      layout.constraints = {
        horizontal: node.constraints.horizontal,
        vertical: node.constraints.vertical,
      };
    }

    return layout;
  }

  private detectAlignment(parent: FigmaNode, children: FigmaNode[], arrangement: string): { justifyContent?: string; alignItems?: string } {
    if (!parent.absoluteBoundingBox || children.length === 0) {
      return {};
    }

    const childrenWithBounds = children.filter(c => c.absoluteBoundingBox);
    if (childrenWithBounds.length === 0) {
      return {};
    }

    const result: { justifyContent?: string; alignItems?: string } = {};
    const parentBounds = parent.absoluteBoundingBox;

    if (arrangement === 'vertical') {
      // Check horizontal alignment (alignItems for column)
      const parentCenterX = parentBounds.x + parentBounds.width / 2;
      const parentLeft = parentBounds.x;
      const parentRight = parentBounds.x + parentBounds.width;
      
      let centeredCount = 0;
      let leftAlignedCount = 0;
      let rightAlignedCount = 0;
      
      for (const child of childrenWithBounds) {
        const bounds = child.absoluteBoundingBox!;
        const childCenterX = bounds.x + bounds.width / 2;
        const childLeft = bounds.x;
        const childRight = bounds.x + bounds.width;
        
        // Use tighter tolerance for center detection (2px)
        if (Math.abs(childCenterX - parentCenterX) < 2) {
          centeredCount++;
        } else if (Math.abs(childLeft - parentLeft) < 5) {
          leftAlignedCount++;
        } else if (Math.abs(childRight - parentRight) < 5) {
          rightAlignedCount++;
        }
      }
      
      // Determine alignment based on majority with better edge case handling
      const total = childrenWithBounds.length;
      const centerThreshold = total >= 3 ? 0.6 : 0.5; // Lower threshold for fewer items
      
      if (centeredCount >= total * centerThreshold) {
        result.alignItems = 'center';
      } else if (leftAlignedCount >= total * centerThreshold) {
        result.alignItems = 'flex-start';
      } else if (rightAlignedCount >= total * centerThreshold) {
        result.alignItems = 'flex-end';
      } else if (centeredCount > leftAlignedCount && centeredCount > rightAlignedCount) {
        // If centered is the most common (even if not majority), use center
        result.alignItems = 'center';
      } else if (leftAlignedCount > rightAlignedCount) {
        result.alignItems = 'flex-start';
      } else if (rightAlignedCount > leftAlignedCount) {
        result.alignItems = 'flex-end';
      } else {
        // True mixed alignment - check if children are stretched
        const allFullWidth = childrenWithBounds.every(c => {
          const childWidth = c.absoluteBoundingBox!.width;
          return Math.abs(childWidth - parentBounds.width) < 10;
        });
        result.alignItems = allFullWidth ? 'stretch' : 'flex-start';
      }
      
      // Check vertical distribution (justifyContent for column)
      const sortedByY = [...childrenWithBounds].sort((a, b) => 
        a.absoluteBoundingBox!.y - b.absoluteBoundingBox!.y
      );
      const firstChild = sortedByY[0].absoluteBoundingBox!;
      const lastChild = sortedByY[sortedByY.length - 1].absoluteBoundingBox!;
      
      const topGap = firstChild.y - parentBounds.y;
      const bottomGap = (parentBounds.y + parentBounds.height) - (lastChild.y + lastChild.height);
      
      // Check if content is centered vertically with better logic
      const gapDifference = Math.abs(topGap - bottomGap);
      const totalGap = topGap + bottomGap;
      const contentHeight = (lastChild.y + lastChild.height) - firstChild.y;
      const parentHeight = parentBounds.height;
      
      // If content takes up most of the parent height, use flex-start
      if (contentHeight > parentHeight * 0.8) {
        result.justifyContent = 'flex-start';
      }
      // If gaps are very similar (within 15% of total), it's centered
      else if (totalGap > 0 && gapDifference < totalGap * 0.15) {
        result.justifyContent = 'center';
      } 
      // If top gap is very small (< 40px), content is at top
      else if (topGap < 40) {
        result.justifyContent = 'flex-start';
      }
      // If bottom gap is very small (< 40px), content is at bottom  
      else if (bottomGap < 40) {
        result.justifyContent = 'flex-end';
      }
      // If top gap is significantly smaller than bottom gap
      else if (topGap < bottomGap * 0.7) {
        result.justifyContent = 'flex-start';
      }
      // If bottom gap is significantly smaller than top gap
      else if (bottomGap < topGap * 0.7) {
        result.justifyContent = 'flex-end';
      }
      // Default to flex-start (most common for forms)
      else {
        result.justifyContent = 'flex-start';
      }
    } else if (arrangement === 'horizontal') {
      // Check vertical alignment (alignItems for row)
      const parentCenterY = parentBounds.y + parentBounds.height / 2;
      const parentTop = parentBounds.y;
      const parentBottom = parentBounds.y + parentBounds.height;
      
      let centeredCount = 0;
      let topAlignedCount = 0;
      let bottomAlignedCount = 0;
      
      for (const child of childrenWithBounds) {
        const bounds = child.absoluteBoundingBox!;
        const childCenterY = bounds.y + bounds.height / 2;
        const childTop = bounds.y;
        const childBottom = bounds.y + bounds.height;
        
        // Use tighter tolerance for center detection (2px)
        if (Math.abs(childCenterY - parentCenterY) < 2) {
          centeredCount++;
        } else if (Math.abs(childTop - parentTop) < 5) {
          topAlignedCount++;
        } else if (Math.abs(childBottom - parentBottom) < 5) {
          bottomAlignedCount++;
        }
      }
      
      // Determine alignment based on majority with better edge case handling
      const total = childrenWithBounds.length;
      const centerThreshold = total >= 3 ? 0.6 : 0.5;
      
      if (centeredCount >= total * centerThreshold) {
        result.alignItems = 'center';
      } else if (topAlignedCount >= total * centerThreshold) {
        result.alignItems = 'flex-start';
      } else if (bottomAlignedCount >= total * centerThreshold) {
        result.alignItems = 'flex-end';
      } else if (centeredCount > topAlignedCount && centeredCount > bottomAlignedCount) {
        result.alignItems = 'center';
      } else if (topAlignedCount > bottomAlignedCount) {
        result.alignItems = 'flex-start';
      } else if (bottomAlignedCount > topAlignedCount) {
        result.alignItems = 'flex-end';
      } else {
        // Check if children are stretched
        const allFullHeight = childrenWithBounds.every(c => {
          const childHeight = c.absoluteBoundingBox!.height;
          return Math.abs(childHeight - parentBounds.height) < 10;
        });
        result.alignItems = allFullHeight ? 'stretch' : 'flex-start';
      }
      
      // Check horizontal distribution (justifyContent for row)
      const sortedByX = [...childrenWithBounds].sort((a, b) => 
        a.absoluteBoundingBox!.x - b.absoluteBoundingBox!.x
      );
      const firstChild = sortedByX[0].absoluteBoundingBox!;
      const lastChild = sortedByX[sortedByX.length - 1].absoluteBoundingBox!;
      
      const leftGap = firstChild.x - parentBounds.x;
      const rightGap = (parentBounds.x + parentBounds.width) - (lastChild.x + lastChild.width);
      
      // Check if content is centered horizontally
      if (Math.abs(leftGap - rightGap) < 20) {
        result.justifyContent = 'center';
      } else if (leftGap < 20) {
        result.justifyContent = 'flex-start';
      } else if (rightGap < 20) {
        result.justifyContent = 'flex-end';
      } else {
        // Check for space-between pattern
        if (childrenWithBounds.length >= 2) {
          const totalChildWidth = childrenWithBounds.reduce((sum, c) => 
            sum + c.absoluteBoundingBox!.width, 0
          );
          const totalGapSpace = parentBounds.width - totalChildWidth;
          const averageGap = totalGapSpace / (childrenWithBounds.length + 1);
          
          // If gaps are roughly equal, use space-between
          if (Math.abs(leftGap - averageGap) < 10 && Math.abs(rightGap - averageGap) < 10) {
            result.justifyContent = 'space-between';
          }
        }
      }
    }

    return result;
  }

  private determineLayoutStrategy(node: FigmaNode): LayoutStrategy {
    // If node has explicit auto-layout, use flexbox
    if (node.layoutMode && node.layoutMode !== 'NONE') {
      return LayoutStrategy.Flexbox;
    }

    // For nodes without explicit auto-layout, check if children are clearly arranged
    if (node.children && node.children.length > 0 && node.absoluteBoundingBox) {
      const arrangement = this.detectChildArrangement(node.children);
      
      // If children are clearly arranged in a single direction, use flexbox
      if (arrangement === 'vertical' || arrangement === 'horizontal') {
        return LayoutStrategy.Flexbox;
      }
      
      // Otherwise use absolute positioning for complex layouts
      return LayoutStrategy.Absolute;
    }

    // Default to static for leaf nodes
    return LayoutStrategy.Static;
  }

  private detectChildArrangement(children: FigmaNode[]): 'vertical' | 'horizontal' | 'complex' {
    const childrenWithBounds = children.filter(c => c.absoluteBoundingBox);
    
    if (childrenWithBounds.length < 2) {
      return 'complex';
    }

    // Don't filter out decorative elements - include them in layout
    // This ensures lines and other small elements are part of the flexbox flow
    const childrenToCheck = childrenWithBounds;

    // Check for vertical arrangement
    const sortedByY = [...childrenToCheck].sort((a, b) => 
      a.absoluteBoundingBox!.y - b.absoluteBoundingBox!.y
    );
    
    let isVertical = true;
    for (let i = 0; i < sortedByY.length - 1; i++) {
      const current = sortedByY[i].absoluteBoundingBox!;
      const next = sortedByY[i + 1].absoluteBoundingBox!;
      
      // Check if next element starts after current element ends (vertically)
      if (next.y < current.y + current.height - 5) { // 5px tolerance for overlap
        isVertical = false;
        break;
      }
    }
    
    if (isVertical) {
      return 'vertical';
    }

    // Check for horizontal arrangement
    const sortedByX = [...childrenToCheck].sort((a, b) => 
      a.absoluteBoundingBox!.x - b.absoluteBoundingBox!.x
    );
    
    let isHorizontal = true;
    for (let i = 0; i < sortedByX.length - 1; i++) {
      const current = sortedByX[i].absoluteBoundingBox!;
      const next = sortedByX[i + 1].absoluteBoundingBox!;
      
      // Check if next element starts after current element ends (horizontally)
      if (next.x < current.x + current.width - 5) { // 5px tolerance for overlap
        isHorizontal = false;
        break;
      }
    }
    
    if (isHorizontal) {
      return 'horizontal';
    }

    return 'complex';
  }

  private mapPrimaryAxisAlignment(alignment: string): string {
    const map: Record<string, string> = {
      'MIN': 'flex-start',
      'CENTER': 'center',
      'MAX': 'flex-end',
      'SPACE_BETWEEN': 'space-between',
    };
    return map[alignment] || 'flex-start';
  }

  private mapCounterAxisAlignment(alignment: string): string {
    const map: Record<string, string> = {
      'MIN': 'flex-start',
      'CENTER': 'center',
      'MAX': 'flex-end',
    };
    return map[alignment] || 'flex-start';
  }

  private getDefaultStyles(): StyleProperties {
    return {
      fills: [],
      strokes: [],
      effects: [],
      opacity: 1,
      blendMode: 'NORMAL',
    };
  }

  private getDefaultLayout(): LayoutProperties {
    return {
      strategy: LayoutStrategy.Static,
    };
  }

  private calculateChildGaps(children: FigmaNode[], arrangement: string): { averageGap: number } {
    if (children.length < 2) {
      return { averageGap: 0 };
    }

    const gaps: number[] = [];
    const childrenWithBounds = children.filter(c => c.absoluteBoundingBox);
    
    if (arrangement === 'vertical') {
      // Sort children by Y position
      const sortedChildren = [...childrenWithBounds]
        .sort((a, b) => a.absoluteBoundingBox!.y - b.absoluteBoundingBox!.y);

      // Calculate gaps between consecutive children with sub-pixel precision
      for (let i = 0; i < sortedChildren.length - 1; i++) {
        const current = sortedChildren[i].absoluteBoundingBox!;
        const next = sortedChildren[i + 1].absoluteBoundingBox!;
        
        const gap = next.y - (current.y + current.height);
        if (gap >= 0) {
          gaps.push(gap);
        }
      }
    } else if (arrangement === 'horizontal') {
      // Sort children by X position
      const sortedChildren = [...childrenWithBounds]
        .sort((a, b) => a.absoluteBoundingBox!.x - b.absoluteBoundingBox!.x);

      // Calculate gaps between consecutive children with sub-pixel precision
      for (let i = 0; i < sortedChildren.length - 1; i++) {
        const current = sortedChildren[i].absoluteBoundingBox!;
        const next = sortedChildren[i + 1].absoluteBoundingBox!;
        
        const gap = next.x - (current.x + current.width);
        if (gap >= 0) {
          gaps.push(gap);
        }
      }
    }

    if (gaps.length === 0) {
      return { averageGap: 0 };
    }

    // Calculate average gap with outlier filtering
    if (gaps.length === 1) {
      // Use sub-pixel precision for single gap
      return { averageGap: Math.round(gaps[0] * 100) / 100 };
    }
    
    // Sort gaps to identify outliers
    const sortedGaps = [...gaps].sort((a, b) => a - b);
    
    // Remove extreme outliers (values more than 2.5x the median)
    const median = sortedGaps[Math.floor(sortedGaps.length / 2)];
    const filteredGaps = sortedGaps.filter(gap => gap <= median * 2.5);
    
    // If we filtered out too many, use all gaps
    const gapsToUse = filteredGaps.length >= gaps.length * 0.5 ? filteredGaps : gaps;
    
    const averageGap = gapsToUse.reduce((sum, gap) => sum + gap, 0) / gapsToUse.length;
    
    // Use sub-pixel precision (2 decimal places)
    const preciseGap = Math.round(averageGap * 100) / 100;
    
    // Handle edge cases
    if (preciseGap < 0) return { averageGap: 0 };
    if (preciseGap > 200) return { averageGap: 24 }; // Cap at reasonable max
    
    return { averageGap: preciseGap };
  }

  private calculatePadding(parent: FigmaNode, children: FigmaNode[]): { top: number; right: number; bottom: number; left: number } | null {
    if (!parent.absoluteBoundingBox || children.length === 0) {
      return null;
    }

    const childrenWithBounds = children.filter(c => c.absoluteBoundingBox);
    if (childrenWithBounds.length === 0) {
      return null;
    }

    // Find the bounds of all children
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const child of childrenWithBounds) {
      const bounds = child.absoluteBoundingBox!;
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }

    const parentBounds = parent.absoluteBoundingBox;
    
    // Use sub-pixel precision for padding (2 decimal places)
    return {
      top: Math.max(0, Math.round((minY - parentBounds.y) * 100) / 100),
      right: Math.max(0, Math.round(((parentBounds.x + parentBounds.width) - maxX) * 100) / 100),
      bottom: Math.max(0, Math.round(((parentBounds.y + parentBounds.height) - maxY) * 100) / 100),
      left: Math.max(0, Math.round((minX - parentBounds.x) * 100) / 100),
    };
  }
}

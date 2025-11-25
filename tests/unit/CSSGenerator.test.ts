import { describe, it, expect } from 'vitest';
import { CSSGenerator } from '../../server/src/generator/CSSGenerator.js';
import type { TransformedNode, CSSProperties } from '../../server/src/types/internal.js';

describe('CSSGenerator', () => {
  it('should organize spacing properties correctly', () => {
    const generator = new CSSGenerator();
    
    const mockNode: TransformedNode = {
      element: {
        tag: 'div',
        attributes: {
          id: 'test-1',
          'data-name': 'test-element'
        },
        children: [],
      },
      styles: {
        display: 'flex',
        padding: '20px',
        gap: '16px',
        width: '300px',
        height: '200px',
        backgroundColor: '#ffffff',
      } as CSSProperties,
      children: [],
    };

    const result = generator.generate([mockNode]);
    
    // Check that CSS is generated
    expect(result.css).toBeTruthy();
    expect(result.css).toContain('display: flex');
    expect(result.css).toContain('padding: 20px');
    expect(result.css).toContain('gap: 16px');
    
    // Check that spacing properties appear before dimensions
    const displayIndex = result.css.indexOf('display: flex');
    const gapIndex = result.css.indexOf('gap: 16px');
    const paddingIndex = result.css.indexOf('padding: 20px');
    const widthIndex = result.css.indexOf('width: 300px');
    
    expect(displayIndex).toBeLessThan(gapIndex);
    expect(gapIndex).toBeLessThan(paddingIndex);
    expect(paddingIndex).toBeLessThan(widthIndex);
  });

  it('should handle multiple spacing properties', () => {
    const generator = new CSSGenerator();
    
    const mockNode: TransformedNode = {
      element: {
        tag: 'div',
        attributes: {
          id: 'test-2',
          'data-name': 'spaced-element'
        },
        children: [],
      },
      styles: {
        paddingTop: '10px',
        paddingRight: '20px',
        paddingBottom: '10px',
        paddingLeft: '20px',
        marginTop: '5px',
        gap: '12px',
      } as CSSProperties,
      children: [],
    };

    const result = generator.generate([mockNode]);
    
    expect(result.css).toContain('padding-top: 10px');
    expect(result.css).toContain('padding-right: 20px');
    expect(result.css).toContain('margin-top: 5px');
    expect(result.css).toContain('gap: 12px');
  });
});

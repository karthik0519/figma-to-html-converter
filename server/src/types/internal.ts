// Internal data structures

import type { NodeType, BoundingBox, Fill, Stroke, Effect, BlendMode, TextStyle } from './figma.js';

export interface ParsedNode {
  id: string;
  name: string;
  type: NodeType;
  children: ParsedNode[];
  bounds: BoundingBox;
  styles: StyleProperties;
  layout: LayoutProperties;
  textContent?: string;
  componentName?: string;
  componentType?: string;
}

export interface StyleProperties {
  fills: Fill[];
  strokes: Stroke[];
  effects: Effect[];
  opacity: number;
  blendMode: BlendMode;
  cornerRadius?: number | number[];
  textStyle?: TextStyle;
}

export interface LayoutProperties {
  strategy: LayoutStrategy;
  position?: { x: number; y: number };
  width?: number;
  height?: number;
  flexDirection?: 'row' | 'column';
  gap?: number;
  padding?: Spacing;
  alignItems?: string;
  justifyContent?: string;
  constraints?: {
    horizontal: string;
    vertical: string;
  };
}

export enum LayoutStrategy {
  Absolute = 'absolute',
  Flexbox = 'flexbox',
  Grid = 'grid',
  Static = 'static',
}

export interface Spacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface TransformedNode {
  element: HTMLElement;
  styles: CSSProperties;
  children: TransformedNode[];
}

export interface HTMLElement {
  tag: string;
  attributes: Record<string, string>;
  children: (HTMLElement | string)[];
  textContent?: string;
}

export interface CSSProperties {
  [key: string]: string | number;
}

export interface CSSRule {
  selector: string;
  declarations: CSSProperties;
}

export interface Asset {
  id: string;
  url: string;
  localPath: string;
  format: 'png' | 'jpg' | 'svg';
}

export interface ConversionResult {
  html: string;
  css: string;
  assets: Asset[];
  warnings: string[];
  errors: string[];
}

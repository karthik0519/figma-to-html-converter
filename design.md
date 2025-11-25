# Design Document

## Overview

The Figma-to-HTML/CSS Converter is a web application that transforms Figma design files into pixel-perfect HTML and CSS representations. Users provide a Figma file URL and API key through a simple web interface. The system fetches design data via the Figma REST API, processes the node tree to extract layout and styling information, and generates clean, semantic HTML with organized CSS. The output is packaged as a downloadable ZIP file and can be previewed directly in the browser.

The architecture follows a pipeline pattern: Fetch → Parse → Transform → Generate → Output. Each stage is modular and extensible to support the wide variety of node types and properties that Figma supports. The web interface provides a user-friendly way to interact with the conversion system without requiring command-line knowledge.

## Architecture

### High-Level Architecture

```
┌──────────────┐      ┌──────────────┐      ┌───────────────┐
│  Web Browser │─────▶│  Web Server  │─────▶│  Figma API    │
│  (Frontend)  │      │  (Express)   │      │  Client       │
└──────┬───────┘      └──────┬───────┘      └───────┬───────┘
       │                     │                       │
       │                     ▼                       ▼
       │              ┌──────────────┐      ┌───────────────┐
       │              │   Parser     │◀─────│  Figma JSON   │
       │              └──────┬───────┘      └───────────────┘
       │                     │
       │                     ▼
       │              ┌──────────────┐
       │              │ Transformer  │
       │              └──────┬───────┘
       │                     │
       │                     ▼
       │              ┌──────────────┐
       │              │  Generator   │
       │              └──────┬───────┘
       │                     │
       └◀────────────────────┘
         (Download ZIP)
```

### Component Breakdown

1. **Web Frontend**: React-based UI for inputting Figma URL and API key
2. **Web Server**: Express.js server that handles conversion requests
3. **API Router**: Routes HTTP requests to conversion endpoints
4. **Figma API Client**: Handles authentication and data fetching from Figma REST API
5. **Parser**: Converts raw Figma JSON into internal data structures
6. **Transformer**: Processes the node tree and converts Figma properties to web-compatible values
7. **Layout Engine**: Determines CSS positioning strategy (absolute, flexbox, grid)
8. **Style Mapper**: Converts Figma visual properties to CSS declarations
9. **HTML Generator**: Creates semantic HTML structure from the node tree
10. **CSS Generator**: Produces organized, readable CSS
11. **Asset Manager**: Handles image exports and file references
12. **ZIP Builder**: Packages HTML, CSS, and assets into a downloadable ZIP file

## Components and Interfaces

### 1. Web Frontend

```typescript
interface ConversionRequest {
  figmaUrl: string;
  apiKey: string;
}

interface ConversionResponse {
  success: boolean;
  downloadUrl?: string;
  previewHtml?: string;
  error?: string;
  warnings?: string[];
}

// React component for the main UI
const ConverterUI: React.FC
```

### 2. Web Server & API Router

```typescript
interface ServerConfig {
  port: number;
  tempDir: string;
}

class Server {
  constructor(config: ServerConfig)
  start(): void
}

// Express routes
POST /api/convert - Accepts Figma URL and API key, returns conversion result
GET /api/download/:id - Downloads the generated ZIP file
GET /api/preview/:id - Returns the generated HTML for preview
```

### 3. Figma API Client

```typescript
interface FigmaFile {
  document: FigmaNode;
  components: Record<string, FigmaComponent>;
  schemaVersion: number;
  styles: Record<string, FigmaStyle>;
}

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: BoundingBox;
  // ... other properties
}

class FigmaAPIClient {
  constructor(apiKey: string)
  async getFile(fileId: string): Promise<FigmaFile>
  async getImageUrls(fileId: string, nodeIds: string[]): Promise<Record<string, string>>
}
```

### 4. Parser

```typescript
interface ParsedNode {
  id: string;
  name: string;
  type: NodeType;
  children: ParsedNode[];
  bounds: BoundingBox;
  styles: StyleProperties;
  layout: LayoutProperties;
}

class Parser {
  parse(figmaFile: FigmaFile): ParsedNode
}
```

### 5. Transformer

```typescript
interface TransformedNode {
  element: HTMLElement;
  styles: CSSProperties;
  children: TransformedNode[];
}

class Transformer {
  transform(parsedNode: ParsedNode): TransformedNode
}
```

### 6. Layout Engine

```typescript
enum LayoutStrategy {
  Absolute = 'absolute',
  Flexbox = 'flexbox',
  Grid = 'grid',
  Static = 'static'
}

interface LayoutProperties {
  strategy: LayoutStrategy;
  position?: { x: number; y: number };
  flexDirection?: 'row' | 'column';
  gap?: number;
  padding?: Spacing;
  // ... other layout properties
}

class LayoutEngine {
  determineLayoutStrategy(node: ParsedNode): LayoutStrategy
  generateLayoutCSS(node: ParsedNode): CSSProperties
}
```

### 7. Style Mapper

```typescript
interface CSSProperties {
  [key: string]: string | number;
}

class StyleMapper {
  mapFillsToCSS(fills: FigmaFill[]): CSSProperties
  mapStrokesToCSS(strokes: FigmaStroke[]): CSSProperties
  mapEffectsToCSS(effects: FigmaEffect[]): CSSProperties
  mapTypographyToCSS(style: FigmaTextStyle): CSSProperties
}
```

### 8. HTML Generator

```typescript
interface HTMLElement {
  tag: string;
  attributes: Record<string, string>;
  children: (HTMLElement | string)[];
  textContent?: string;
}

class HTMLGenerator {
  generate(transformedNode: TransformedNode): string
  createSemanticElement(node: ParsedNode): HTMLElement
}
```

### 9. CSS Generator

```typescript
interface CSSRule {
  selector: string;
  declarations: CSSProperties;
}

class CSSGenerator {
  generate(transformedNodes: TransformedNode[]): string
  extractCommonStyles(nodes: TransformedNode[]): CSSRule[]
  generateClassName(node: ParsedNode): string
}
```

### 10. Asset Manager

```typescript
interface Asset {
  id: string;
  url: string;
  localPath: string;
  format: 'png' | 'jpg' | 'svg';
}

class AssetManager {
  async exportImages(fileId: string, nodes: ParsedNode[]): Promise<Asset[]>
  async downloadAsset(url: string, outputPath: string): Promise<void>
  generateAssetPath(asset: Asset): string
}
```

## Data Models

### Node Type Hierarchy

```typescript
enum NodeType {
  DOCUMENT = 'DOCUMENT',
  CANVAS = 'CANVAS',
  FRAME = 'FRAME',
  GROUP = 'GROUP',
  RECTANGLE = 'RECTANGLE',
  ELLIPSE = 'ELLIPSE',
  TEXT = 'TEXT',
  VECTOR = 'VECTOR',
  INSTANCE = 'INSTANCE',
  COMPONENT = 'COMPONENT'
}
```

### Style Properties

```typescript
interface StyleProperties {
  fills: Fill[];
  strokes: Stroke[];
  effects: Effect[];
  opacity: number;
  blendMode: BlendMode;
  cornerRadius?: number | number[];
}

interface Fill {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'IMAGE';
  color?: RGBA;
  gradientStops?: GradientStop[];
  imageRef?: string;
  opacity?: number;
}

interface Stroke {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL';
  color?: RGBA;
  weight: number;
  align: 'INSIDE' | 'OUTSIDE' | 'CENTER';
}

interface Effect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  color?: RGBA;
  offset?: { x: number; y: number };
  radius: number;
  spread?: number;
}
```

### Typography

```typescript
interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number | { unit: 'PIXELS' | 'PERCENT'; value: number };
  letterSpacing: number;
  textAlign: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textDecoration: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
}
```

### Layout Models

```typescript
interface AutoLayout {
  mode: 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizing: 'FIXED' | 'AUTO';
  counterAxisSizing: 'FIXED' | 'AUTO';
  primaryAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems: 'MIN' | 'CENTER' | 'MAX';
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  itemSpacing: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: API Response Parsing Completeness
*For any* valid Figma API response containing nodes, parsing the response should extract all nodes without loss
**Validates: Requirements 1.2**

### Property 2: Error Messages for API Failures
*For any* API error response, the system should produce a clear error message that includes the failure reason
**Validates: Requirements 1.3**

### Property 3: Parse-Serialize Round Trip
*For any* parsed Figma file data, serializing it back to JSON and re-parsing should produce an equivalent internal structure
**Validates: Requirements 1.4**

### Property 4: Multi-Page Processing
*For any* Figma file with N pages, the system should process all N pages and their frames
**Validates: Requirements 1.5**

### Property 5: Absolute Position Conversion
*For any* Figma node with absolute coordinates (x, y), the generated CSS should position the element at those exact coordinates
**Validates: Requirements 2.1**

### Property 6: Auto-Layout to Flexbox Conversion
*For any* Figma frame with auto-layout properties, the generated CSS should include flexbox properties that match the layout direction and alignment
**Validates: Requirements 2.2**

### Property 7: Spacing Property Preservation
*For any* Figma node with padding, margin, or gap values, the generated CSS should contain equivalent spacing properties with the same numeric values
**Validates: Requirements 2.3**

### Property 8: Hierarchy Preservation
*For any* Figma node tree with nested children, the generated HTML should maintain the same parent-child relationships
**Validates: Requirements 2.4, 7.4**

### Property 9: Typography Property Completeness
*For any* text node with font properties (family, size, weight, line-height, letter-spacing, alignment), the generated CSS should include all specified properties
**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 10: Custom Font Documentation
*For any* text node using a non-web-safe font, the system should log a warning about the custom font
**Validates: Requirements 3.6**

### Property 11: Color Conversion Accuracy
*For any* RGBA color value in Figma, the generated CSS should contain a color string that represents the same RGBA values
**Validates: Requirements 4.1**

### Property 12: Gradient Syntax Generation
*For any* gradient fill with stops and colors, the generated CSS should contain a valid CSS gradient with all stops in the correct order
**Validates: Requirements 4.2**

### Property 13: Fill Layering Order
*For any* node with multiple fills, the generated CSS should apply fills in the same order as specified in Figma
**Validates: Requirements 4.3**

### Property 14: Opacity Application
*For any* node with opacity value O, the generated CSS should include opacity: O
**Validates: Requirements 4.4**

### Property 15: Border Property Completeness
*For any* node with a border, the generated CSS should include border-width, border-style, and border-color
**Validates: Requirements 5.1**

### Property 16: Selective Border Sides
*For any* node with borders on specific sides only, the generated CSS should only include border properties for those sides
**Validates: Requirements 5.2**

### Property 17: Border Radius Conversion
*For any* node with border radius values, the generated CSS should include border-radius with the same values
**Validates: Requirements 5.4**

### Property 18: Shadow Property Completeness
*For any* drop shadow effect, the generated CSS box-shadow should include offset-x, offset-y, blur-radius, spread-radius, and color
**Validates: Requirements 6.1**

### Property 19: Inner Shadow Detection
*For any* inner shadow effect, the generated CSS box-shadow should include the "inset" keyword
**Validates: Requirements 6.2**

### Property 20: Multiple Shadows
*For any* node with N shadow effects, the generated CSS should contain N comma-separated box-shadow values
**Validates: Requirements 6.3**

### Property 21: Blur Filter Generation
*For any* node with a blur effect of radius R, the generated CSS should include filter: blur(R)
**Validates: Requirements 6.4**

### Property 22: HTML5 Validity
*For any* generated HTML document, parsing it with an HTML5 parser should succeed without errors
**Validates: Requirements 7.1**

### Property 23: Layer Name to Identifier Mapping
*For any* Figma node with a name, the generated HTML element should have an id or class that is derived from that name
**Validates: Requirements 7.3**

### Property 24: Text Content Preservation
*For any* text node with content T, the generated HTML should contain the exact text T
**Validates: Requirements 7.5**

### Property 25: Shared Style Extraction
*For any* set of nodes with identical style properties, the generated CSS should create a shared class used by all those nodes
**Validates: Requirements 8.2**

### Property 26: CSS Naming Consistency
*For any* set of generated CSS class names, they should all follow the same naming pattern (e.g., all kebab-case or all camelCase)
**Validates: Requirements 8.3**

### Property 27: Image Reference Generation
*For any* node with an image fill, the generated HTML should contain an img tag or background-image reference
**Validates: Requirements 9.1**

### Property 28: Image Format Validity
*For any* exported image file, it should have a valid extension (.png, .jpg, .svg) and be readable by standard image libraries
**Validates: Requirements 9.2**

### Property 29: Vector to SVG Conversion
*For any* vector node, the system should generate an SVG representation
**Validates: Requirements 9.3**

### Property 30: Relative Path Usage
*For any* asset reference in the generated HTML, the path should be relative (not absolute)
**Validates: Requirements 9.5, 12.2**

### Property 31: Node Type Handling
*For any* standard Figma node type (FRAME, GROUP, RECTANGLE, ELLIPSE, TEXT, VECTOR), the system should process it without throwing an error
**Validates: Requirements 10.1**

### Property 32: Unsupported Feature Warnings
*For any* unsupported Figma feature encountered, the system should log a warning and continue processing
**Validates: Requirements 10.2, 11.3**

### Property 33: Deep Nesting Support
*For any* Figma node tree with nesting depth D, the system should successfully process all nodes at all depths
**Validates: Requirements 10.5**

### Property 34: Error Logging Detail
*For any* error that occurs during conversion, the logged error message should include the node ID and error type
**Validates: Requirements 11.2**

### Property 35: Figma Layer Comments
*For any* generated HTML element, the HTML should include a comment indicating the source Figma layer name
**Validates: Requirements 11.4**

### Property 36: Self-Contained HTML
*For any* generated HTML file, all CSS and asset references should be resolvable without a web server
**Validates: Requirements 12.1, 12.3**

## Error Handling

### Error Categories

1. **API Errors**
   - Invalid API key
   - File not found
   - Network failures
   - Rate limiting

2. **Parsing Errors**
   - Malformed JSON
   - Unexpected node types
   - Missing required properties

3. **Conversion Errors**
   - Unsupported features
   - Invalid property values
   - Asset export failures

4. **Output Errors**
   - File system write failures
   - Invalid file paths
   - Disk space issues

### Error Handling Strategy

- All errors should be caught and logged with context (node ID, property name, etc.)
- The system should continue processing other nodes when encountering errors
- A summary of all errors and warnings should be displayed at the end
- Critical errors (API failures, file system errors) should halt execution
- Non-critical errors (unsupported features) should be logged but allow continuation

### Logging Levels

- **ERROR**: Critical failures that prevent conversion
- **WARN**: Unsupported features or degraded output quality
- **INFO**: Progress updates and successful operations
- **DEBUG**: Detailed processing information for troubleshooting

## Testing Strategy

### Unit Testing

The system will use **Vitest** as the testing framework for unit tests. Unit tests will cover:

- Individual component functionality (Parser, StyleMapper, LayoutEngine, etc.)
- Edge cases like empty nodes, missing properties, extreme values
- Error handling for invalid inputs
- Specific examples of complex conversions (gradient borders, nested auto-layout)

### Property-Based Testing

The system will use **fast-check** for property-based testing in TypeScript. Property-based tests will:

- Run a minimum of 100 iterations per property
- Generate random Figma node structures with valid properties
- Verify that correctness properties hold across all generated inputs
- Each property-based test will be tagged with a comment in this format: `**Feature: figma-to-html-converter, Property {number}: {property_text}**`
- Each correctness property from this design document will be implemented by a SINGLE property-based test

### Integration Testing

Integration tests will verify:

- End-to-end conversion of sample Figma files
- Correct interaction between components (Parser → Transformer → Generator)
- Asset export and file system operations
- Generated HTML can be parsed and rendered

### Visual Regression Testing

While not automated initially, the system should support:

- Generating reference screenshots from Figma
- Generating screenshots from rendered HTML
- Manual comparison for visual fidelity verification

### Test Data

- Mock Figma API responses for various node types
- Sample Figma files with different complexity levels
- Edge cases: deeply nested structures, many effects, complex gradients
- Real-world design files for integration testing

## Implementation Considerations

### Performance

- Lazy loading of node processing for large files
- Parallel processing of independent nodes where possible
- Caching of repeated style calculations
- Efficient string building for HTML/CSS generation

### Extensibility

- Plugin system for custom node type handlers
- Configurable style mapping rules
- Template system for HTML structure generation
- Hook system for pre/post-processing

### Browser Compatibility

- Target modern browsers (Chrome, Firefox, Safari, Edge)
- Use standard CSS properties where possible
- Include vendor prefixes for experimental features
- Fallback styles for unsupported properties

### Limitations

Known limitations to document:

- Custom fonts may not render identically without font files
- Some Figma blend modes may not have CSS equivalents
- Complex vector operations may require SVG approximations
- Figma plugins and dynamic content cannot be converted
- Responsive behavior is not automatically generated
- Interactions and animations are not supported

### 11. ZIP Builder

```typescript
interface ZIPContents {
  html: string;
  css: string;
  assets: Asset[];
}

class ZIPBuilder {
  async createZIP(contents: ZIPContents): Promise<Buffer>
  async writeZIPToFile(zip: Buffer, outputPath: string): Promise<void>
}
```

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js
- **Frontend**: React with Vite
- **Backend**: Express.js
- **API Client**: axios
- **HTML/CSS Generation**: Template literals
- **Testing**: Vitest (unit tests) + fast-check (property-based tests)
- **File System**: Node.js fs/promises
- **ZIP Creation**: archiver or jszip
- **Temporary Files**: Node.js os.tmpdir()
- **SVG Generation**: Custom generation

## Project Structure

```
figma-to-html/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConverterForm.tsx
│   │   │   ├── PreviewPane.tsx
│   │   │   └── DownloadButton.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── server/                    # Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   └── api.ts
│   │   ├── api/
│   │   │   └── FigmaAPIClient.ts
│   │   ├── parser/
│   │   │   └── Parser.ts
│   │   ├── transformer/
│   │   │   ├── Transformer.ts
│   │   │   ├── LayoutEngine.ts
│   │   │   └── StyleMapper.ts
│   │   ├── generator/
│   │   │   ├── HTMLGenerator.ts
│   │   │   ├── CSSGenerator.ts
│   │   │   └── ZIPBuilder.ts
│   │   ├── assets/
│   │   │   └── AssetManager.ts
│   │   ├── types/
│   │   │   ├── figma.ts
│   │   │   └── internal.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   └── helpers.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
├── tests/
│   ├── unit/
│   ├── integration/
│   └── properties/
├── package.json               # Root package.json for monorepo
├── vitest.config.ts
└── README.md
```

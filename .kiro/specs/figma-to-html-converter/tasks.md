# Implementation Plan

- [x] 1. Set up project structure and development environment
  - Create monorepo structure with client and server directories
  - Initialize TypeScript configuration for both frontend and backend
  - Set up Vite for React frontend
  - Set up Express.js for backend server
  - Install core dependencies (React, Express, axios, archiver/jszip)
  - Install testing dependencies (Vitest, fast-check)
  - Configure build scripts and development workflow
  - _Requirements: 14.1, 14.2_

- [x] 2. Implement Figma API client
  - Create FigmaAPIClient class with authentication
  - Implement getFile method to fetch Figma file data
  - Implement getImageUrls method for asset exports
  - Add error handling for API failures (invalid key, file not found, network errors)
  - Add request retry logic for transient failures
  - _Requirements: 1.2, 1.3_

- [ ]* 2.1 Write property test for API error handling
  - **Property 2: Error Messages for API Failures**
  - **Validates: Requirements 1.3**

- [x] 3. Implement Parser component
  - Create Parser class to convert Figma JSON to internal data structures
  - Implement node tree traversal
  - Extract bounding boxes, styles, and layout properties from Figma nodes
  - Handle all standard node types (FRAME, GROUP, RECTANGLE, ELLIPSE, TEXT, VECTOR)
  - _Requirements: 1.4, 10.1_

- [ ]* 3.1 Write property test for parsing completeness
  - **Property 1: API Response Parsing Completeness**
  - **Validates: Requirements 1.2**

- [ ]* 3.2 Write property test for parse-serialize round trip
  - **Property 3: Parse-Serialize Round Trip**
  - **Validates: Requirements 1.4**

- [ ]* 3.3 Write property test for multi-page processing
  - **Property 4: Multi-Page Processing**
  - **Validates: Requirements 1.5**

- [ ]* 3.4 Write property test for node type handling
  - **Property 31: Node Type Handling**
  - **Validates: Requirements 10.1**

- [ ]* 3.5 Write property test for deep nesting support
  - **Property 33: Deep Nesting Support**
  - **Validates: Requirements 10.5**

- [x] 4. Implement Layout Engine
  - Create LayoutEngine class
  - Implement determineLayoutStrategy method to choose between absolute, flexbox, grid, or static positioning
  - Implement generateLayoutCSS for absolute positioning
  - Implement generateLayoutCSS for auto-layout (flexbox conversion)
  - Handle spacing properties (padding, margin, gap)
  - Handle positioning constraints (left, right, top, bottom, center)
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [ ]* 4.1 Write property test for absolute position conversion
  - **Property 5: Absolute Position Conversion**
  - **Validates: Requirements 2.1**

- [ ]* 4.2 Write property test for auto-layout to flexbox conversion
  - **Property 6: Auto-Layout to Flexbox Conversion**
  - **Validates: Requirements 2.2**

- [ ]* 4.3 Write property test for spacing property preservation
  - **Property 7: Spacing Property Preservation**
  - **Validates: Requirements 2.3**

- [x] 5. Implement Style Mapper
  - Create StyleMapper class
  - Implement mapFillsToCSS for solid colors
  - Implement mapFillsToCSS for gradients (linear, radial, angular)
  - Handle multiple fills with correct layering
  - Implement mapStrokesToCSS for borders
  - Handle selective border sides
  - Implement border radius conversion
  - Implement opacity and blend mode conversion
  - Implement mapEffectsToCSS for shadows (drop shadow, inner shadow)
  - Implement blur effects (layer blur, background blur)
  - Implement mapTypographyToCSS for text styles
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 5.1 Write property test for color conversion accuracy
  - **Property 11: Color Conversion Accuracy**
  - **Validates: Requirements 4.1**

- [ ]* 5.2 Write property test for gradient syntax generation
  - **Property 12: Gradient Syntax Generation**
  - **Validates: Requirements 4.2**

- [ ]* 5.3 Write property test for fill layering order
  - **Property 13: Fill Layering Order**
  - **Validates: Requirements 4.3**

- [ ]* 5.4 Write property test for opacity application
  - **Property 14: Opacity Application**
  - **Validates: Requirements 4.4**

- [ ]* 5.5 Write property test for border property completeness
  - **Property 15: Border Property Completeness**
  - **Validates: Requirements 5.1**

- [ ]* 5.6 Write property test for selective border sides
  - **Property 16: Selective Border Sides**
  - **Validates: Requirements 5.2**

- [ ]* 5.7 Write property test for border radius conversion
  - **Property 17: Border Radius Conversion**
  - **Validates: Requirements 5.4**

- [ ]* 5.8 Write property test for shadow property completeness
  - **Property 18: Shadow Property Completeness**
  - **Validates: Requirements 6.1**

- [ ]* 5.9 Write property test for inner shadow detection
  - **Property 19: Inner Shadow Detection**
  - **Validates: Requirements 6.2**

- [ ]* 5.10 Write property test for multiple shadows
  - **Property 20: Multiple Shadows**
  - **Validates: Requirements 6.3**

- [ ]* 5.11 Write property test for blur filter generation
  - **Property 21: Blur Filter Generation**
  - **Validates: Requirements 6.4**

- [ ]* 5.12 Write property test for typography property completeness
  - **Property 9: Typography Property Completeness**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [ ]* 5.13 Write property test for custom font documentation
  - **Property 10: Custom Font Documentation**
  - **Validates: Requirements 3.6**

- [x] 6. Implement Transformer
  - Create Transformer class that orchestrates Layout Engine and Style Mapper
  - Implement transform method to process parsed node tree
  - Combine layout and style information into TransformedNode structure
  - Handle nested children recursively
  - _Requirements: 2.4_

- [ ]* 6.1 Write property test for hierarchy preservation
  - **Property 8: Hierarchy Preservation**
  - **Validates: Requirements 2.4, 7.4**

- [x] 7. Implement HTML Generator
  - Create HTMLGenerator class
  - Implement generate method to create HTML string from TransformedNode tree
  - Implement createSemanticElement to choose appropriate HTML tags
  - Generate element IDs and classes from Figma layer names
  - Preserve text content exactly
  - Add HTML comments indicating source Figma layer names
  - Generate valid HTML5 document structure
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 11.4_

- [ ]* 7.1 Write property test for HTML5 validity
  - **Property 22: HTML5 Validity**
  - **Validates: Requirements 7.1**

- [ ]* 7.2 Write property test for layer name to identifier mapping
  - **Property 23: Layer Name to Identifier Mapping**
  - **Validates: Requirements 7.3**

- [ ]* 7.3 Write property test for text content preservation
  - **Property 24: Text Content Preservation**
  - **Validates: Requirements 7.5**

- [ ]* 7.4 Write property test for Figma layer comments
  - **Property 35: Figma Layer Comments**
  - **Validates: Requirements 11.4**

- [x] 8. Implement CSS Generator
  - Create CSSGenerator class
  - Implement generate method to create CSS string from TransformedNode array
  - Implement extractCommonStyles to identify shared styles
  - Generate consistent class names using naming convention
  - Format CSS with proper indentation
  - Add vendor prefixes where needed
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 8.1 Write property test for shared style extraction
  - **Property 25: Shared Style Extraction**
  - **Validates: Requirements 8.2**

- [ ]* 8.2 Write property test for CSS naming consistency
  - **Property 26: CSS Naming Consistency**
  - **Validates: Requirements 8.3**

- [x] 9. Implement Asset Manager
  - Create AssetManager class
  - Implement exportImages to identify nodes with image fills
  - Implement downloadAsset to fetch images from Figma
  - Implement vector to SVG conversion
  - Generate relative asset paths
  - Validate exported image formats
  - Store assets in temporary directory
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 9.1 Write property test for image reference generation
  - **Property 27: Image Reference Generation**
  - **Validates: Requirements 9.1**

- [ ]* 9.2 Write property test for image format validity
  - **Property 28: Image Format Validity**
  - **Validates: Requirements 9.2**

- [ ]* 9.3 Write property test for vector to SVG conversion
  - **Property 29: Vector to SVG Conversion**
  - **Validates: Requirements 9.3**

- [ ]* 9.4 Write property test for relative path usage
  - **Property 30: Relative Path Usage**
  - **Validates: Requirements 9.5, 12.2**

- [x] 10. Implement error handling and logging
  - Create logger utility with ERROR, WARN, INFO, DEBUG levels
  - Add error handling to all components
  - Implement unsupported feature warnings
  - Add detailed error context (node ID, property name)
  - Create error summary reporting
  - _Requirements: 11.1, 11.2, 11.3_

- [ ]* 10.1 Write property test for unsupported feature warnings
  - **Property 32: Unsupported Feature Warnings**
  - **Validates: Requirements 10.2, 11.3**

- [ ]* 10.2 Write property test for error logging detail
  - **Property 34: Error Logging Detail**
  - **Validates: Requirements 11.2**

- [x] 11. Implement ZIP Builder
  - Create ZIPBuilder class
  - Implement createZIP method to package HTML, CSS, and assets
  - Ensure all paths are relative and self-contained
  - Clean up temporary files after ZIP creation
  - _Requirements: 12.5, 14.4_

- [ ]* 11.1 Write property test for self-contained HTML
  - **Property 36: Self-Contained HTML**
  - **Validates: Requirements 12.1, 12.3**

- [x] 12. Implement Express.js backend server
  - Create Express server with configuration
  - Implement POST /api/convert endpoint
  - Implement GET /api/download/:id endpoint
  - Implement GET /api/preview/:id endpoint
  - Add request validation
  - Add CORS configuration for local development
  - Store conversion results temporarily with unique IDs
  - Implement automatic cleanup of old temporary files
  - _Requirements: 1.1, 12.4, 14.1, 14.2, 14.3, 14.4_

- [x] 13. Implement React frontend
  - Create ConverterForm component with input fields for Figma URL and API key
  - Add form validation
  - Implement file ID extraction from Figma URL
  - Create PreviewPane component to display generated HTML in iframe
  - Create DownloadButton component
  - Add progress indicator during conversion
  - Display error messages with troubleshooting tips
  - Store API key in session storage only (not localStorage)
  - Implement API calls to backend endpoints
  - _Requirements: 1.1, 1.2, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [x] 14. Wire up end-to-end conversion pipeline
  - Connect all components in the conversion flow: API Client → Parser → Transformer → Generators → ZIP Builder
  - Implement main conversion orchestrator function
  - Add progress tracking throughout pipeline
  - Ensure error propagation works correctly
  - Test with sample Figma files
  - _Requirements: All_

- [x] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Create documentation
  - Write README with setup instructions
  - Document how to obtain Figma API key
  - Document known limitations
  - Add usage examples
  - Document API endpoints
  - Add troubleshooting guide
  - _Requirements: 11.1, 11.5_

- [ ]* 16.1 Write unit tests for edge cases
  - Test empty nodes and missing properties
  - Test extreme values (very large/small dimensions)
  - Test complex nested structures
  - Test files with no frames
  - Test nodes with no children

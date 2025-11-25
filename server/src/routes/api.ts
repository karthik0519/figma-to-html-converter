import express, { Request, Response } from 'express';
import { FigmaAPIClient } from '../api/FigmaAPIClient.js';
import { Parser } from '../parser/Parser.js';
import { Transformer } from '../transformer/Transformer.js';
import { HTMLGenerator } from '../generator/HTMLGenerator.js';
import { CSSGenerator } from '../generator/CSSGenerator.js';
import { AssetManager } from '../assets/AssetManager.js';
import { ZIPBuilder } from '../generator/ZIPBuilder.js';
import { extractFileId } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Store conversion results temporarily
const conversionCache = new Map<string, { zip: Buffer; timestamp: number }>();

// Clean up old conversions (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, data] of conversionCache.entries()) {
    if (data.timestamp < oneHourAgo) {
      conversionCache.delete(id);
      logger.debug(`Cleaned up old conversion: ${id}`);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

router.post('/convert', async (req: Request, res: Response) => {
  try {
    const { figmaUrl, apiKey } = req.body;

    // Validate input
    if (!figmaUrl || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: figmaUrl and apiKey',
      });
    }

    // Extract file ID
    const fileId = extractFileId(figmaUrl);
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Figma URL or file ID',
      });
    }

    logger.info(`Starting conversion for file: ${fileId}`);
    logger.clearErrors();
    logger.clearWarnings();

    // Initialize components
    const apiClient = new FigmaAPIClient(apiKey);
    const parser = new Parser();
    const transformer = new Transformer();
    const htmlGenerator = new HTMLGenerator();
    const cssGenerator = new CSSGenerator();
    const assetManager = new AssetManager();
    const zipBuilder = new ZIPBuilder();

    // Fetch Figma file
    const figmaFile = await apiClient.getFile(fileId);

    // Optionally fetch component and style metadata (skip if rate limited)
    let components = {};
    try {
      components = await apiClient.getFileComponents(fileId);
      logger.info(`Found ${Object.keys(components).length} components`);
    } catch (error) {
      logger.warn('Skipping component metadata due to rate limits');
    }

    // Parse the file with component context
    const parsedNode = parser.parse(figmaFile, components);

    // Get image URLs for nodes with images
    const imageNodeIds: string[] = [];
    // TODO: Collect image node IDs from parsed tree
    const imageUrls = await apiClient.getImageUrls(fileId, imageNodeIds);

    // Transform to HTML/CSS structure
    const transformedNode = transformer.transform(parsedNode);

    // Generate CSS
    const { css, classMap } = cssGenerator.generate([transformedNode]);

    // Generate HTML
    const html = htmlGenerator.generate(transformedNode, classMap);

    // Export assets
    const assets = await assetManager.exportImages(fileId, [parsedNode], imageUrls);

    // Get warnings and errors
    const summary = logger.getSummary();
    const allWarnings = [
      ...parser.getWarnings(),
      ...transformer.getWarnings(),
      ...summary.warnings,
    ];

    // Generate README
    const readme = zipBuilder.generateReadme(allWarnings, summary.errors);

    // Create ZIP
    const zip = await zipBuilder.createZIP({
      html,
      css,
      assets,
      readme,
    });

    // Store result with unique ID
    const conversionId = `${fileId}-${Date.now()}`;
    conversionCache.set(conversionId, {
      zip,
      timestamp: Date.now(),
    });

    logger.info(`Conversion completed successfully: ${conversionId}`);

    res.json({
      success: true,
      downloadUrl: `/api/download/${conversionId}`,
      warnings: allWarnings,
    });
  } catch (error: any) {
    logger.error('Conversion failed', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: error.message || 'An unexpected error occurred during conversion',
    });
  }
});

router.get('/download/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const result = conversionCache.get(id);
  if (!result) {
    return res.status(404).json({
      success: false,
      error: 'Conversion not found or expired',
    });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="figma-export.zip"');
  res.send(result.zip);
});

// Debug endpoint to see raw Figma data
router.post('/debug', async (req: Request, res: Response) => {
  try {
    const { figmaUrl, apiKey } = req.body;
    const fileId = extractFileId(figmaUrl);
    
    if (!fileId) {
      return res.status(400).json({ error: 'Invalid Figma URL' });
    }

    const apiClient = new FigmaAPIClient(apiKey);
    const figmaFile = await apiClient.getFile(fileId);
    
    res.json({
      document: figmaFile.document,
      name: figmaFile.name,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint - no API calls
router.get('/test', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Converter is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;

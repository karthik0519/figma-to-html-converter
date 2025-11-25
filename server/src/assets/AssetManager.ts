import axios from 'axios';
import type { ParsedNode, Asset } from '../types/internal.js';
import { logger } from '../utils/logger.js';

export class AssetManager {
  private assets: Asset[] = [];

  async exportImages(fileId: string, nodes: ParsedNode[], imageUrls: Record<string, string>): Promise<Asset[]> {
    this.assets = [];
    
    // Collect all nodes with image fills
    const imageNodes = this.collectImageNodes(nodes);
    
    logger.info(`Found ${imageNodes.length} nodes with images`);

    // Download images
    for (const node of imageNodes) {
      const imageUrl = imageUrls[node.id];
      
      if (imageUrl) {
        try {
          const asset = await this.downloadAsset(node.id, imageUrl);
          this.assets.push(asset);
        } catch (error) {
          logger.error(`Failed to download image for node ${node.id}`, { error });
        }
      }
    }

    // Handle vector nodes
    const vectorNodes = this.collectVectorNodes(nodes);
    logger.info(`Found ${vectorNodes.length} vector nodes`);

    for (const node of vectorNodes) {
      const svg = this.convertToSVG(node);
      if (svg) {
        this.assets.push({
          id: node.id,
          url: '',
          localPath: `assets/${node.id}.svg`,
          format: 'svg',
        });
      }
    }

    logger.info(`Exported ${this.assets.length} assets`);
    return this.assets;
  }

  async downloadAsset(nodeId: string, url: string): Promise<Asset> {
    logger.debug(`Downloading asset: ${nodeId}`);
    
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      const format = this.detectImageFormat(response.data);
      const localPath = `assets/${nodeId}.${format}`;

      return {
        id: nodeId,
        url,
        localPath,
        format,
      };
    } catch (error) {
      logger.error(`Failed to download asset ${nodeId}`, { error });
      throw error;
    }
  }

  generateAssetPath(asset: Asset): string {
    return asset.localPath;
  }

  getAssets(): Asset[] {
    return this.assets;
  }

  private collectImageNodes(nodes: ParsedNode[]): ParsedNode[] {
    const imageNodes: ParsedNode[] = [];

    const traverse = (node: ParsedNode) => {
      // Check if node has image fills
      const hasImageFill = node.styles.fills.some(fill => fill.type === 'IMAGE');
      
      if (hasImageFill) {
        imageNodes.push(node);
      }

      // Traverse children
      for (const child of node.children) {
        traverse(child);
      }
    };

    for (const node of nodes) {
      traverse(node);
    }

    return imageNodes;
  }

  private collectVectorNodes(nodes: ParsedNode[]): ParsedNode[] {
    const vectorNodes: ParsedNode[] = [];

    const traverse = (node: ParsedNode) => {
      if (node.type === 'VECTOR') {
        vectorNodes.push(node);
      }

      for (const child of node.children) {
        traverse(child);
      }
    };

    for (const node of nodes) {
      traverse(node);
    }

    return vectorNodes;
  }

  private convertToSVG(node: ParsedNode): string | null {
    // Basic SVG generation for simple shapes
    const { width, height } = node.bounds;
    
    if (width === 0 || height === 0) {
      return null;
    }

    // Create a basic SVG placeholder
    // In a real implementation, this would parse Figma vector data
    const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Vector: ${node.name} -->
  <rect width="${width}" height="${height}" fill="currentColor" />
</svg>`;

    return svg;
  }

  private detectImageFormat(buffer: Buffer): 'png' | 'jpg' | 'svg' {
    // Check magic numbers to detect format
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return 'png';
    }
    
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'jpg';
    }
    
    // Default to PNG
    return 'png';
  }
}

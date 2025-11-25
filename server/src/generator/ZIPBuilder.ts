import archiver from 'archiver';
import { Readable } from 'stream';
import type { Asset } from '../types/internal.js';
import { logger } from '../utils/logger.js';

export interface ZIPContents {
  html: string;
  css: string;
  assets: Asset[];
  readme?: string;
}

export class ZIPBuilder {
  async createZIP(contents: ZIPContents): Promise<Buffer> {
    logger.info('Creating ZIP file');

    return new Promise((resolve, reject) => {
      const archive = archiver('zip', {
        zlib: { level: 9 }, // Maximum compression
      });

      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on('end', () => {
        const buffer = Buffer.concat(chunks);
        logger.info(`ZIP file created: ${buffer.length} bytes`);
        resolve(buffer);
      });

      archive.on('error', (err) => {
        logger.error('Error creating ZIP file', { error: err });
        reject(err);
      });

      // Add HTML file
      archive.append(contents.html, { name: 'index.html' });

      // Add CSS file
      archive.append(contents.css, { name: 'styles.css' });

      // Add README if provided
      if (contents.readme) {
        archive.append(contents.readme, { name: 'README.md' });
      }

      // Add assets
      if (contents.assets.length > 0) {
        for (const asset of contents.assets) {
          if (asset.url) {
            // For downloaded images, we would need the actual buffer
            // This is a placeholder - in real implementation, pass the buffer
            logger.warn(`Asset ${asset.id} needs to be downloaded separately`);
          } else {
            // For SVG or other generated assets
            logger.debug(`Adding asset: ${asset.localPath}`);
          }
        }
      }

      // Finalize the archive
      archive.finalize();
    });
  }

  async writeZIPToFile(zip: Buffer, outputPath: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(outputPath, zip);
    logger.info(`ZIP file written to: ${outputPath}`);
  }

  generateReadme(warnings: string[], errors: string[]): string {
    let readme = `# Figma to HTML Conversion

This package contains the converted HTML and CSS from your Figma design.

## Files

- \`index.html\` - The main HTML file
- \`styles.css\` - All styles for the design
- \`assets/\` - Images and other assets (if any)

## Usage

Simply open \`index.html\` in your web browser to view the converted design.

## Known Limitations

- Custom fonts may not render identically without font files
- Some Figma blend modes may not have CSS equivalents
- Complex vector operations may require SVG approximations
- Figma plugins and dynamic content cannot be converted
- Responsive behavior is not automatically generated
- Interactions and animations are not supported

`;

    if (warnings.length > 0) {
      readme += `## Conversion Warnings\n\n`;
      readme += `The following warnings were encountered during conversion:\n\n`;
      warnings.forEach((warning, index) => {
        readme += `${index + 1}. ${warning}\n`;
      });
      readme += '\n';
    }

    if (errors.length > 0) {
      readme += `## Conversion Errors\n\n`;
      readme += `The following errors were encountered during conversion:\n\n`;
      errors.forEach((error, index) => {
        readme += `${index + 1}. ${error}\n`;
      });
      readme += '\n';
    }

    readme += `## Support

For issues or questions, please refer to the Figma to HTML Converter documentation.

Generated on: ${new Date().toISOString()}
`;

    return readme;
  }
}

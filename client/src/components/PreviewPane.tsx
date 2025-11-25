import { useState } from 'react';
import './PreviewPane.css';

interface PreviewPaneProps {
  html: string;
}

function PreviewPane({ html }: PreviewPaneProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="preview-pane">
      <div className="preview-header">
        <h3>Preview</h3>
        <button onClick={() => setShowPreview(!showPreview)} className="toggle-button">
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>
      </div>

      {showPreview && (
        <div className="preview-container">
          <iframe
            srcDoc={html}
            title="Preview"
            sandbox="allow-same-origin"
            className="preview-iframe"
          />
        </div>
      )}
    </div>
  );
}

export default PreviewPane;

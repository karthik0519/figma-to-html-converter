import { useState, FormEvent } from 'react';
import './ConverterForm.css';

interface ConverterFormProps {
  onConvert: (figmaUrl: string, apiKey: string) => void;
  isConverting: boolean;
}

function ConverterForm({ onConvert, isConverting }: ConverterFormProps) {
  const [figmaUrl, setFigmaUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [errors, setErrors] = useState<{ figmaUrl?: string; apiKey?: string }>({});

  // Load API key from session storage
  useState(() => {
    const savedApiKey = sessionStorage.getItem('figma-api-key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  });

  const validate = (): boolean => {
    const newErrors: { figmaUrl?: string; apiKey?: string } = {};

    if (!figmaUrl.trim()) {
      newErrors.figmaUrl = 'Figma URL or file ID is required';
    }

    if (!apiKey.trim()) {
      newErrors.apiKey = 'API key is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Save API key to session storage
    sessionStorage.setItem('figma-api-key', apiKey);

    onConvert(figmaUrl, apiKey);
  };

  return (
    <form className="converter-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="figmaUrl">
          Figma File URL or ID
          <span className="required">*</span>
        </label>
        <input
          type="text"
          id="figmaUrl"
          value={figmaUrl}
          onChange={(e) => setFigmaUrl(e.target.value)}
          placeholder="https://www.figma.com/file/..."
          disabled={isConverting}
          className={errors.figmaUrl ? 'error' : ''}
        />
        {errors.figmaUrl && <span className="error-message">{errors.figmaUrl}</span>}
        <small>Paste the full Figma file URL or just the file ID</small>
      </div>

      <div className="form-group">
        <label htmlFor="apiKey">
          Figma API Key
          <span className="required">*</span>
        </label>
        <input
          type="password"
          id="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="figd_..."
          disabled={isConverting}
          className={errors.apiKey ? 'error' : ''}
        />
        {errors.apiKey && <span className="error-message">{errors.apiKey}</span>}
        <small>
          Your API key is stored in your browser session only.{' '}
          <a href="https://www.figma.com/developers/api#access-tokens" target="_blank" rel="noopener noreferrer">
            Get an API key
          </a>
        </small>
      </div>

      <button type="submit" disabled={isConverting} className="convert-button">
        {isConverting ? (
          <>
            <span className="spinner"></span>
            Converting...
          </>
        ) : (
          'Convert to HTML/CSS'
        )}
      </button>
    </form>
  );
}

export default ConverterForm;

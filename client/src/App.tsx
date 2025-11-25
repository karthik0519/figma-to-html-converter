import { useState } from 'react';
import ConverterForm from './components/ConverterForm';
import DownloadButton from './components/DownloadButton';
import './App.css';

interface ConversionResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
  warnings?: string[];
}

function App() {
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleConvert = async (figmaUrl: string, apiKey: string) => {
    setIsConverting(true);
    setResult(null);

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ figmaUrl, apiKey }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to connect to the server. Please try again.',
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Figma to HTML Converter</h1>
        <p>Convert your Figma designs to pixel-perfect HTML and CSS</p>
      </header>

      <main className="app-main">
        <ConverterForm onConvert={handleConvert} isConverting={isConverting} />

        {result && (
          <div className="results">
            {result.success ? (
              <>
                <div className="success-message">
                  <h2>✓ Conversion Successful!</h2>
                  {result.warnings && result.warnings.length > 0 && (
                    <details className="warnings">
                      <summary>
                        {result.warnings.length} warning{result.warnings.length > 1 ? 's' : ''}
                      </summary>
                      <ul>
                        {result.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>

                {result.downloadUrl && <DownloadButton downloadUrl={result.downloadUrl} />}
              </>
            ) : (
              <div className="error-message">
                <h2>✗ Conversion Failed</h2>
                <p>{result.error}</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Need a Figma API key?{' '}
          <a href="https://www.figma.com/developers/api#access-tokens" target="_blank" rel="noopener noreferrer">
            Get one here
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;

import './DownloadButton.css';

interface DownloadButtonProps {
  downloadUrl: string;
}

function DownloadButton({ downloadUrl }: DownloadButtonProps) {
  const handleDownload = () => {
    window.location.href = downloadUrl;
  };

  return (
    <div className="download-section">
      <button onClick={handleDownload} className="download-button">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10 13L6 9H8V3H12V9H14L10 13Z"
            fill="currentColor"
          />
          <path
            d="M17 15V17H3V15H1V17C1 18.1 1.9 19 3 19H17C18.1 19 19 18.1 19 17V15H17Z"
            fill="currentColor"
          />
        </svg>
        Download ZIP
      </button>
      <p className="download-info">
        The ZIP file contains HTML, CSS, and all assets. Open index.html in your browser to view the result.
      </p>
    </div>
  );
}

export default DownloadButton;

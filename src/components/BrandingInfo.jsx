export default function BrandingInfo() {
  return (
    <div className="branding-info">
      <div className="branding-tagline">"We are not a gaming company"</div>

      <div className="branding-oss">
        <div className="branding-oss-heading">Apra Fleet is Open Source</div>
        <a
          href="https://github.com/ApraPipes/apra-fleet"
          target="_blank"
          rel="noopener noreferrer"
          className="branding-star-link"
        >
          ★ Star the repo
        </a>
      </div>
    </div>
  );
}

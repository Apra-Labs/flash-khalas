export default function AboutOverlay({ onClose }) {
  return (
    <div className="about-backdrop" onClick={onClose}>
      <div className="about-card" onClick={e => e.stopPropagation()}>
        <button className="about-close" onClick={onClose}>✕</button>
        <img src="/apra_logo.jpg" alt="Apra Labs" className="about-logo" />
        <div className="about-name">Kashyap Jois</div>
        <a
          href="https://www.linkedin.com/in/kashyapjois/"
          target="_blank"
          rel="noopener noreferrer"
          className="about-linkedin"
        >
          linkedin.com/in/kashyapjois
        </a>
      </div>
    </div>
  );
}

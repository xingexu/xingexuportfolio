const awards = [
  "CCC Senior 2025 - 60/75",
  "AIME Qualifier - 2024 and 2025",
  "FBLA CNLC 2024 Coding & Programming - 3rd Place",
  "FBLC CNLC 2025 Coding & Programming - 1st Place",
  "Hypatia School Champion - 2025",
];

const certifications = [
  {
    name: "Architecting Solutions on AWS",
    issuer: "Amazon Web Services (AWS)",
    issued: "Issued Aug 2026",
    url: "https://www.coursera.org/account/accomplishments/verify/U1490OVCDU7D",
  },
  {
    name: "Building Data Lakes on AWS",
    issuer: "Amazon Web Services (AWS)",
    issued: "Issued Aug 2026",
    url: "https://www.coursera.org/account/accomplishments/verify/OLOCM50Z9KUR",
  },
  {
    name: "Agents and Workflows",
    issuer: "OpenAI",
    issued: "Issued Aug 2026",
    url: "https://academy.openai.com/public/certificate/x9rjcqhrlo",
  },
  {
    name: "Claude on Google Cloud",
    issuer: "Anthropic",
    issued: "Issued Aug 2026",
    url: "https://verify.skilljar.com/c/g8en33vt5akq",
  },
];

const skills = [
  ["languages", "Java, Python, JavaScript, TypeScript, HTML/CSS"],
  ["frameworks", "Next.js, React, Tailwind CSS, Node.js"],
  ["focus", "Full-stack apps, backend systems, product-minded engineering"],
  ["spoken", "English, Chinese"],
];

export default function Resume() {
  return (
    <div className="resume-page">
      <article className="resume-shell px-panel" aria-label="Resume">
        <div className="resume-grid">
          <section className="resume-section">
            <SectionTitle eyebrow="education" />
            <div className="resume-item">
              <div className="resume-row">
                <h2>bayview secondary school</h2>
                <span>2022 - 2026</span>
              </div>
              <p>OSSD + Ontario Scholar + International Baccalaureate Diploma</p>
              <ul className="resume-list">
                <li>AP Calculus BC: 5 · AP Computer Science A: 5</li>
                <li>Incoming Western University Computer Science + Ivey AEO.</li>
              </ul>
            </div>
          </section>

          <section className="resume-section">
            <SectionTitle eyebrow="experience" />
            <div className="resume-stack">
              <ExperienceItem
                title="bayview FBLA president"
                date="2025 - 2026"
              />
            </div>
          </section>

          <section className="resume-section">
            <SectionTitle eyebrow="awards" />
            <div className="resume-item">
              <ul className="award-list">
                {awards.map((award) => (
                  <li key={award}>{award}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="resume-section">
            <SectionTitle eyebrow="certifications" />
            <div className="certification-grid">
              {certifications.map((cert) => (
                <a
                  key={cert.url}
                  href={cert.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="certification-card"
                  aria-label={`${cert.name} certificate, opens in a new tab`}
                >
                  <div>
                    <h3>{cert.name}</h3>
                    <p>{cert.issuer}</p>
                  </div>
                  <span>{cert.issued}</span>
                </a>
              ))}
            </div>
          </section>

          <section className="resume-section">
            <SectionTitle eyebrow="skills" />
            <div className="resume-item">
              <dl className="skill-list">
                {skills.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}

function SectionTitle({ eyebrow }: { eyebrow: string }) {
  return (
    <div className="resume-heading">
      <span>{eyebrow}</span>
    </div>
  );
}

function ExperienceItem({
  title,
  date,
}: {
  title: string;
  date: string;
}) {
  return (
    <article className="resume-item">
      <div className="resume-row">
        <div>
          <h2>{title}</h2>
        </div>
        <span>{date}</span>
      </div>
    </article>
  );
}

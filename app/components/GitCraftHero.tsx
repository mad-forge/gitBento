"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  Box,
  Building2,
  Check,
  ChevronDown,
  Code2,
  Download,
  Grid3x3,
  Image,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Terminal,
} from "lucide-react";

const popularUsers = ["torvalds", "sindresorhus", "gaearon", "addyosmani"];

const contributionLevels = [
  0, 0, 1, 1, 2, 1, 0, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0, 1, 2, 3, 4, 3, 2, 1,
  0, 1, 2, 3, 4, 4, 3, 1, 0, 1, 2, 3, 3, 4, 3, 1, 0, 0, 1, 2, 3, 3, 2, 1,
  0, 0, 1, 2, 3, 2, 1, 0, 0, 0, 1, 1, 2, 1, 0, 0, 0, 0, 0, 1, 1, 0,
];

const themes = [
  { name: "Tokyo Night", className: "tokyo", active: true },
  { name: "Nord", className: "nord" },
  { name: "Catppuccin", className: "catppuccin" },
  { name: "Dracula", className: "dracula" },
  { name: "Synthwave", className: "synthwave" },
];

const recentUsers = ["@torvalds", "@sindresorhus", "@gaearon", "@addyosmani", "@octocat"];

type AuthUser = {
  login: string;
  name: string | null;
  avatarUrl: string;
};

export function GitCraftHero() {
  const [username, setUsername] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((payload: { user: AuthUser | null }) => setAuthUser(payload.user))
      .catch(() => setAuthUser(null));

    const url = new URL(window.location.href);
    const error = url.searchParams.get("auth_error");
    if (error) {
      setAuthError(error);
      url.searchParams.delete("auth_error");
      window.history.replaceState({}, "", url);
    }
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim()) return;
    setSubmitted(true);
    window.setTimeout(() => setSubmitted(false), 1600);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
  }

  return (
    <main className="gitcraft-page">
      <div className="page-noise" />
      <header className="gc-nav">
        <a className="brand" href="#" aria-label="GitCraft home">
          <span className="brand-mark">
            <Box size={21} strokeWidth={3} />
          </span>
          <span>GitCraft</span>
        </a>

        <nav className="nav-links" aria-label="Main navigation">
          <a href="#explore">Explore</a>
          <a href="#gallery">Gallery</a>
          <a href="#themes">Themes</a>
          <a href="#pricing">Pricing</a>
          <a href="#docs">Docs</a>
        </nav>

        <div className="nav-actions">
          <button className="theme-button" type="button" aria-label="Toggle theme">
            <Sun size={17} />
          </button>
          {authUser ? (
            <div className="github-user">
              <img src={authUser.avatarUrl} alt="" />
              <span>@{authUser.login}</span>
              <button type="button" onClick={handleLogout}>Log out</button>
            </div>
          ) : (
            <a className="github-login" href="/api/auth/github">
              <GithubMark size={18} />
              <span>Continue with GitHub</span>
            </a>
          )}
        </div>
      </header>
      {authError ? <button className="auth-notice" type="button" onClick={() => setAuthError("")}>{authError}</button> : null}

      <section className="hero-section">
        <div className="hero-shell site-container">
          <div className="hero-copy">
          <div className="eyebrow">
            <Sparkles size={14} />
            <span>Turn your GitHub into stunning assets</span>
          </div>

          <h1>
            Build <span>Beautiful<br />Developer Assets</span><br />
            From GitHub Profiles
          </h1>

          <p className="hero-description">
            Generate GitCity skylines, Bento cards, Terminal snapshots and more.
            Download as high-quality PNG and share everywhere.
          </p>

          <form className="username-form" onSubmit={handleSubmit}>
            <label>
              <GithubMark size={20} />
              <input
                aria-label="GitHub username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter GitHub username..."
              />
            </label>
            <button type="submit">
              {submitted ? (
                <>
                  Ready <Check size={18} strokeWidth={2.6} />
                </>
              ) : (
                <>
                  Generate <ArrowRight size={18} strokeWidth={2.6} />
                </>
              )}
            </button>
          </form>

          <div className="popular-row">
            <span>Popular</span>
            {popularUsers.map((user) => (
              <button key={user} type="button" onClick={() => setUsername(user)}>
                {user}
              </button>
            ))}
          </div>

          <div className="feature-strip">
            <Feature icon={<Image size={20} />} title="PNG Export" detail="High quality" />
            <Feature icon={<ShieldCheck size={20} />} title="No Signup" detail="100% Free" />
            <Feature icon={<Code2 size={20} />} title="Open Source" detail="Built with love" />
          </div>
          </div>

          <div className="preview-scene" aria-label="GitCraft asset previews">
            <div className="ghost-panel ghost-panel-two" />
            <div className="ghost-panel ghost-panel-one" />
            <div className="preview-panel">
              <PreviewHeader label="GITCITY" />
              <CityCard />

              <PreviewHeader label="BENTO CARD" />
              <ProfileCard />

              <PreviewHeader label="TERMINAL" />
              <TerminalCard />
            </div>
          </div>
        </div>
      </section>

      <div className="landing-content">
        <section className="landing-section creation-section" id="explore">
          <div className="section-container site-container">
          <SectionHeading
            eyebrow="Create your way"
            title="Choose What You Want to Create"
            description="Pick a style, generate and download in PNG."
          />
          <div className="creation-grid">
            <CreationCard title="GitCity" detail="Your contributions, reimagined as a living skyline." icon={<Building2 />} tone="green">
              <MiniCity variant="night" />
              <AssetStats />
            </CreationCard>
            <CreationCard title="Terminal Card" detail="A polished developer snapshot made for READMEs." icon={<Terminal />} tone="blue">
              <MiniTerminal />
            </CreationCard>
            <CreationCard title="Bento Card" detail="Profile, stats, and activity in one clean layout." icon={<Grid3x3 />} tone="purple">
              <MiniBento />
            </CreationCard>
            <CreationCard title="Contribution Art" detail="Turn commit patterns into atmospheric artwork." icon={<Image />} tone="orange">
              <ContributionArt />
            </CreationCard>
          </div>
          </div>
        </section>

        <section className="landing-section" id="themes">
          <div className="section-container site-container">
          <SectionHeading
            eyebrow="Make it yours"
            title="Beautiful Themes"
            description="Choose a theme that matches your vibe."
          />
          <div className="theme-row">
            {themes.map((theme) => (
              <button className={`theme-card ${theme.className} ${theme.active ? "active" : ""}`} key={theme.name} type="button">
                <span className="theme-sky">
                  <i /><i /><i /><i /><i /><i />
                </span>
                <strong>{theme.name}</strong>
                <small>Skyline preset</small>
                {theme.active ? <b><Check size={11} /></b> : null}
              </button>
            ))}
          </div>
          </div>
        </section>

        <section className="landing-section works-section">
          <div className="section-container site-container">
          <SectionHeading
            eyebrow="Simple by design"
            title="How It Works"
            description="Create your developer assets in 3 simple steps."
          />
          <div className="steps-row">
            <StepCard number="1" title="Search Username" detail="Enter any GitHub handle to fetch profile data." icon={<Search />} />
            <span className="step-connector"><ArrowRight size={14} /></span>
            <StepCard number="2" title="Customize" detail="Set styles, colors, and preview your asset." icon={<SlidersHorizontal />} />
            <span className="step-connector"><ArrowRight size={14} /></span>
            <StepCard number="3" title="Export PNG" detail="Download high-quality assets ready to share." icon={<Download />} />
          </div>
          </div>
        </section>

        <section className="landing-section" id="gallery">
          <div className="section-container site-container">
          <div className="section-heading gallery-heading">
            <div>
              <span>Made with GitCraft</span>
              <h2>Recently Generated</h2>
            </div>
            <div className="gallery-actions">
              <p>See what others are creating.</p>
              <a href="#explore">View all <ArrowRight size={15} /></a>
            </div>
          </div>
          <div className="recent-grid">
            {recentUsers.map((user, index) => (
              <article className={`recent-card recent-${index + 1}`} key={user}>
                <div className="recent-art">
                  {index === 1 || index === 3 ? <MiniBento compact /> : <MiniCity variant={index === 2 ? "sunset" : "night"} />}
                </div>
                <div className="recent-meta">
                  <span className="recent-avatar"><GithubMark size={14} /></span>
                  <span><strong>{user}</strong><small>Total Contributions · {(2843 + index * 719).toLocaleString()}</small></span>
                </div>
              </article>
            ))}
          </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="site-container">
            <div className="cta-banner">
              <div>
                <span className="cta-kicker"><Sparkles size={14} /> Your profile deserves better</span>
                <h2>Ready to build your<br /><em>developer identity?</em></h2>
              </div>
              <p>Create polished GitHub assets in seconds. No design tools, no signup, no friction.</p>
              <button type="button">Generate My Assets <ArrowRight size={17} /></button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="section-heading">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <p>{description}</p>
    </div>
  );
}

function CreationCard({ title, detail, icon, tone, children }: { title: string; detail: string; icon: React.ReactNode; tone: string; children: React.ReactNode }) {
  return (
    <article className={`creation-card tone-${tone}`}>
      <div className="creation-card-top">
        <span>{icon}</span>
        <div><h3>{title}</h3><p>{detail}</p></div>
      </div>
      <div className="creation-visual">{children}</div>
      <DownloadButton />
    </article>
  );
}

function AssetStats() {
  return (
    <div className="asset-stats">
      <span><small>Repos</small><strong>457</strong></span>
      <span><small>Followers</small><strong>12.4k</strong></span>
      <span><small>Contributions</small><strong>2,843</strong></span>
    </div>
  );
}

function MiniCity({ variant }: { variant: "night" | "sunset" }) {
  return (
    <div className={`mini-city ${variant}`}>
      <span className="mini-moon" />
      <div className="mini-buildings"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
      <div className="mini-water" />
    </div>
  );
}

function MiniTerminal() {
  return (
    <div className="mini-terminal">
      <span><i /><i /><i /></span>
      <p><b>octocat@github</b> ~ $</p>
      <p className="terminal-command">sudo generating_awesome_assets --style terminal</p>
      <p><em>✓</em> Fetched 2,843 contributions</p>
      <p><em>✓</em> Rendered terminal-card.png</p>
      <p><strong>Asset ready to download.</strong> <i className="terminal-caret" /></p>
    </div>
  );
}

function MiniBento({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`mini-bento ${compact ? "compact" : ""}`}>
      <div className="mini-profile"><span className="mini-avatar"><i /><b /></span><b>octocat<small>Software Engineer</small></b></div>
      <div className="mini-contributions">{contributionLevels.slice(0, 35).map((level, index) => <i key={index} data-level={level} />)}</div>
      <div className="mini-stats"><span>457<small>Repos</small></span><span>12.4k<small>Followers</small></span><span>2,843<small>Contributions</small></span></div>
    </div>
  );
}

function ContributionArt() {
  return (
    <div className="contribution-art">
      <span className="art-sun" />
      <span className="mountain mountain-back" />
      <span className="mountain mountain-front" />
      <div className="art-grid">{contributionLevels.slice(0, 42).map((level, index) => <i key={index} data-level={level} />)}</div>
    </div>
  );
}

function StepCard({ number, title, detail, icon }: { number: string; title: string; detail: string; icon: React.ReactNode }) {
  return (
    <article className="step-card">
      <span className="step-icon">{icon}</span>
      <div><span className="step-label">Step {number}</span><h3>{number}. {title}</h3><p>{detail}</p></div>
    </article>
  );
}

function Feature({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="feature">
      <span className="feature-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </div>
  );
}

function PreviewHeader({ label }: { label: string }) {
  return (
    <div className="preview-label">
      <span>{label}</span>
      <ChevronDown size={12} />
    </div>
  );
}

function DownloadButton() {
  return (
    <button className="card-download" type="button" aria-label="Download preview">
      <Download size={15} />
    </button>
  );
}

function CityCard() {
  return (
    <div className="city-card">
      <div className="city-stars" />
      <div className="city-moon" />
      <div className="city-glow" />
      <div className="city-horizon city-horizon-back" />
      <div className="city-horizon city-horizon-front" />
      <div className="city-water" />
      <DownloadButton />
    </div>
  );
}

function ProfileCard() {
  return (
    <div className="profile-card">
      <div className="profile-info">
        <div className="octocat-avatar">
          <div className="avatar-hair" />
          <div className="avatar-head">
            <span className="avatar-ear avatar-ear-left" />
            <span className="avatar-ear avatar-ear-right" />
            <span className="avatar-eye avatar-eye-left" />
            <span className="avatar-eye avatar-eye-right" />
            <span className="avatar-nose" />
            <span className="avatar-smile" />
          </div>
          <div className="avatar-neck" />
          <div className="avatar-hoodie"><i /><b /></div>
        </div>
        <div className="profile-name">
          <strong>Octocat</strong>
          <span>The Octocat</span>
          <small><i /> Software Engineer</small>
          <small>◎ San Francisco, CA</small>
        </div>
      </div>

      <div className="contribution-area">
        <span>Total Contributions <strong>2,843</strong></span>
        <div className="contribution-grid">
          {contributionLevels.map((level, index) => (
            <i key={index} data-level={level} />
          ))}
        </div>
      </div>

      <div className="stats-row">
        <Stat label="Repos" value="457" />
        <Stat label="Followers" value="12.4k" />
        <Stat label="Following" value="107" />
      </div>
      <DownloadButton />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function TerminalCard() {
  return (
    <div className="terminal-card">
      <p><strong>octocat@github</strong> <b>~ $</b></p>
      <p><i>›</i> Building awesome things</p>
      <p><i>›</i> Solving problems</p>
      <p><i>›</i> Drinking coffee ☕</p>
      <p><i>›</i> Committing daily</p>
      <p><i>›</i> <span className="terminal-caret" /></p>
      <DownloadButton />
    </div>
  );
}

function GithubMark({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 .8a11.4 11.4 0 0 0-3.6 22.2c.6.1.8-.2.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.7-1.3-1.7-1.1-.8.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1.1 1.9 2.8 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.2 11.2 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.2c0 .4.2.7.8.6A11.4 11.4 0 0 0 12 .8Z" />
    </svg>
  );
}

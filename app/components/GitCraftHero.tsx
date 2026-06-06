"use client";

import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Box,
  Check,
  ChevronDown,
  Code2,
  Download,
  Image,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";

const popularUsers = ["torvalds", "sindresorhus", "gaearon", "addyosmani"];

const contributionLevels = [
  0, 0, 1, 1, 2, 1, 0, 0, 0, 1, 2, 3, 3, 2, 1, 0, 0, 1, 2, 3, 4, 3, 2, 1,
  0, 1, 2, 3, 4, 4, 3, 1, 0, 1, 2, 3, 3, 4, 3, 1, 0, 0, 1, 2, 3, 3, 2, 1,
  0, 0, 1, 2, 3, 2, 1, 0, 0, 0, 1, 1, 2, 1, 0, 0, 0, 0, 0, 1, 1, 0,
];

export function GitCraftHero() {
  const [username, setUsername] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim()) return;
    setSubmitted(true);
    window.setTimeout(() => setSubmitted(false), 1600);
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
          <button className="github-login" type="button">
            <GithubMark size={18} />
            <span>Login with GitHub</span>
          </button>
        </div>
      </header>

      <section className="hero-shell">
        <div className="hero-copy">
          <div className="eyebrow">
            <Sparkles size={14} />
            <span>Turn your GitHub into stunning assets</span>
          </div>

          <h1>
            Build Beautiful<br /><span>Developer Assets</span><br />
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
      </section>
    </main>
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

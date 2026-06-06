"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, GitBranch, Grid3x3, Sparkles } from "lucide-react";
import type { GitHubSession } from "../lib/github-auth";

const steps = [
  { label: "Fetching repositories", detail: "Reading public projects and language signals", icon: GitBranch },
  { label: "Analyzing contributions", detail: "Mapping commit patterns across the last year", icon: Grid3x3 },
  { label: "Generating skyline", detail: "Turning activity into a glowing GitCity", icon: Building2 },
  { label: "Building developer profile", detail: "Polishing your personalized dashboard", icon: Sparkles },
];

const STEP_DURATION = 1650;

export function GitHubLoadingExperience({ user }: { user: GitHubSession }) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(4);

  useEffect(() => {
    const startedAt = Date.now();
    const totalDuration = steps.length * STEP_DURATION;

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setActiveStep(Math.min(Math.floor(elapsed / STEP_DURATION), steps.length - 1));
      setProgress(Math.min(100, Math.max(4, Math.round((elapsed / totalDuration) * 100))));

      if (elapsed >= totalDuration) {
        window.clearInterval(timer);
        router.replace(`/dashboard?username=${encodeURIComponent(user.login)}`);
      }
    }, 80);

    return () => window.clearInterval(timer);
  }, [router, user.login]);

  return (
    <main className="auth-loading-page">
      <div className="loading-ambient loading-ambient-one" />
      <div className="loading-ambient loading-ambient-two" />
      <section className="loading-experience">
        <div className="loading-profile">
          <img src={user.avatarUrl} alt="" />
          <span><small>Preparing GitCraft for</small><strong>@{user.login}</strong></span>
          <i><Sparkles size={13} /></i>
        </div>

        <div className="loading-heading">
          <span>GitHub connected successfully</span>
          <h1>Crafting your developer identity</h1>
          <p>We are translating your GitHub activity into a premium visual profile.</p>
        </div>

        <div className="loading-progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="loading-progress-meta">
          <span>Processing profile data</span>
          <strong>{progress}%</strong>
        </div>

        <div className="loading-steps">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isComplete = index < activeStep || progress === 100;
            const isActive = index === activeStep && progress < 100;

            return (
              <article className={`loading-step ${isActive ? "active" : ""} ${isComplete ? "complete" : ""}`} key={step.label}>
                <span className="loading-step-icon">{isComplete ? <Check size={17} /> : <Icon size={17} />}</span>
                <span><strong>{step.label}{isActive ? "..." : ""}</strong><small>{step.detail}</small></span>
                {isActive ? <i className="loading-pulse" /> : null}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

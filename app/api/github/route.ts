import { NextResponse } from "next/server";

type GitHubUser = {
  avatar_url: string;
  name: string | null;
  login: string;
  bio: string | null;
  followers: number;
  following: number;
  public_repos: number;
  public_gists: number;
  created_at: string;
  location: string | null;
  company: string | null;
};

type GitHubRepo = {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  pushed_at: string | null;
  fork: boolean;
};

type GitHubOrg = {
  login: string;
  avatar_url: string;
};

type GitHubEvent = {
  id: string;
  type: string;
  created_at: string;
  repo: {
    name: string;
  };
};

type ContributionDay = {
  date: string;
  contributionCount: number;
  color: string;
  weekday: number;
};

type ContributionWeek = {
  firstDay: string;
  contributionDays: ContributionDay[];
};

type ContributionCalendar = {
  totalContributions: number;
  weeks: ContributionWeek[];
  months: {
    name: string;
    firstDay: string;
    totalWeeks: number;
  }[];
};

type RPGStats = {
  consistency: number;
  impact: number;
  diversity: number;
  nightOwl: number;
  loneWolf: number;
};

type ContributionsResponse = {
  data?: {
    user?: {
      contributionsCollection: {
        contributionCalendar: ContributionCalendar;
      };
    };
  };
  errors?: unknown[];
};

const githubHeaders: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

if (process.env.GITHUB_TOKEN) {
  githubHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

async function fetchGitHub<T>(url: string) {
  const response = await fetch(url, {
    headers: githubHeaders,
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      data: null,
    };
  }

  return {
    ok: true as const,
    status: response.status,
    data: (await response.json()) as T,
  };
}

async function fetchAllRepos(username: string) {
  const repos: GitHubRepo[] = [];

  for (let page = 1; page <= 10; page += 1) {
    const result = await fetchGitHub<GitHubRepo[]>(
      `https://api.github.com/users/${username}/repos?per_page=100&page=${page}&sort=updated`,
    );

    if (!result.ok) return result;

    repos.push(...result.data);
    if (result.data.length < 100) break;
  }

  return {
    ok: true as const,
    status: 200,
    data: repos,
  };
}

async function fetchContributionCalendar(username: string) {
  if (!process.env.GITHUB_TOKEN) return null;

  const to = new Date();
  const from = new Date(to);
  from.setFullYear(to.getFullYear() - 1);

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        query GitBentoContributions($username: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $username) {
            contributionsCollection(from: $from, to: $to) {
              contributionCalendar {
                totalContributions
                months {
                  name
                  firstDay
                  totalWeeks
                }
                weeks {
                  firstDay
                  contributionDays {
                    date
                    contributionCount
                    color
                    weekday
                  }
                }
              }
            }
          }
        }
      `,
      variables: {
        username,
        from: from.toISOString(),
        to: to.toISOString(),
      },
    }),
    next: { revalidate: 300 },
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as ContributionsResponse;
  if (payload.errors?.length) return null;

  return payload.data?.user?.contributionsCollection.contributionCalendar ?? null;
}

function weekStartFor(dateText: string) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date.toISOString().slice(0, 10);
}

function monthsFromWeeks(weeks: ContributionWeek[]) {
  const monthMap = new Map<string, { name: string; firstDay: string; totalWeeks: number }>();

  for (const week of weeks) {
    const date = new Date(`${week.firstDay}T00:00:00.000Z`);
    const monthKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    const monthName = date.toLocaleString("en", { month: "short", timeZone: "UTC" });
    const existing = monthMap.get(monthKey);

    if (existing) {
      existing.totalWeeks += 1;
    } else {
      monthMap.set(monthKey, {
        name: monthName,
        firstDay: week.firstDay,
        totalWeeks: 1,
      });
    }
  }

  return [...monthMap.values()];
}

function parseContributionCalendarHtml(html: string) {
  const headingText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const totalMatch = headingText.match(/([\d,]+)\s+contributions\s+in\s+the\s+last\s+year/i);
  const totalContributions = totalMatch ? Number(totalMatch[1].replace(/,/g, "")) : null;

  if (totalContributions === null) return null;

  const colorByLevel = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
  const days: ContributionDay[] = [];
  const dayRegex =
    /<td\b(?=[^>]*ContributionCalendar-day)([^>]*)><\/td>\s*(?:<tool-tip[^>]*>([\s\S]*?)<\/tool-tip>)?/gi;

  for (const match of html.matchAll(dayRegex)) {
    const attrs = match[1];
    const tooltip = match[2]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";
    const date = attrs.match(/data-date="([^"]+)"/)?.[1];
    const level = Number(attrs.match(/data-level="(\d+)"/)?.[1] ?? 0);
    const contributionCount = Number(tooltip.match(/(\d+)\s+contribution/i)?.[1] ?? 0);

    if (!date) continue;

    days.push({
      date,
      contributionCount,
      color: colorByLevel[Math.max(0, Math.min(level, colorByLevel.length - 1))],
      weekday: new Date(`${date}T00:00:00.000Z`).getUTCDay(),
    });
  }

  const weekMap = new Map<string, ContributionDay[]>();
  for (const day of days.sort((a, b) => a.date.localeCompare(b.date))) {
    const firstDay = weekStartFor(day.date);
    const week = weekMap.get(firstDay) ?? [];
    week.push(day);
    weekMap.set(firstDay, week);
  }

  const weeks = [...weekMap.entries()]
    .map(([firstDay, contributionDays]) => ({
      firstDay,
      contributionDays: contributionDays.sort((a, b) => a.weekday - b.weekday),
    }))
    .sort((a, b) => a.firstDay.localeCompare(b.firstDay));

  return {
    totalContributions,
    months: monthsFromWeeks(weeks),
    weeks,
  };
}

async function fetchDisplayedContributionCalendar(username: string) {
  const urls = [
    `https://github.com/users/${username}/contributions`,
    `https://github.com/${username}?tab=contributions`,
  ];

  for (const url of urls) {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html",
        "User-Agent": "GitBento",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) continue;

    const calendar = parseContributionCalendarHtml(await response.text());
    if (calendar) return calendar;
  }

  return null;
}

function buildCalendarFromSignals(events: GitHubEvent[], repos: GitHubRepo[]) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 364);
  start.setHours(0, 0, 0, 0);

  const counts = new Map<string, number>();
  const signalDates = [
    ...events.map((event) => event.created_at),
    ...repos.flatMap((repo) => [repo.updated_at, repo.pushed_at].filter(Boolean) as string[]),
  ];

  for (const signalDate of signalDates) {
    const date = new Date(signalDate);
    if (date < start) continue;

    const key = date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const weeks: ContributionWeek[] = [];
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() - cursor.getDay());

  while (cursor <= today) {
    const firstDay = cursor.toISOString().slice(0, 10);
    const contributionDays: ContributionDay[] = [];

    for (let weekday = 0; weekday < 7; weekday += 1) {
      const day = new Date(cursor);
      day.setDate(cursor.getDate() + weekday);
      const date = day.toISOString().slice(0, 10);
      const contributionCount = counts.get(date) ?? 0;
      const color =
        contributionCount >= 8
          ? "#39d353"
          : contributionCount >= 5
            ? "#26a641"
            : contributionCount >= 2
              ? "#006d32"
              : contributionCount >= 1
                ? "#0e4429"
                : "#161b22";

      contributionDays.push({
        date,
        contributionCount,
        color,
        weekday,
      });
    }

    weeks.push({ firstDay, contributionDays });
    cursor.setDate(cursor.getDate() + 7);
  }

  const monthMap = new Map<string, { name: string; firstDay: string; totalWeeks: number }>();
  for (const week of weeks) {
    const date = new Date(week.firstDay);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const monthName = date.toLocaleString("en", { month: "short" });
    const existing = monthMap.get(monthKey);

    if (existing) {
      existing.totalWeeks += 1;
    } else {
      monthMap.set(monthKey, {
        name: monthName,
        firstDay: week.firstDay,
        totalWeeks: 1,
      });
    }
  }

  return {
    totalContributions: [...counts.values()].reduce((sum, count) => sum + count, 0),
    months: [...monthMap.values()],
    weeks,
  };
}

function calculateLongestStreak(calendar: ContributionCalendar) {
  const days = calendar.weeks
    .flatMap((week) => week.contributionDays)
    .sort((a, b) => a.date.localeCompare(b.date));

  let longest = 0;
  let current = 0;

  for (const day of days) {
    if (day.contributionCount > 0) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

function calculateRpgStats(params: {
  calendar: ContributionCalendar;
  repos: GitHubRepo[];
  topLanguages: { name: string; count: number }[];
  totalStars: number;
  totalForks: number;
  recentActivity: GitHubEvent[];
}) {
  const { calendar, repos, topLanguages, totalStars, totalForks, recentActivity } = params;
  const longestStreak = calculateLongestStreak(calendar);
  const sourceTimestamps = [
    ...recentActivity.map((event) => event.created_at),
    ...repos.flatMap((repo) => [repo.pushed_at, repo.updated_at].filter(Boolean) as string[]),
  ];
  const nightSignals = sourceTimestamps.filter((timestamp) => {
    const hour = new Date(timestamp).getUTCHours();
    return hour >= 20 || hour <= 4;
  }).length;
  const totalSignals = Math.max(sourceTimestamps.length, 1);
  const originalRepos = repos.filter((repo) => !repo.fork).length;
  const impactBase = totalStars + totalForks * 0.35 + calendar.totalContributions * 0.08;

  const consistency = Math.min(100, longestStreak * 4);
  const impact = Math.min(100, impactBase / 12);
  const diversity = Math.min(100, topLanguages.length * 22 + new Set(repos.map((repo) => repo.language).filter(Boolean)).size * 6);
  const nightOwl = Math.min(100, (nightSignals / totalSignals) * 100);
  const loneWolf = repos.length
    ? Math.min(100, (originalRepos / repos.length) * 100)
    : 0;

  return {
    longestStreak,
    originalRepos,
    nightSignals,
    totalSignals,
    stats: {
      consistency: Math.round(consistency),
      impact: Math.round(impact),
      diversity: Math.round(diversity),
      nightOwl: Math.round(nightOwl),
      loneWolf: Math.round(loneWolf),
    } satisfies RPGStats,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim();

  if (!username) {
    return NextResponse.json(
      { error: "GitHub username is required." },
      { status: 400 },
    );
  }

  const [
    userResult,
    reposResult,
    orgsResult,
    eventsResult,
    graphQLCalendar,
    displayedContributionCalendar,
  ] = await Promise.all([
    fetchGitHub<GitHubUser>(`https://api.github.com/users/${username}`),
    fetchAllRepos(username),
    fetchGitHub<GitHubOrg[]>(`https://api.github.com/users/${username}/orgs?per_page=12`),
    fetchGitHub<GitHubEvent[]>(`https://api.github.com/users/${username}/events/public?per_page=100`),
    fetchContributionCalendar(username),
    fetchDisplayedContributionCalendar(username),
  ]);

  if (!userResult.ok) {
    const message =
      userResult.status === 404 ? "User not found." : "Unable to fetch GitHub user.";

    return NextResponse.json({ error: message }, { status: userResult.status });
  }

  if (!reposResult.ok) {
    return NextResponse.json(
      { error: "Unable to fetch GitHub repositories." },
      { status: reposResult.status },
    );
  }

  const repos = reposResult.data;
  const events = eventsResult.ok ? eventsResult.data : [];
  const contributionCalendar =
    graphQLCalendar ?? displayedContributionCalendar ?? buildCalendarFromSignals(events, repos);
  const languageCounts = repos.reduce<Record<string, number>>((acc, repo) => {
    if (!repo.language) return acc;
    acc[repo.language] = (acc[repo.language] ?? 0) + 1;
    return acc;
  }, {});

  const topLanguages = Object.entries(languageCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const totalForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0);
  const recentlyUpdated = [...repos]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)
    .map((repo) => ({
      name: repo.name,
      updatedAt: repo.updated_at,
      language: repo.language,
    }));
  const topRepositories = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 4)
    .map((repo) => ({
      name: repo.name,
      url: repo.html_url,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
    }));
  const rpg = calculateRpgStats({
    calendar: contributionCalendar,
    repos,
    topLanguages,
    totalStars,
    totalForks,
    recentActivity: events,
  });

  return NextResponse.json({
    profile: {
      avatar: userResult.data.avatar_url,
      name: userResult.data.name ?? userResult.data.login,
      username: userResult.data.login,
      bio: userResult.data.bio,
      followers: userResult.data.followers,
      following: userResult.data.following,
      publicGists: userResult.data.public_gists,
      createdAt: userResult.data.created_at,
      location: userResult.data.location,
      company: userResult.data.company,
    },
    totals: {
      publicRepos: userResult.data.public_repos,
      stars: totalStars,
      forks: totalForks,
    },
    topLanguages,
    topRepositories,
    contributionCalendar,
    organizations: orgsResult.ok
      ? orgsResult.data.map((org) => ({
          login: org.login,
          avatar: org.avatar_url,
        }))
      : [],
    recentActivity: events.slice(0, 6).map((event) => ({
      id: event.id,
      type: event.type,
      repo: event.repo.name,
      createdAt: event.created_at,
    })),
    recentlyUpdated,
    rpg: {
      stats: rpg.stats,
      longestStreak: rpg.longestStreak,
      originalRepos: rpg.originalRepos,
      nightSignals: rpg.nightSignals,
      totalSignals: rpg.totalSignals,
    },
  });
}

export type GitBentoData = {
  profile: {
    avatar: string;
    name: string;
    username: string;
    bio: string | null;
    followers: number;
    following: number;
    publicGists: number;
    createdAt: string;
    location: string | null;
    company: string | null;
  };
  totals: {
    publicRepos: number;
    stars: number;
    forks: number;
  };
  topLanguages: {
    name: string;
    count: number;
  }[];
  topRepositories: {
    name: string;
    url: string;
    description: string | null;
    language: string | null;
    stars: number;
    forks: number;
  }[];
  organizations: {
    login: string;
    avatar: string;
  }[];
  recentActivity: {
    id: string;
    type: string;
    repo: string;
    createdAt: string;
  }[];
  recentlyUpdated: {
    name: string;
    updatedAt: string;
    language: string | null;
  }[];
  contributionCalendar: {
    totalContributions: number;
    months: {
      name: string;
      firstDay: string;
      totalWeeks: number;
    }[];
    weeks: {
      firstDay: string;
      contributionDays: {
        date: string;
        contributionCount: number;
        color: string;
        weekday: number;
      }[];
    }[];
  } | null;
  rpg: {
    stats: {
      consistency: number;
      impact: number;
      diversity: number;
      nightOwl: number;
      loneWolf: number;
    };
    longestStreak: number;
    originalRepos: number;
    nightSignals: number;
    totalSignals: number;
  };
};

"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Activity,
  BookOpen,
  Building2,
  CalendarDays,
  Download,
  GitFork,
  GripVertical,
  MapPin,
  RadioTower,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { RPGRadarChart } from "./RPGRadarChart";
import type { GitBentoData } from "./types";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type Template = "level1" | "level2" | "level3" | "level4";
type CardId =
  | "profile"
  | "stats"
  | "languages"
  | "repos"
  | "contributions"
  | "activity"
  | "network"
  | "identity"
  | "rpg";

const cards: CardId[] = [
  "profile",
  "stats",
  "languages",
  "contributions",
  "repos",
  "activity",
  "network",
  "identity",
  "rpg",
];

const templates: Record<Template, { label: string; className: string }> = {
  level1: {
    label: "L1 Glass",
    className:
      "from-[#08111f] via-[#07101b] to-[#03050a] [--card:rgba(13,20,32,0.82)] [--line:rgba(255,255,255,0.14)] [--accent:#67e8f9] [--accent2:#a7f3d0] [--glow:rgba(103,232,249,0.2)] [--grid:rgba(125,211,252,0.08)]",
  },
  level2: {
    label: "L2 Cyber",
    className:
      "from-[#180521] via-[#08172d] to-[#03050a] [--card:rgba(24,22,40,0.84)] [--line:rgba(255,79,216,0.34)] [--accent:#ff4fd8] [--accent2:#22d3ee] [--glow:rgba(255,79,216,0.28)] [--grid:rgba(255,79,216,0.11)]",
  },
  level3: {
    label: "L3 Matrix",
    className:
      "from-[#03180f] via-[#06131a] to-[#020403] [--card:rgba(6,22,18,0.86)] [--line:rgba(57,211,83,0.3)] [--accent:#39d353] [--accent2:#7ee787] [--glow:rgba(57,211,83,0.24)] [--grid:rgba(57,211,83,0.1)]",
  },
  level4: {
    label: "L4 Aurora",
    className:
      "from-[#071327] via-[#101226] to-[#051017] [--card:rgba(14,21,38,0.82)] [--line:rgba(167,139,250,0.32)] [--accent:#a78bfa] [--accent2:#5eead4] [--glow:rgba(94,234,212,0.22)] [--grid:rgba(167,139,250,0.1)]",
  },
};

const spanClasses: Record<CardId, string> = {
  profile: "md:col-span-3 md:row-span-2",
  stats: "md:col-span-1 md:row-span-2",
  languages: "md:col-span-2 md:row-span-2",
  contributions: "md:col-span-6 md:row-span-2",
  repos: "md:col-span-2 md:row-span-2",
  activity: "md:col-span-2 md:row-span-2",
  network: "md:col-span-2 md:row-span-2",
  identity: "md:col-span-2 md:row-span-2",
  rpg: "md:col-span-2 md:row-span-2",
};

export function BentoGrid({ data }: { data: GitBentoData }) {
  const [template, setTemplate] = useState<Template>("level3");
  const [order, setOrder] = useState<CardId[]>(cards);
  const gridRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrder((items) => {
      const oldIndex = items.indexOf(active.id as CardId);
      const newIndex = items.indexOf(over.id as CardId);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  async function downloadGrid() {
    if (!gridRef.current) return;

    const dataUrl = await toPng(gridRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#03050a",
    });

    const link = document.createElement("a");
    link.download = `${data.profile.username}-gitbento.png`;
    link.href = dataUrl;
    link.click();
  }

  return (
    <section className="pb-12">
      <div className="mb-4 flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/[0.06] p-3 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-2 gap-1 rounded-[18px] border border-white/10 bg-black/30 p-1 sm:grid-cols-4">
          {(Object.keys(templates) as Template[]).map((item) => (
            <Button
              key={item}
              type="button"
              variant={template === item ? "default" : "ghost"}
              size="sm"
              onClick={() => setTemplate(item)}
              className={`rounded-[14px] ${
                template === item
                  ? "shadow-[0_0_26px_var(--glow)]"
                  : "text-white/62 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {templates[item].label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="glass"
          onClick={downloadGrid}
          className="rounded-[18px]"
        >
          <Download className="size-4" />
          Download as PNG
        </Button>
      </div>

      <div
        ref={gridRef}
        className={`relative overflow-hidden rounded-[30px] bg-gradient-to-br p-4 shadow-[0_45px_140px_rgba(0,0,0,0.52)] ${templates[template].className}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--grid)_1px,transparent_1px),linear-gradient(90deg,var(--grid)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_5%,var(--glow),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(255,255,255,0.12),transparent_22%),linear-gradient(180deg,transparent,rgba(0,0,0,0.28))]" />

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className="relative grid grid-cols-1 gap-4 md:grid-cols-6 md:auto-rows-[140px] md:grid-flow-dense">
              {order.map((id) => (
                <SortableCard key={id} id={id}>
                  {renderCard(id, data)}
                </SortableCard>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="pointer-events-none mt-4 text-right text-xs font-semibold text-white/36">
          Made with GitBento
        </div>
      </div>
    </section>
  );
}

function SortableCard({ id, children }: { id: CardId; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group/card relative min-h-[280px] rounded-[28px] md:min-h-0 ${spanClasses[id]} ${
        isDragging ? "z-20 scale-[1.02]" : ""
      }`}
    >
      <div className="relative h-full overflow-hidden rounded-[28px] p-px transition duration-500 [transform-style:preserve-3d] group-hover/card:[transform:perspective(1000px)_rotateX(2deg)_rotateY(-3deg)_translateY(-6px)]">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--accent),rgba(255,255,255,0.14),var(--accent2))] opacity-45 transition duration-500 group-hover/card:opacity-75" />
        <div className="relative h-full overflow-hidden rounded-[27px] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.38),0_0_70px_var(--glow)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 opacity-[0.17] [background-image:radial-gradient(rgba(255,255,255,0.85)_1px,transparent_1px)] [background-size:8px_8px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.15),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_44%)]" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label="Drag card"
                className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/35 p-2 text-white/45 backdrop-blur transition hover:text-white"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Drag to rearrange</TooltipContent>
          </Tooltip>
          <div className="relative z-[1] h-full">{children}</div>
        </div>
      </div>
    </article>
  );
}

function renderCard(id: CardId, data: GitBentoData) {
  switch (id) {
    case "profile":
      return <ProfileCard data={data} />;
    case "stats":
      return <StatsCard data={data} />;
    case "languages":
      return <LanguagesCard data={data} />;
    case "repos":
      return <ReposCard data={data} />;
    case "contributions":
      return <ContributionCard data={data} />;
    case "activity":
      return <ActivityCard data={data} />;
    case "network":
      return <NetworkCard data={data} />;
    case "identity":
      return <IdentityCard data={data} />;
    case "rpg":
      return <RpgCard data={data} />;
  }
}

function ProfileCard({ data }: { data: GitBentoData }) {
  return (
    <div className="flex h-full flex-col justify-between gap-5 pr-10">
      <div className="flex items-start justify-between gap-4">
        <div className="relative w-fit">
          <div className="absolute -inset-3 rounded-[28px] bg-[var(--accent)] opacity-30 blur-2xl" />
          <img
            src={data.profile.avatar}
            alt={`${data.profile.username} avatar`}
            className="relative size-28 rounded-[24px] border border-white/20 shadow-[0_0_46px_rgba(255,255,255,0.16)]"
          />
        </div>
        <div className="rounded-full border border-[var(--line)] bg-black/25 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
          GitHub Bento ID
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--accent)]">@{data.profile.username}</p>
        <h2 className="mt-2 text-5xl font-black leading-none tracking-normal text-white">
          {data.profile.name}
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/62">
          {data.profile.bio ?? "No bio added yet."}
        </p>
      </div>
    </div>
  );
}

function StatsCard({ data }: { data: GitBentoData }) {
  const stats = [
    { label: "Followers", value: data.profile.followers, icon: Users },
    { label: "Stars", value: data.totals.stars, icon: Star },
    { label: "Repos", value: data.totals.publicRepos, icon: BookOpen },
    { label: "Forks", value: data.totals.forks, icon: GitFork },
  ];

  return (
    <div className="flex h-full flex-col pr-8">
      <p className="text-sm font-semibold text-white/52">Power Stats</p>
      <div className="mt-4 grid flex-1 content-between gap-2">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-[16px] border border-white/8 bg-black/20 p-3">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-white/50">
                <Icon className="size-4 text-[var(--accent)]" />
                {stat.label}
              </span>
              <strong className="mt-1 block text-2xl font-black leading-none text-white">
                {stat.value.toLocaleString()}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LanguagesCard({ data }: { data: GitBentoData }) {
  const max = Math.max(...data.topLanguages.map((language) => language.count), 1);

  return (
    <div className="flex h-full flex-col pr-8">
      <p className="text-sm font-semibold text-white/52">Language Aura</p>
      <div className="mt-5 flex-1 space-y-5">
        {data.topLanguages.length ? (
          data.topLanguages.map((language, index) => (
            <div key={language.name}>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-semibold text-white">{language.name}</span>
                <span className="text-white/48">{language.count} repos</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] via-white/80 to-[var(--accent2)] shadow-[0_0_24px_var(--glow)]"
                  style={{
                    width: `${Math.max((language.count / max) * 100, 12)}%`,
                    opacity: 1 - index * 0.16,
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-white/52">No language data found.</p>
        )}
      </div>
      <div className="mt-4 h-12 rounded-full bg-[radial-gradient(circle,var(--accent),transparent_68%)] opacity-30 blur-xl" />
    </div>
  );
}

function ReposCard({ data }: { data: GitBentoData }) {
  return (
    <div className="flex h-full flex-col pr-8">
      <p className="text-sm font-semibold text-white/52">Featured Repositories</p>
      <div className="mt-4 grid flex-1 gap-3">
        {data.topRepositories.slice(0, 3).map((repo) => (
          <a
            key={repo.name}
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-[18px] border border-white/10 bg-black/22 p-4 transition hover:border-[var(--accent)] hover:bg-white/[0.07]"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-black leading-tight text-white">{repo.name}</h3>
              <span className="inline-flex items-center gap-1 text-sm text-white/62">
                <Star className="size-3.5 text-[var(--accent)]" />
                {repo.stars}
              </span>
            </div>
            <p className="mt-2 line-clamp-1 text-sm text-white/48">
              {repo.description ?? repo.language ?? "Public repository"}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

function ContributionCard({ data }: { data: GitBentoData }) {
  const calendar = data.contributionCalendar;
  const visibleWeeks = calendar?.weeks.slice(-53) ?? [];
  const visibleFirstDay = visibleWeeks[0]?.firstDay;
  const months = calendar?.months.filter((month) => {
    if (!visibleFirstDay) return true;
    return new Date(month.firstDay) >= new Date(visibleFirstDay);
  }) ?? [];

  return (
    <div className="flex h-full flex-col pr-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white/52">Contribution Matrix</p>
          <h3 className="mt-1 text-3xl font-black leading-tight text-white">
            {(calendar?.totalContributions ?? 0).toLocaleString()} contributions in the last year
          </h3>
        </div>
        <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-100">
          live GitHub heatmap
        </div>
      </div>
      <div className="mt-5 min-w-0 flex-1">
        <div className="mb-2 ml-9 grid grid-flow-col gap-1.5 overflow-hidden text-[10px] font-semibold text-white/42">
          {months.map((month) => (
            <span
              key={`${month.name}-${month.firstDay}`}
              className="min-w-8"
              style={{
                gridColumn: `span ${Math.max(month.totalWeeks, 1)} / span ${Math.max(
                  month.totalWeeks,
                  1,
                )}`,
              }}
            >
              {month.name}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="grid grid-rows-7 gap-1.5 text-[10px] font-semibold leading-3 text-white/48">
            <span />
            <span>Mon</span>
            <span />
            <span>Wed</span>
            <span />
            <span>Fri</span>
            <span />
          </div>
          <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-hidden">
            {visibleWeeks.flatMap((week) =>
              week.contributionDays.map((day) => (
                <span
                  key={day.date}
                  title={`${day.contributionCount} contributions on ${day.date}`}
                  className="size-3 rounded-[3px] border border-black/25 transition hover:scale-125 xl:size-3.5"
                  style={{
                    backgroundColor: day.contributionCount ? day.color : "rgba(255,255,255,0.07)",
                    boxShadow:
                      day.contributionCount > 4 ? `0 0 15px ${day.color}88` : undefined,
                  }}
                />
              )),
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-white/38">
        <span>Less</span>
        <div className="flex gap-1">
          {["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"].map((color) => (
            <span
              key={color}
              className="size-3 rounded-[3px] border border-black/20"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

function ActivityCard({ data }: { data: GitBentoData }) {
  return (
    <div className="flex h-full flex-col pr-8">
      <p className="text-sm font-semibold text-white/52">Live Activity Feed</p>
      <div className="mt-4 grid flex-1 content-between gap-2">
        {data.recentActivity.length ? (
          data.recentActivity.slice(0, 4).map((event) => (
            <div key={event.id} className="rounded-[16px] border border-white/8 bg-black/20 p-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <RadioTower className="size-4 text-[var(--accent)]" />
                {event.type.replace("Event", "")}
              </div>
              <p className="mt-1 truncate text-xs text-white/46">{event.repo}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-white/52">No public activity found yet.</p>
        )}
      </div>
    </div>
  );
}

function NetworkCard({ data }: { data: GitBentoData }) {
  return (
    <div className="flex h-full flex-col pr-8">
      <p className="text-sm font-semibold text-white/52">Network Nodes</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {data.organizations.length ? (
          data.organizations.slice(0, 8).map((org) => (
            <img
              key={org.login}
              src={org.avatar}
              alt={org.login}
              title={org.login}
              className="size-11 rounded-2xl border border-white/15 shadow-[0_0_24px_var(--glow)]"
            />
          ))
        ) : (
          <div className="rounded-[18px] border border-white/10 bg-black/20 p-4 text-sm text-white/50">
            No public orgs. Solo builder mode.
          </div>
        )}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-3">
        <MiniMetric label="Following" value={data.profile.following} icon={Users} />
        <MiniMetric label="Gists" value={data.profile.publicGists} icon={Sparkles} />
      </div>
    </div>
  );
}

function IdentityCard({ data }: { data: GitBentoData }) {
  const createdYear = new Date(data.profile.createdAt).getFullYear();

  return (
    <div className="flex h-full flex-col justify-between pr-8">
      <p className="text-sm font-semibold text-white/52">Builder Passport</p>
      <div className="space-y-3">
        <InfoRow icon={CalendarDays} label="Joined" value={String(createdYear)} />
        <InfoRow icon={MapPin} label="Location" value={data.profile.location ?? "Unknown"} />
        <InfoRow icon={Building2} label="Company" value={data.profile.company ?? "Independent"} />
      </div>
      <div className="rounded-[18px] border border-[var(--line)] bg-black/25 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--accent)]">
          <Zap className="size-4" />
          GitBento Rank
        </div>
        <div className="mt-2 text-4xl font-black text-white">
          {Math.min(
            999,
            data.profile.followers + data.totals.stars + data.totals.publicRepos * 3,
          ).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function RpgCard({ data }: { data: GitBentoData }) {
  return (
    <div className="flex h-full flex-col pr-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white/52">RPG Build</p>
          <h3 className="mt-1 text-2xl font-black leading-none text-white">Developer Archetype</h3>
        </div>
        <div className="rounded-full border border-[var(--line)] bg-black/25 px-3 py-1 text-xs font-bold text-[var(--accent)]">
          streak {data.rpg.longestStreak}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <RPGRadarChart stats={data.rpg.stats} color="var(--accent)" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-white/48">
        <div className="rounded-[14px] border border-white/8 bg-black/20 p-3">
          <div className="text-white">{data.rpg.originalRepos}</div>
          <div>Original repos</div>
        </div>
        <div className="rounded-[14px] border border-white/8 bg-black/20 p-3">
          <div className="text-white">{data.rpg.nightSignals}</div>
          <div>Night signals</div>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-[16px] border border-white/8 bg-black/20 p-3">
      <Icon className="size-4 text-[var(--accent)]" />
      <div className="mt-1 text-xl font-black text-white">{value.toLocaleString()}</div>
      <div className="text-xs font-semibold text-white/42">{label}</div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-white/8 bg-black/20 p-3">
      <Icon className="size-4 shrink-0 text-[var(--accent)]" />
      <div className="min-w-0">
        <div className="text-xs font-semibold text-white/42">{label}</div>
        <div className="truncate text-sm font-bold text-white">{value}</div>
      </div>
    </div>
  );
}

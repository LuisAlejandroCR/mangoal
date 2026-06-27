import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n";

export type MatchData = {
  id: string;
  campaignId: string;
  home: string;
  away: string;
  homeFlag: string;
  awayFlag: string;
  competition: string;
  kickoff: Date;
  lockedAt: Date;
  userPick?: {
    home: number;
    away: number;
  };
  status: "open" | "locked" | "live" | "finished";

  statusLabel?: string;
  source?: "local" | "espn";
  espnId?: string;
  venue?: string | null;
  clock?: string;
  statusText?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  canPredict?: boolean;
};

function getMatchBadge(
  match: MatchData,
  copy: ReturnType<typeof useLanguage>["copy"],
) {
  if (match.status === "live") {
    return match.clock ? `${copy.matches.live} - ${match.clock}` : copy.matches.live;
  }

  if (match.status === "finished") return "FT";
  if (match.status === "locked") return copy.matches.locked;
  if (match.source === "espn") return copy.matches.confirmedSchedule;

  return match.competition;
}

function formatKickoff(
  date: Date,
  copy: ReturnType<typeof useLanguage>["copy"],
  now: number,
): string {
  const diff = date.getTime() - now;

  if (diff < 0) return copy.matches.live;

  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours < 24) return copy.matches.timeLeft(hours, minutes, seconds);

  return date.toLocaleDateString(copy.matches.dateLocale, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(
  match: MatchData,
  copy: ReturnType<typeof useLanguage>["copy"],
  now: number,
) {
  if (match.status === "live") {
    return match.clock ? `${copy.matches.live} - ${match.clock}` : copy.matches.live;
  }
  if (match.status === "finished") return "FT";
  if (match.status === "locked") return copy.matches.locked;

  return formatKickoff(match.lockedAt, copy, now);
}

function TeamMark({ value }: { value: string }) {
  if (!value) return null;

  if (value.startsWith("http")) {
    return <img className="team-logo" src={value} alt="" aria-hidden="true" loading="lazy" />;
  }

  if (value.length > 4 && !/^[A-Z]{2,4}$/.test(value)) {
    return <span className="team-emoji" aria-hidden="true">{value}</span>;
  }

  return <span className="team-logo-placeholder" aria-hidden="true" />;
}

function formatVenue(value: string, locale: string) {
  if (locale !== "es") return value;

  return value
    .replace(/\bStadium\b/g, "Estadio")
    .replace(/\bField\b/g, "Campo")
    .replace(/\bPark\b/g, "Parque");
}

export function MatchCard({ match }: { match: MatchData }) {
  const navigate = useNavigate();
  const { copy } = useLanguage();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (match.status !== "open") return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [match.status]);

  const canPredict = match.canPredict !== false;
  const isFifaPreview = match.competition.toLowerCase().includes("world cup") && match.source === "espn";
  const hasLiveScore =
    match.homeScore !== undefined &&
    match.homeScore !== null &&
    match.awayScore !== undefined &&
    match.awayScore !== null;

  function handleOpen() {
    if (!canPredict && !isFifaPreview) {
      alert(copy.matches.notRegistered);
      return;
    }

    navigate(`/match/${match.id}`, { state: { match } });
  }

  return (
    <div
      className="match-card"
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          handleOpen();
        }
      }}
      style={{ opacity: canPredict || isFifaPreview ? 1 : 0.78 }}
    >
      <div className="match-card-top">
        <span
          className={
            match.status === "live"
              ? "badge badge-live"
              : match.source === "espn"
                ? "badge badge-celo"
                : "badge"
          }
        >
          {match.userPick && match.status === "open" ? "Edit pick" : getMatchBadge(match, copy)}
        </span>

        <span className="match-time-group">
          <span className="match-time">{getStatusLabel(match, copy, now)}</span>

        </span>
      </div>

      <div className="match-teams">
        <div className="team-name">
          <TeamMark value={match.homeFlag} />
          {match.home}
        </div>

        <div
          style={{
            minWidth: 70,
            textAlign: "center",
            fontWeight: 900,
            color: hasLiveScore ? "var(--green-dark)" : "var(--text-muted)",
          }}
        >
          {hasLiveScore ? (
            <>
              {match.homeScore} - {match.awayScore}
            </>
          ) : match.userPick ? (
            <>
              {match.userPick.home} - {match.userPick.away}
            </>
          ) : (
            "vs"
          )}
        </div>

        <div className="team-name">
          <TeamMark value={match.awayFlag} />
          {match.away}
        </div>
      </div>

      {match.venue && (
        <div className="match-venue">
          {formatVenue(match.venue, copy.matches.dateLocale)}
        </div>
      )}

      {!canPredict && !isFifaPreview && (
        <div className="match-preview-note">
          {copy.matches.notRegistered}
        </div>
      )}

      {match.status === "finished" && !match.userPick && (
        <div className="match-preview-note">
          {copy.matches.missedPick}
        </div>
      )}

    </div>
  );
}

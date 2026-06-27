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
): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < 0) return copy.matches.live;

  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return copy.matches.hoursLeft(hours);

  return date.toLocaleDateString(copy.matches.dateLocale, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(
  match: MatchData,
  copy: ReturnType<typeof useLanguage>["copy"],
) {
  if (match.status === "live") {
    return match.clock ? `${copy.matches.live} - ${match.clock}` : copy.matches.live;
  }
  if (match.status === "finished") return "FT";
  if (match.status === "locked") return copy.matches.locked;

  return formatKickoff(match.kickoff, copy);
}

export function MatchCard({ match }: { match: MatchData }) {
  const navigate = useNavigate();
  const { copy } = useLanguage();

  const canPredict = match.canPredict !== false;
  const hasLiveScore =
    match.homeScore !== undefined &&
    match.homeScore !== null &&
    match.awayScore !== undefined &&
    match.awayScore !== null;

  function handleOpen() {
    if (!canPredict) {
      alert(copy.matches.notRegistered);
      return;
    }

    navigate(`/match/${match.id}`);
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
      style={{ opacity: canPredict ? 1 : 0.78 }}
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
          {getMatchBadge(match, copy)}
        </span>

        <span className="match-time">{getStatusLabel(match, copy)}</span>
      </div>

      <div className="match-teams">
        <div className="team-name">
          {match.homeFlag && <span>{match.homeFlag} </span>}
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
          {match.awayFlag && <span>{match.awayFlag} </span>}
          {match.away}
        </div>
      </div>

      {match.venue && (
        <div className="match-venue">
          {match.venue}
        </div>
      )}

      {!canPredict && (
        <div className="match-preview-note">
          {copy.matches.notRegistered}
        </div>
      )}

      {match.userPick && (
        <div className="match-pick-note">
          {copy.matches.yourPick}
        </div>
      )}
    </div>
  );
}

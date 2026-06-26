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

  source?: "local" | "espn";
  espnId?: string;
  venue?: string | null;
  clock?: string;
  statusText?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  canPredict?: boolean;
};

function formatKickoff(
  date: Date,
  copy: ReturnType<typeof useLanguage>["copy"]
): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < 0) return copy.matches.live;

  const hours = Math.floor(diff / 3_600_000);

  if (hours < 24) {
    return copy.matches.hoursLeft(hours);
  }

  return date.toLocaleDateString(copy.matches.dateLocale, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(match: MatchData, copy: ReturnType<typeof useLanguage>["copy"]) {
  if (match.status === "live") return match.clock ? `LIVE · ${match.clock}` : "LIVE";
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
      alert(
        "This match came from ESPN live data, but it is not registered on-chain yet. Register it in MangooalLedger before enabling predictions."
      );
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
      style={{
        opacity: canPredict ? 1 : 0.78,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span className="badge badge-celo">
          {match.source === "espn" ? "ESPN live" : match.competition}
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
              {match.homeScore} – {match.awayScore}
            </>
          ) : match.userPick ? (
            <>
              {match.userPick.home} – {match.userPick.away}
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
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: 12,
            lineHeight: 1.4,
            textAlign: "center",
            marginTop: 6,
          }}
        >
          {match.venue}
        </div>
      )}

      {!canPredict && (
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: 11,
            lineHeight: 1.4,
            textAlign: "center",
            marginTop: 8,
          }}
        >
          Schedule only · register this match on-chain to enable picks
        </div>
      )}

      {match.userPick && (
        <div
          style={{
            color: "var(--green-dark)",
            fontSize: 12,
            fontWeight: 800,
            textAlign: "center",
            marginTop: 8,
          }}
        >
          Your pick is recorded
        </div>
      )}
    </div>
  );
}
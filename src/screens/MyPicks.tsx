import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useRevealPrediction } from "../hooks/useMangoalLedger";
import { useMyPicks, type PickEntry, type PickStatus } from "../hooks/useMyPicks";
import type { MatchConfig } from "../config/matches";
import { getLocalPicks, type LocalPick } from "../utils/localPicks";

const STATUS_LABELS: Record<PickStatus, { text: string; color: string }> = {
  none:      { text: "Not submitted",          color: "var(--text-muted)" },
  committed: { text: "Waiting for result",     color: "var(--text-muted)" },
  revealed:  { text: "Revealed - Scoring soon", color: "var(--green)" },
  scored:    { text: "Scored",                 color: "var(--success)" },
};

function TeamMark({ value }: { value?: string | null }) {
  if (!value) return null;
  if (value.startsWith("http")) {
    return <img className="team-logo" src={value} alt="" aria-hidden="true" loading="lazy" />;
  }
  if (value.length > 4 && !/^[A-Z]{2,4}$/.test(value)) {
    return <span className="team-emoji" aria-hidden="true">{value}</span>;
  }
  return null;
}

function RevealButton({ match }: { match: MatchConfig }) {
  const { isConnected } = useAccount();
  const { reveal, txHash, isPending, error } = useRevealPrediction();

  if (txHash) {
    return (
      <div style={{ fontSize: 11, color: "var(--success)", marginTop: 8, fontWeight: 700 }}>
        Revealed on Celo
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button
        className="btn btn-secondary btn-sm"
        disabled={isPending || !isConnected}
        onClick={async () => {
          try {
            await reveal({ campaignId: match.campaignId, matchId: match.matchId });
          } catch {
            // error surfaces in the error state below
          }
        }}
      >
        {isPending ? "Revealing..." : "Reveal prediction"}
      </button>
      {error && (
        <div style={{ fontSize: 11, color: "#B91C1C", marginTop: 4 }}>
          {error.message}
        </div>
      )}
    </div>
  );
}

function PickCard({ entry }: { entry: PickEntry }) {
  const navigate = useNavigate();
  const { match, status, homeScore, awayScore, points, canReveal, hasSalt } = entry;
  const statusMeta = STATUS_LABELS[status];
  const isExact =
    status === "scored" &&
    homeScore !== null &&
    awayScore !== null;

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: statusMeta.color, fontWeight: 700 }}>
          {statusMeta.text}
        </span>
        {points !== null && points > 0 && (
          <span style={{ fontWeight: 800, color: isExact ? "var(--success)" : "var(--text)", fontSize: 15 }}>
            {points} pts
          </span>
        )}
      </div>

      <div
        className="match-teams"
        style={{ cursor: "pointer" }}
        onClick={() => navigate(`/audit/${match.id}`)}
      >
        <div className="team-name" style={{ fontSize: 13 }}>
          <TeamMark value={match.homeFlag} />
          {match.home}
        </div>
        <div style={{ textAlign: "center" }}>
          {homeScore !== null ? (
            <div style={{ fontWeight: 800, fontSize: 18, color: "var(--green)" }}>
              {homeScore} - {awayScore}
            </div>
          ) : (
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-muted)" }}>
              Committed
            </div>
          )}
        </div>
        <div className="team-name" style={{ fontSize: 13 }}>
          <TeamMark value={match.awayFlag} />
          {match.away}
        </div>
      </div>

      <div
        style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
        onClick={() => navigate(`/audit/${match.id}`)}
      >
        <span>Tap to view on-chain audit</span>
      </div>

      {canReveal && hasSalt && <RevealButton match={match} />}
      {canReveal && !hasSalt && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
          Reveal data not found on this device. Open on the device where you submitted the prediction.
        </div>
      )}
    </div>
  );
}

function localPickToMatchState(pick: LocalPick) {
  return {
    id: pick.id,
    campaignId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    home: pick.home,
    away: pick.away,
    homeFlag: pick.homeMark ?? "",
    awayFlag: pick.awayMark ?? "",
    competition: pick.competition,
    kickoff: new Date(pick.kickoffAt),
    lockedAt: new Date(pick.lockedAt),
    status: Date.now() >= pick.lockedAt ? "locked" : "open",
    source: "espn",
    canPredict: true,
    userPick: {
      home: pick.homeScore,
      away: pick.awayScore,
    },
  };
}

function LocalPickCard({ pick, isConnected }: { pick: LocalPick; isConnected: boolean }) {
  const navigate = useNavigate();
  const canEdit = isConnected && Date.now() < pick.lockedAt;

  function editPick() {
    navigate(`/match/${pick.id}`, { state: { match: localPickToMatchState(pick), editing: true } });
  }

  return (
    <div className="card local-pick-card">
      <div className="local-pick-top">
        <span>{pick.source === "celo" ? "Recorded on Celo" : "Saved in My Picks"}</span>
        <time>{new Date(pick.savedAt).toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
      </div>
      <div className="match-teams">
        <div className="team-name" style={{ fontSize: 13 }}>
          <TeamMark value={pick.homeMark} />
          {pick.home}
        </div>
        <div style={{ fontWeight: 900, color: "var(--green-dark)", minWidth: 70, textAlign: "center" }}>
          {pick.homeScore} - {pick.awayScore}
        </div>
        <div className="team-name" style={{ fontSize: 13 }}>
          <TeamMark value={pick.awayMark} />
          {pick.away}
        </div>
      </div>
      <div className="local-pick-meta">
        {pick.competition} - {new Date(pick.kickoffAt).toLocaleString("en", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="local-pick-actions">
        {canEdit ? (
          <button className="btn btn-secondary btn-sm" onClick={editPick} type="button">
            Edit
          </button>
        ) : (
          <span>{isConnected ? "Locked 30 min before kickoff" : "Connect wallet to edit"}</span>
        )}
      </div>
      {pick.txHash && <div className="record-hash">{pick.txHash}</div>}
    </div>
  );
}

export function MyPicks() {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const { picks, isLoading } = useMyPicks();
  const [localPicks, setLocalPicks] = useState<LocalPick[]>(() => getLocalPicks());
  const activePicks = picks.filter((p) => p.status !== "none");
  const totalPoints = activePicks.reduce((s, p) => s + (p.points ?? 0), 0);
  const hasAnyPicks = activePicks.length > 0 || localPicks.length > 0;

  useEffect(() => {
    const refresh = () => setLocalPicks(getLocalPicks());
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <div className="screen">
      <div className="topbar">
        <span className="topbar-logo"><span className="brand-ball-icon" aria-hidden="true" /> <span>Mangoo</span>al</span>
        <div className="topbar-actions">
          <a className="icon-button" href="/support" aria-label="Legal and support">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.1 9a3 3 0 1 1 5.8 1c-.4.9-1.2 1.4-2 2-.6.4-.9.8-.9 1.6" />
              <path d="M12 17h.01" />
            </svg>
          </a>
          <button className="icon-button" type="button" aria-label="Notifications" onClick={() => navigate("/support")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        </div>
      </div>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        {hasAnyPicks && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Total points</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "var(--green)" }}>{totalPoints}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>Picks</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{activePicks.length + localPicks.length}</div>
              </div>
            </div>
          </div>
        )}

        <div className="section-title">My predictions</div>

        {localPicks.map((pick) => <LocalPickCard key={pick.id} pick={pick} isConnected={isConnected} />)}

        {isLoading ? (
          <div className="card" style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 16px" }}>
            Loading...
          </div>
        ) : activePicks.length === 0 && localPicks.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "24px 16px" }}>
            <div className="brand-ball-icon large" aria-hidden="true" />
            <div style={{ fontWeight: 700, marginBottom: 6 }}>No picks yet</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Head to Picks and submit your first pick. It is free.
            </div>
          </div>
        ) : (
          activePicks.map((entry) => <PickCard key={entry.match.id} entry={entry} />)
        )}
      </div>
    </div>
  );
}

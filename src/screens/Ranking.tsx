import { useNavigate } from "react-router-dom";
import { useOnChainRanking, type RankEntry } from "../hooks/useOnChainRanking";
import { CAMPAIGN_ID, CAMPAIGN_DISPLAY_NAME } from "../config/matches";

const MEDALS = ["🥇", "🥈", "🥉"];

function shortAddr(wallet: string) {
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function PodiumBar({
  entry,
  height,
  medal,
}: {
  entry: RankEntry;
  height: number;
  medal: string;
}) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-muted)",
          marginBottom: 4,
        }}
      >
        {medal}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          marginBottom: 4,
          fontFamily: entry.isMe ? undefined : "monospace",
        }}
      >
        {entry.isMe ? "You" : shortAddr(entry.wallet)}
      </div>
      <div
        style={{
          height,
          background:
            entry.rank === 1
              ? "linear-gradient(to top, #F4B400, #FFC83D)"
              : "linear-gradient(to top, #2E9E57, #35D07F)",
          borderRadius: "8px 8px 0 0",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: 8,
          fontSize: 14,
          fontWeight: 800,
          color: "white",
        }}
      >
        {entry.totalPoints}
      </div>
    </div>
  );
}

function RankRow({ entry }: { entry: RankEntry }) {
  return (
    <div
      className="rank-row"
      style={
        entry.isMe
          ? { background: "#FFF9EC", margin: "0 -16px", padding: "12px 16px" }
          : {}
      }
    >
      <div className={`rank-pos${entry.rank <= 3 ? " top3" : ""}`}>
        {entry.rank <= 3 ? MEDALS[entry.rank - 1] : entry.rank}
      </div>
      <div className="rank-avatar">{entry.isMe ? "👤" : "•"}</div>
      <div className="rank-info">
        <div
          className="rank-name"
          style={{ fontFamily: entry.isMe ? undefined : "monospace", fontSize: 13 }}
        >
          {entry.isMe ? "You" : shortAddr(entry.wallet)}
          {entry.isMe && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontWeight: 400,
                marginLeft: 6,
              }}
            >
              · you
            </span>
          )}
        </div>
      </div>
      <div className="rank-pts">{entry.totalPoints}</div>
    </div>
  );
}

export function Ranking() {
  const navigate = useNavigate();
  const { entries, myEntry, isLoading } = useOnChainRanking(CAMPAIGN_ID);

  const top3 = entries.slice(0, 3);
  const hasData = entries.length > 0;

  return (
    <div className="screen">
      <div className="topbar">
        <span className="topbar-logo">
          <span className="brand-ball-icon" aria-hidden="true" /> <span>Mangoo</span>al
        </span>
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
        {/* Campaign badge */}
        <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <span className="badge badge-yellow">{CAMPAIGN_DISPLAY_NAME}</span>
          <span className="badge badge-muted">On-chain</span>
        </div>

        {isLoading ? (
          <div
            className="card"
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              padding: "32px 16px",
            }}
          >
            Loading ranking…
          </div>
        ) : !hasData ? (
          <div
            className="card"
            style={{ textAlign: "center", padding: "32px 16px", marginBottom: 16 }}
          >
            <div style={{ fontSize: 32, marginBottom: 10 }}>🏆</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
              No scores yet
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                lineHeight: 1.7,
              }}
            >
              First results will appear here after the opening match is scored.
              <br />
              Submit your prediction — it's free!
            </div>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {top3.length === 3 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  gap: 12,
                  marginBottom: 24,
                  padding: "0 8px",
                }}
              >
                <PodiumBar entry={top3[1]} height={80} medal={MEDALS[1]} />
                <PodiumBar entry={top3[0]} height={100} medal={MEDALS[0]} />
                <PodiumBar entry={top3[2]} height={65} medal={MEDALS[2]} />
              </div>
            )}

            {/* Full ranking list */}
            <div className="section-title">
              Full ranking · {entries.length} player{entries.length !== 1 ? "s" : ""}
            </div>
            <div className="card">
              {entries.map((entry) => (
                <RankRow key={entry.wallet} entry={entry} />
              ))}
            </div>

            {/* Connected wallet outside top 50 */}
            {myEntry && (
              <>
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 11,
                    color: "var(--text-muted)",
                    margin: "12px 0 6px",
                  }}
                >
                  · · ·
                </div>
                <div className="section-title">Your position</div>
                <div className="card">
                  <RankRow entry={myEntry} />
                </div>
              </>
            )}
          </>
        )}

        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 16,
            lineHeight: 1.6,
          }}
        >
          Ranking built from on-chain prediction events on Celo.
          <br />
          Coach Pass does not affect your ranking position.
        </div>
      </div>
    </div>
  );
}

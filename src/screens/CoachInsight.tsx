import { useParams, useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { CeloBadge } from "../components/CeloBadge";
import { useHasActiveCoachPass } from "../hooks/useMangoalLedger";
import { getMatchById } from "../config/matches";
import { useEspnScores, findMatch } from "../hooks/useEspnScores";
import { useLanguage } from "../i18n";

type InsightData = {
  suggestedScore: string;
  formHome: string;
  formAway: string;
  recentTrend: string;
};

const INSIGHTS: Record<string, InsightData> = {
  "cop26-col-bra": {
    suggestedScore: "2 – 1",
    formHome: "W W D L W",
    formAway: "W W W D W",
    recentTrend:
      "Colombia have scored in each of their last 5 fixtures. Brazil are unbeaten in the last 8 competitive matches.",
  },
  "cop26-arg-mex": {
    suggestedScore: "3 – 0",
    formHome: "W W W W D",
    formAway: "L W D L W",
    recentTrend:
      "Argentina have conceded just 2 goals in their last 6 matches. Mexico's away record has been inconsistent this cycle.",
  },
  "cop26-uru-usa": {
    suggestedScore: "1 – 1",
    formHome: "W D W L W",
    formAway: "W W L D W",
    recentTrend:
      "Uruguay are defensively disciplined with a low expected goals against. USA have improved rapidly but struggle against deep defensive blocks.",
  },
};

const DEFAULT_INSIGHT: InsightData = {
  suggestedScore: "1 – 1",
  formHome: "W D W D L",
  formAway: "D L W W D",
  recentTrend:
    "Match context is based on public football data and recent form statistics.",
};

export function CoachInsight() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address } = useAccount();
  const { language } = useLanguage();
  const { hasPass } = useHasActiveCoachPass(address);

  const match = getMatchById(id ?? "");
  const insight = match ? (INSIGHTS[match.id] ?? DEFAULT_INSIGHT) : DEFAULT_INSIGHT;

  // Live ESPN data for the match date
  const matchDate = match
    ? new Date(match.kickoffAt).toISOString().slice(0, 10).replace(/-/g, "")
    : undefined;
  const { matches: espnMatches, isLoading: liveLoading } = useEspnScores(
    "fifa.world",
    matchDate,
    language
  );
  const live = match ? findMatch(espnMatches, match.home, match.away) : null;

  if (!match) {
    return (
      <div className="screen">
        <div className="topbar">
          <button
            onClick={() => navigate(-1)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}
            aria-label="Back"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <span style={{ fontWeight: 800, fontSize: 16 }}>🏅 Mangooal Coach</span>
          <CeloBadge variant="built" />
        </div>
        <div
          className="screen-body"
          style={{ paddingTop: 40, textAlign: "center", color: "var(--text-muted)" }}
        >
          Match not found
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}
          aria-label="Back"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span style={{ fontWeight: 800, fontSize: 16 }}>🏅 Mangooal Coach</span>
        <CeloBadge variant="built" />
      </div>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        {/* Teams */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>
            {match.homeFlag} vs {match.awayFlag}
          </div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>
            {match.home} vs {match.away}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            {match.competition}
          </div>
        </div>

        {/* Live score (ESPN) */}
        {!liveLoading && live && (live.status === "in_progress" || live.status === "final") && (
          <div
            style={{
              background: live.status === "in_progress" ? "#0F4C2A" : "#1F2937",
              borderRadius: "var(--radius-sm)",
              padding: "14px 16px",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "white",
            }}
          >
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 11, opacity: 0.65, fontWeight: 700, marginBottom: 4 }}>
                {match!.homeFlag} {live.home}
              </div>
              <div style={{ fontSize: 30, fontWeight: 900 }}>
                {live.homeScore ?? "–"}
              </div>
            </div>
            <div style={{ textAlign: "center", padding: "0 12px" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: live.status === "in_progress" ? "#4ADE80" : "#9CA3AF",
                  marginBottom: 4,
                  letterSpacing: "0.05em",
                }}
              >
                {live.status === "in_progress" ? "LIVE" : "FT"}
              </div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>{live.clock}</div>
            </div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 11, opacity: 0.65, fontWeight: 700, marginBottom: 4 }}>
                {match!.awayFlag} {live.away}
              </div>
              <div style={{ fontSize: 30, fontWeight: 900 }}>
                {live.awayScore ?? "–"}
              </div>
            </div>
          </div>
        )}

        {/* Suggested score */}
        <div className="coach-card">
          <div className="coach-label">🏅 Mangooal Coach · Suggested score</div>
          <div className="coach-score">{insight.suggestedScore}</div>
          <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>
            Data-based pick · Recent-form analysis
          </div>
          <div className="coach-disclaimer">
            Insight only, not a guarantee. This is match context, not a betting tip.
            No odds. Not a wager.
          </div>
        </div>

        {/* Free insight */}
        <div className="section-title">Match context</div>
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 4 }}>
                {match.homeFlag} {match.home}
              </div>
              {live?.homeRecord ? (
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>
                  {live.homeRecord}
                  <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)", marginLeft: 4 }}>
                    W-D-L
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>
                  {insight.formHome.split(" ").map((r, i) => (
                    <span
                      key={i}
                      style={{
                        color:
                          r === "W" ? "var(--success)" : r === "L" ? "#EF4444" : "var(--text-muted)",
                      }}
                    >
                      {r}{" "}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, marginBottom: 4 }}>
                {match.awayFlag} {match.away}
              </div>
              {live?.awayRecord ? (
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>
                  {live.awayRecord}
                  <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)", marginLeft: 4 }}>
                    W-D-L
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>
                  {insight.formAway.split(" ").map((r, i) => (
                    <span
                      key={i}
                      style={{
                        color:
                          r === "W" ? "var(--success)" : r === "L" ? "#EF4444" : "var(--text-muted)",
                      }}
                    >
                      {r}{" "}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              lineHeight: 1.6,
              borderTop: "1px solid var(--border)",
              paddingTop: 10,
            }}
          >
            {insight.recentTrend}
          </div>
        </div>

        {/* Coach Pass upsell */}
        {!hasPass && (
          <div
            className="card"
            style={{
              border: "2px solid var(--yellow)",
              background: "#FFFDF0",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>
              🔒 Coach Pass insight locked
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                lineHeight: 1.6,
                marginBottom: 14,
              }}
            >
              Unlock deeper match context: head-to-head summary, lineup analysis,
              rest-day impact, and key player form.
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginBottom: 12,
                padding: "8px 10px",
                background: "var(--bg)",
                borderRadius: 8,
              }}
            >
              Coach Pass does not affect points, ranking, or promotional rewards.
              Predictions remain free for everyone.
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate("/coach-pass")}
              style={{ width: "100%" }}
            >
              Unlock Mangooal Coach insights →
            </button>
          </div>
        )}

        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          Mangooal Coach uses public football data to generate match context.
          <br />
          No betting advice. No odds. No guaranteed result.
        </div>
      </div>
    </div>
  );
}

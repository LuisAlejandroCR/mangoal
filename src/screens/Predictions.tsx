import { CeloBadge } from "../components/CeloBadge";
import { LanguageToggle } from "../components/LanguageToggle";
import { MatchCard } from "../components/MatchCard";
import { useLiveWorldCupMatches } from "../hooks/useLiveWorldCupMatches";
import { useMiniPay } from "../hooks/useMiniPay";
import { useLanguage } from "../i18n";
import { CAMPAIGN_DISPLAY_NAME } from "../config/matches";

type ComingCompetition = {
  marker: string;
  name: string;
  sub: string;
  color: string;
};

function buildComingCompetitions(language: "en" | "es"): ComingCompetition[] {
  return [
    {
      marker: "UEFA",
      name: "UEFA Champions League",
      sub:
        language === "es"
          ? "Temporada 2026-27 · Fase de liga desde septiembre de 2026"
          : "2026-27 season · League phase from September 2026",
      color: "#1B3A8A",
    },
    {
      marker: "CONMEBOL",
      name: "Copa América 2027",
      sub:
        language === "es"
          ? "Sudamérica · Predicciones para usuarios de Latam"
          : "South America · Predictions for LatAm users",
      color: "#176B3A",
    },
    {
      marker: "CAF",
      name: "Africa Cup of Nations 2027",
      sub:
        language === "es"
          ? "África · Predicciones para fans africanos"
          : "Africa · Predictions for African football fans",
      color: "#7C3AED",
    },
  ];
}

export function Predictions() {
  const { isMiniPay, isConnected, address } = useMiniPay();
  const { language, copy } = useLanguage();

  const {
    matches: allMatches,
    isLoading,
    error,
    hasLiveData,
  } = useLiveWorldCupMatches();

  const openMatches = allMatches.filter((match) => match.status === "open");

  const lockedLiveOrFinished = allMatches.filter(
    (match) =>
      match.status === "locked" ||
      match.status === "live" ||
      match.status === "finished"
  );

  const predictionReadyCount = allMatches.filter(
    (match) => match.canPredict !== false
  ).length;

  const comingCompetitions = buildComingCompetitions(language);
  const comingSoonNames = comingCompetitions.map((item) => item.name).join(" · ");

  return (
    <div className="screen">
      <div className="topbar">
        <span className="topbar-logo">
          ⚽ <span>Mangoo</span>al
        </span>

        <div className="topbar-actions">
          <LanguageToggle />
          <CeloBadge variant={isConnected ? "connected" : "network"} />
        </div>
      </div>

      <div className="screen-body" style={{ paddingTop: 16 }}>
        {isConnected && (
          <div className="wallet-bar">
            <span>
              {isMiniPay
                ? "MiniPay wallet connected · Celo Mainnet"
                : "Celo wallet connected"}
            </span>

            {address && (
              <span>
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            )}
          </div>
        )}

        <section className="campaign-banner">
          <div className="campaign-eyebrow">
            {copy.predictions.currentCup}
          </div>

          <div className="campaign-title">{CAMPAIGN_DISPLAY_NAME}</div>

          <div className="campaign-meta">
            {hasLiveData
              ? "Live schedule and scores loaded from ESPN"
              : `${copy.predictions.now}: ${CAMPAIGN_DISPLAY_NAME}`}
          </div>

          <div className="campaign-next">
            {copy.predictions.comingSoon}: {comingSoonNames}
          </div>

          <div className="campaign-pills">
            <span>
              {predictionReadyCount} {copy.predictions.freePredictions}
            </span>

            <span>
              {openMatches.length} {copy.predictions.open}
            </span>

            <span>{copy.predictions.promoRewards}</span>
          </div>
        </section>

        {error && (
          <div
            className="card"
            style={{
              marginBottom: 14,
              borderColor: "#FCA5A5",
              background: "#FEF2F2",
              color: "#991B1B",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            ESPN live data could not be loaded. Mangooal is showing the local
            registered schedule instead.
          </div>
        )}

        {isLoading && (
          <div className="card" style={{ marginBottom: 14 }}>
            Loading live World Cup schedule…
          </div>
        )}

        {openMatches.length > 0 && (
          <>
            <div className="section-title">
              {copy.predictions.openPredictions}
            </div>

            {openMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </>
        )}

        {lockedLiveOrFinished.length > 0 && (
          <>
            <div className="section-title">{copy.predictions.inProgress}</div>

            {lockedLiveOrFinished.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </>
        )}

        {!isLoading && allMatches.length === 0 && (
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⚽</div>
            <strong>{copy.predictions.noOpen}</strong>
          </div>
        )}

        <div className="section-title">{copy.predictions.roadmapTitle}</div>

        {comingCompetitions.map((competition) => (
          <div className="coming-card" key={competition.name}>
            <div
              className="coming-marker"
              style={{ background: competition.color }}
            >
              {competition.marker}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>
                {competition.name}
              </div>

              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                {competition.sub}
              </div>
            </div>

            <div className="coming-soon">{copy.common.soon}</div>
          </div>
        ))}

        <div className="compliance-note">
          {copy.predictions.complianceLine1}
          <br />
          {copy.predictions.complianceLine2}
        </div>
      </div>
    </div>
  );
}
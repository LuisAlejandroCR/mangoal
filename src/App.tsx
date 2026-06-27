import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "./config/wagmi";
import { BottomNav } from "./components/BottomNav";
import { Predictions } from "./screens/Predictions";
import { AllMatches } from "./screens/AllMatches";
import { PredictionDetail } from "./screens/PredictionDetail";
import { CoachInsight } from "./screens/CoachInsight";
import { CoachPass } from "./screens/CoachPass";
import { Ranking } from "./screens/Ranking";
import { MyPicks } from "./screens/MyPicks";
import { WalletStatus } from "./screens/WalletStatus";
import { OnChainAudit } from "./screens/OnChainAudit";
import { RewardClaim } from "./screens/RewardClaim";
import { Stats } from "./screens/Stats";
import { SplashScreen } from "./screens/SplashScreen";
import { LanguageProvider } from "./i18n";

const queryClient = new QueryClient();

function AppShell() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Predictions />} />
        <Route path="/matches" element={<AllMatches />} />
        <Route path="/match/:id" element={<PredictionDetail />} />
        <Route path="/coach/:id" element={<CoachInsight />} />
        <Route path="/coach-pass" element={<CoachPass />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/my-picks" element={<MyPicks />} />
        <Route path="/wallet" element={<WalletStatus />} />
        <Route path="/audit/:id" element={<OnChainAudit />} />
        <Route path="/claim" element={<RewardClaim />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
      <BottomNav />
    </>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          {showSplash ? (
            <SplashScreen onDone={() => setShowSplash(false)} />
          ) : (
            <BrowserRouter>
              <AppShell />
            </BrowserRouter>
          )}
        </LanguageProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

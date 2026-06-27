# Mangooal

Mangooal is a MiniPay-native football prediction app for one narrow Celo Mainnet flow:

`predict the score before kickoff, reveal it after lock, and prove it on-chain`

The app connects to the user's MiniPay or Celo wallet, lists FIFA World Cup 2026 matches,
lets the user submit a free score prediction, and records the prediction through a
commit-reveal audit trail on Celo Mainnet. Mangooal does not custody funds or private keys.
It is free to play: no entry fees, no odds, no user-funded prize pools, and no staking.

The source of truth for match schedules and live scores is external football data APIs.
Local files keep only app configuration such as enabled competitions, contract addresses,
stablecoins, and registered campaign IDs.

## Campaign

| Field | Value |
|---|---|
| Network | Celo Mainnet (chainId 42220) |
| Campaign | FIFA World Cup 2026 |
| Game action | Free score predictions before each match lock |
| On-chain proof | Commit-reveal prediction ledger |
| Paid feature | Coach Pass for analytics and UX only |
| Rewards | Optional operator-funded promotional claims |
| Core MiniPay payment assets | USDC, USDT, USDm |
| Display/reward focus | COPm plus other Mento regional stablecoins |

## How the flow works

1. User opens Mangooal in MiniPay or a Celo wallet browser.
2. Mangooal loads active and upcoming matches from the server-side scores API.
3. User chooses a match, enters an exact score, and confirms with their wallet.
4. `useCommitPrediction` creates a random local salt and computes:
   `keccak256(wallet, campaignId, matchId, homeScore, awayScore, salt)`.
5. `commitPrediction` writes only that hash to `MangooalLedger` before the match lock time.
6. The salt and score stay on the user's device until the reveal phase.
7. After the match locks, `revealPrediction` sends the score and salt so the contract can verify
   the committed hash.
8. An oracle submits official results and records points after the match result is known.
9. Rankings, stats, audits, Coach Pass state, and reward claims are re-read from the chain.

The Coach Pass unlocks deeper match context, not better odds or better points. Promotional
rewards are operator-signed and operator-funded; they are not funded by player entry fees.

## Match and coach data

Mangooal keeps competition metadata locally, but fixtures and scores should come from APIs.

| Layer | Source |
|---|---|
| Live schedules and scores | `/api/scores`, backed by ESPN's soccer scoreboard endpoint |
| Documented fixture backup | `/api/fixtures?provider=football-data`, backed by football-data.org v4 |
| Broad fixture/livescore backup | `/api/fixtures?provider=sportmonks`, backed by Sportmonks Football API v3 |
| Coach context | Public football data from the same provider layer, gated by Coach Pass for deeper analysis |

Provider keys are kept server-side in Vercel environment variables. The client should not
hardcode future fixtures, API keys, or provider URLs.

Scoreboard data refreshes automatically in the client every minute. The World Cup view requests a rolling scoreboard window from two days back through the next eight days, so live, recent finished, and weekend schedule rows can appear even before those matches are registered for on-chain picks. `/api/scores` tries ESPN first and falls back to football-data.org for supported competitions when `FOOTBALL_DATA_API_KEY` is configured. Finished matches are available through the `finished` filter for recent results, with the full list reachable from `/matches`.

When the user switches the app to Spanish, the client sends `lang=es` to `/api/scores`.
The proxy forwards `lang=es&region=co` to the football provider so country/team names and
status text can be localized by the API instead of by a hardcoded translation table.

## Blockchain contract

Mangooal uses one Celo Mainnet contract as the source of truth for campaigns, matches,
prediction commits, reveals, points, Coach Pass purchases, and promotional reward claims.

| Contract | Current address | Role |
|---|---|---|
| MangooalLedger | `0xCF00CaE3610cA8C410948C240b930c9cE3C03d66` | Campaign registry, match registry, commit-reveal predictions, points, Coach Passes, stablecoin allowlist, and reward claims |

### Contract responsibilities

`MangooalLedger` registers campaigns and matches, stores prediction commitments, verifies
reveals, tracks points, handles Coach Pass purchases, and validates operator-signed promotional
reward claims. It is intentionally not a betting contract:

- No user-funded prize pools
- No winner-takes-all mechanics
- No odds
- No staking
- Coach Pass is analytics/UX only
- Promotional rewards are operator-distributed, not user-funded

### Prediction proof

```text
User wallet
  -> picks a match score before lock
  -> frontend creates a private salt
  -> frontend commits only a prediction hash on Celo
  -> score and salt stay local until reveal
  -> reveal verifies the original committed hash
  -> oracle records official result and points
  -> leaderboard and audit screens read chain state
```

## Distribution model

The initial distribution surface is a MiniPay Mini App for football fans following the
FIFA World Cup 2026 campaign. The public repo and Vercel deployment are the developer and
auditor entry points, while MiniPay is the user entry point.

Mangooal should keep the prediction flow simple before expanding campaigns: wallet connection,
match list, prediction commit, local reveal data, on-chain audit, official results, points,
ranking, Coach Pass, and optional promotional claims.

Required production env vars:

```bash
VITE_DEPLOY_BLOCK=0
FOOTBALL_DATA_API_KEY=
SPORTMONKS_API_KEY=
```

`VITE_DEPLOY_BLOCK` should be set to the MangooalLedger deployment block in production so
log reads can be scoped to the contract's lifetime.

## Public routes

| Route | Purpose |
|---|---|
| `/` | MiniPay app entry point. Main tabs use `?tab=picks`, `?tab=ranking`, `?tab=my-picks`, and `?tab=coach-pass` to keep the core app under the root URL. |
| `/matches` | Full match list for the selected cup and filter |
| `/match/:id` | Score prediction screen for one match |
| `/coach/:id` | Coach insight and Coach Pass upsell |
| `/coach-pass` | Coach Pass purchase flow |
| `/coach-pass/history` | Coach Pass purchase history from Celo events plus this device fallback, with Celoscan proof links and QR receipts |
| `/ranking` | Direct leaderboard route kept for sharing/support; bottom navigation uses `/?tab=ranking` |
| `/my-picks` | Direct pick-history route kept for sharing/support; bottom navigation uses `/?tab=my-picks` |
| `/audit/:id` | On-chain prediction audit screen |
| `/claim` | Operator-signed promotional reward claim |
| `/stats` | On-chain campaign stats |

## Frontend architecture

```text
src/
  components/
    BottomNav.tsx          shared mobile navigation
    CeloBadge.tsx          hidden compatibility wrapper for old imports
    MatchCard.tsx          match list card
  config/
    competitions.ts        enabled cups and API league mapping
    matches.ts             campaign, match IDs, kickoff and lock times
    stablecoins.ts         Celo Mainnet stablecoin registry and fee-currency notes
    wagmi.ts               wagmi + Celo Mainnet config
  contracts/
    erc20.abi.ts           ERC-20 ABI for approvals and balances
    mangoalLedger.abi.ts   MangooalLedger ABI
  hooks/
    useMiniPay.ts          MiniPay detection and wallet state
    useMangoalLedger.ts    commit, reveal, Coach Pass, and reward writes
    useMyPicks.ts          user prediction reads
    useOnChainRanking.ts   ranking event reads
    useOnChainStats.ts     campaign stats event reads
    useTokenBalances.ts    stablecoin balance reads
  lib/
    analytics.ts           local analytics hooks
  screens/
    Predictions.tsx        active campaign and match list
    AllMatches.tsx         full match list for one competition
    PredictionDetail.tsx   score input and commit transaction
    CoachInsight.tsx       match context and Coach Pass gate
    CoachPass.tsx          paid analytics pass purchase
    OnChainAudit.tsx       commitment and transaction proof
    Ranking.tsx            leaderboard
    RewardClaim.tsx        promotional reward claim flow
    StablecoinBalances.tsx  compact stablecoin balance grid for Picks
  App.tsx                  route shell and providers
contracts/
  MangooalLedger.sol       Celo Mainnet ledger contract
script/
  Deploy.s.sol             Foundry deployment script
  SetupAfterDeploy.s.sol   campaign and match setup
  RegisterMatches.s.sol    match registration helper
  SubmitResult.s.sol       official result submission helper
  RecordPoints.s.sol       oracle points helper
  SignReward.s.sol         reward signature helper
```

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL in a browser. For signing, use MiniPay or another wallet browser on
Celo Mainnet (chainId 42220).

## Validate

```bash
npm run build
forge build
```

## Configure contracts

Foundry is configured for Solidity `0.8.24` with optimizer enabled.

```bash
forge build
forge script script/Deploy.s.sol --rpc-url celo --broadcast
forge script script/SetupAfterDeploy.s.sol --rpc-url celo --broadcast
```

After deployment:

1. Update `MANGOAL_LEDGER_ADDRESS` in `src/hooks/useMangoalLedger.ts`.
2. Set `VITE_DEPLOY_BLOCK` in Vercel or `.env.local`.
3. Register the active campaign and matches.
4. Configure Coach Pass prices for the allowed payment tokens.
5. Grant oracle/operator roles to the accounts that submit results, record points, and sign rewards.

## Stablecoins and MiniPay notes

Mangooal keeps a broad Celo stablecoin registry for display, rewards, and future expansion:
USDm, USDC, USDT, COPm, EURm, BRLm, KESm, NGNm, XOFm, GHSm, PHPm, and ZARm.

MiniPay user-facing transaction flows should use USDC, USDT, or USDm. COPm is first-class in
the product experience and reward language, but transaction support should respect MiniPay's
current token support.

## Compliance and privacy

Mangooal is free to play, not gambling or betting. Predictions are free for
everyone, Coach Pass does not affect points or ranking, and promotional rewards are distributed
only from operator-funded pools.

The app does not store private keys or custody user funds. Prediction reveal data is kept in the
user's browser storage so the user can later reveal the same score and salt that produced the
on-chain commitment.

# Mangooal

Mangooal is a MiniPay-native football prediction app for one narrow Celo Mainnet flow:

`predict or edit the score before lock, read it from Celo anywhere, and score it on-chain`

The app connects to the user's MiniPay or Celo wallet, lists FIFA World Cup 2026 matches,
lets the user submit or edit a free score prediction before lock, and records the pick directly on Celo Mainnet so MiniPay and browser show the same wallet state. Mangooal does not custody funds or private keys.
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
| On-chain proof | Editable public picks, wallet pick history, ranking stats, and Coach Pass history |
| Paid feature | Coach Pass for analytics and UX only |
| Rewards | Optional operator-funded promotional claims |
| Core MiniPay payment assets | USDC, USDT, USDm |
| Display/reward focus | COPm plus other Mento regional stablecoins |

## How the flow works

1. User opens Mangooal in MiniPay or a Celo wallet browser.
2. Mangooal loads active and upcoming matches from the server-side scores API.
3. User chooses a match, enters an exact score, and confirms with their wallet.
4. `submitOrUpdatePick` stores the public score pick on `MangooalLedger` before the match lock time.
5. The same wallet can edit the pick until lock, normally 30 minutes before kickoff.
6. Browser and MiniPay read the same `getPick` / `getUserPicks` state from Celo.
7. An oracle submits official results and records idempotent points after the match result is known.
8. Rankings, stats, audits, Coach Pass state, and reward claims are re-read from the chain.

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

Scoreboard data refreshes automatically in the client every minute. The World Cup view requests a rolling scoreboard window from two days back through the next eight days, so live, recent finished, and weekend schedule rows can appear even before those matches are registered for on-chain picks. Match cards show the pick deadline as `hh:mm left` and lock 30 minutes before kickoff. `/api/scores` tries ESPN first and falls back to football-data.org for supported competitions when `FOOTBALL_DATA_API_KEY` is configured. Finished matches are available through the `finished` filter for recent results, with the full list reachable from `/matches`.

When the user switches the app to Spanish, the client sends `lang=es` to `/api/scores`.
The proxy forwards `lang=es&region=co` to the football provider so country/team names and
status text can be localized by the API instead of by a hardcoded translation table.

## Blockchain contract

Mangooal uses one Celo Mainnet contract as the source of truth for campaigns, matches, editable picks, My Picks history, ranking stats, Coach Pass purchases, and promotional reward claims.

| Contract | Current address | Role |
|---|---|---|
| MangooalLedger v1 | `0xCF00CaE3610cA8C410948C240b930c9cE3C03d66` | Current deployed ledger. Replace with the v2 deployment before using cross-platform picks as the canonical source. |

### Contract responsibilities

`MangooalLedger` registers campaigns and matches, stores editable public picks before lock, exposes wallet pick history for My Picks, tracks ranking stats, handles Coach Pass purchases with on-chain purchase history, and validates operator-signed promotional reward claims. It is intentionally not a betting contract:

- No user-funded prize pools
- No winner-takes-all mechanics
- No odds
- No staking
- Coach Pass is analytics/UX only
- Promotional rewards are operator-distributed, not user-funded

### Contract v2 planning

Before redeploying `MangooalLedger`, use [`docs/contract-v2-scenarios.md`](docs/contract-v2-scenarios.md) as the product and contract checklist. The v2 direction is to store editable public picks on Celo so Picks, My Picks, Ranking, and Coach Pass all read the same wallet state in MiniPay and browser without Supabase as the canonical source.

### Pick source of truth

```text
User wallet
  -> picks or edits a match score before lock
  -> submitOrUpdatePick stores the score on Celo
  -> browser and MiniPay read the same getPick / getUserPicks state
  -> oracle records official result and idempotent points
  -> ranking, My Picks, and audit screens read chain state
```

The legacy `commitPrediction` / `revealPrediction` functions remain in the ABI for compatibility, but v2 product flows should use `submitOrUpdatePick` so pending picks are portable across devices.

## Distribution model

The initial distribution surface is a MiniPay Mini App for football fans following the
FIFA World Cup 2026 campaign. The public repo and Vercel deployment are the developer and
auditor entry points, while MiniPay is the user entry point.

Mangooal should keep the prediction flow simple before expanding campaigns: wallet connection,
match list, editable pick, on-chain audit, official results, points,
ranking, Coach Pass, and optional promotional claims.

Required production env vars:

```bash
VITE_DEPLOY_BLOCK=0
FOOTBALL_DATA_API_KEY=
SPORTMONKS_API_KEY=
```

`VITE_DEPLOY_BLOCK` should be set to the MangooalLedger deployment block in production so
log reads can be scoped to the contract's lifetime.

## Mangooal solution

Mangooal should stay small enough to pass the mom test:

`Pick scores. Compete. Track your picks.`

That is the whole first version. The app should not become a giant sports portal, casino, wallet dashboard, or analytics terminal. The winning shape is one simple loop that a football fan understands in seconds: choose a match, predict the score, come back for the result, and see the ranking.

### Product rule

Keep every feature under this test: does it make people submit more free picks, return for results, invite friends, or understand the next match faster? If not, cut it or move it to support/stats. UX matters more than Celo terminology. The user-facing copy should lead with play, compete, picks, reminders, ranking, and optional rewards. Use stablecoin names only in balance and payment contexts, and keep Celo/on-chain language as proof, not the headline.

Coach Pass is the paid layer, but it only unlocks better match context from public football data. It must never change points, ranking, eligibility, match outcomes, or the free pick loop. Treat it as a coach beside the user, not as an advantage engine.

### MiniPay mode

MiniPay is the primary distribution surface. Inside MiniPay, Mangooal should auto-connect, hide wallet setup, avoid seed phrase or network explanations, use only MiniPay-supported payment assets for transactions, keep screens short, and make the app name, support, terms, and privacy reachable from the visible UI. The Mini App should feel like a football game first and a Celo app second.

The main MiniPay path should stay short:

`Open app -> pick match -> submit score -> check My Picks -> return for result`

Do not show a connect-wallet education flow in MiniPay. MiniPay users should feel they are playing, not learning infrastructure.

### Public web mode

The public web app is discovery, demo, trust, and support. It should not block new visitors with wallet requirements. `/demo` is the wallet-free tour for first-time users, reviewers, and social traffic from X, Telegram, WhatsApp, TikTok, Instagram, and friends. After the demo, users can connect a Celo wallet to play from the browser, while `/support`, `/stats`, `/matches`, and audit links stay available as public support and proof surfaces.

For users outside MiniPay, Mangooal can support a normal Celo wallet connection. If the public audience grows beyond Celo-native users, evaluate embedded wallet providers for onboarding, but keep MiniPay auto-connect as the cleanest path inside MiniPay.

### Contract and metrics model

The contract architecture should keep user actions direct whenever possible. Picks, edits, Coach Pass purchases, reward claims, and ranking-relevant actions should be attributable to the user's wallet on Celo so MiniPay and browser stay aligned and Proof of Ship metrics reflect real users instead of only backend or paymaster activity.

Avoid a setup where a backend, relayer, or paymaster becomes the only visible actor for user activity. If gas sponsorship is added later, preserve direct user attribution in events and analytics. The product scorecard should watch daily active users, direct user transactions, repeat picks, network fees paid, failed transaction rate, and retention by campaign.

### Growth model

Start with the smallest loop and one strongest market. For Mangooal, that means free score picks around the active cup, Spanish-first LATAM distribution when that market is growing, and English as the second language. Add more competitions, languages, Coach features, or rewards only when they improve retention, direct user transactions, or daily active users.

Do not add languages or modes just because they are easy to build. Each one has an operating cost: copy, support, moderation, rewards, QA, and marketing. If Spanish users in Colombia/LATAM are growing fastest, deepen that loop before expanding. Retaining current users is cheaper than acquiring cold users.

Distribution needs budget. Promotional rewards and creator campaigns should be treated as runway, not as a feature checklist. Early growth comes from friends, X, Telegram, WhatsApp, family, community, and your own audience. When that ceiling appears, use creator campaigns with explicit caps and metrics, for example approved short videos with a fixed cost per view and maximum payout per creator.

Kill slow loops early. It is easier to remove a small feature than to maintain a monster that took months to build. Mangooal should earn expansion by proving that one cup, one pick loop, and one market can generate repeat play.

### Traceable product blocks

These blocks convert the product direction into testable guardrails. Keep each ID in sync with `src/config/productGuardrails.ts` and `npm test`.

| ID | Direction | Testable promise |
|---|---|---|
| MG-CORE-001 | One simple loop | Pick scores, compete, and track picks before adding secondary product surfaces. |
| MG-UX-001 | Mom-test UX | Copy leads with play, compete, picks, reminders, ranking, and optional rewards. |
| MG-MINIPAY-001 | MiniPay first | MiniPay users auto-connect and complete the pick loop without wallet setup education. |
| MG-WEB-001 | Public web discovery | Demo, support, matches, stats, and proof links stay reachable before wallet connection. |
| MG-CONTRACT-001 | Direct user attribution | User actions stay attributable to the user's wallet on Celo for MiniPay, browser, and Proof of Ship metrics. |
| MG-GROWTH-001 | Earn expansion | New markets, languages, competitions, and rewards must improve retention or repeat picks. |
| MG-COACH-001 | Coach context only | Coach Pass unlocks public-data match context without changing points, ranking, eligibility, or outcomes. |

## Public routes

| Route | Purpose |
|---|---|
| `/` | MiniPay app entry point. Main tabs keep the visible URL at `/` and store tab state locally. Legacy `?tab=` links are accepted and replaced back to `/`. |
| `/demo` | Wallet-free demo tour for first-time users, reviewers, and public web visitors |
| `/matches` | Full match list for the selected cup and filter |
| `/match/:id` | Score prediction screen for one match |
| `/coach/:id` | Coach insight and Coach Pass upsell |
| `/coach-pass` | Coach Pass purchase flow |
| `/coach-pass/history` | Coach Pass purchase history from Celo events plus this device fallback, with Celoscan proof links and QR receipts |
| `/ranking` | Direct leaderboard route kept for support/deep links; bottom navigation stays on `/` |
| `/my-picks` | Direct pick-history route kept for support/deep links; bottom navigation stays on `/` |
| `/audit/:id` | On-chain prediction audit screen |
| `/claim` | Operator-signed promotional reward claim |
| `/stats` | On-chain campaign stats |
| `/support` | Legal, support, and notification guidance |

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

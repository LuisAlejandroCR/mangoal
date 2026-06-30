export type ProductGuardrail = {
  id: string;
  title: string;
  promise: string;
  testFocus: string;
};

export const PRODUCT_GUARDRAILS = [
  {
    id: "MG-CORE-001",
    title: "One simple loop",
    promise: "Pick scores, compete, and track picks before adding secondary product surfaces.",
    testFocus: "The app keeps picks as the primary action and moves extra surfaces to support, stats, or Coach Pass.",
  },
  {
    id: "MG-UX-001",
    title: "Mom-test UX",
    promise: "User-facing copy leads with play, compete, picks, reminders, ranking, and optional rewards.",
    testFocus: "New copy does not lead with chain, token, network, or wallet education language.",
  },
  {
    id: "MG-MINIPAY-001",
    title: "MiniPay first",
    promise: "MiniPay users auto-connect and complete the pick loop without wallet setup education.",
    testFocus: "MiniPay flows hide connect-wallet setup and keep transaction assets inside MiniPay-supported options.",
  },
  {
    id: "MG-WEB-001",
    title: "Public web discovery",
    promise: "Public web visitors can learn through demo, support, matches, stats, and proof links before connecting.",
    testFocus: "Discovery and support routes stay reachable without forcing a wallet connection.",
  },
  {
    id: "MG-CONTRACT-001",
    title: "Direct user attribution",
    promise: "Picks, edits, Coach Pass purchases, claims, and ranking actions remain attributable to the user wallet on Celo.",
    testFocus: "Contract and analytics changes preserve user-wallet attribution instead of hiding activity behind only backend actors.",
  },
  {
    id: "MG-GROWTH-001",
    title: "Earn expansion",
    promise: "New markets, languages, competitions, and reward loops ship only when they improve retention or repeat picks.",
    testFocus: "Product changes state the growth metric they improve before adding operating cost.",
  },
  {
    id: "MG-COACH-001",
    title: "Coach context only",
    promise: "Coach Pass unlocks public-data match context without changing points, ranking, eligibility, or outcomes.",
    testFocus: "Coach features do not create paid gameplay advantage or alter the free prediction loop.",
  },
] as const satisfies readonly ProductGuardrail[];

export type ProductGuardrailId = (typeof PRODUCT_GUARDRAILS)[number]["id"];

export function getProductGuardrail(id: ProductGuardrailId) {
  return PRODUCT_GUARDRAILS.find((guardrail) => guardrail.id === id);
}
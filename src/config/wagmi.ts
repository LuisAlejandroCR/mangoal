import { http, createConfig as createWagmiConfig } from "wagmi";
import { celo } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { createConfig as createPrivyConfig } from "@privy-io/wagmi";

// Used when VITE_PRIVY_APP_ID is set — Privy injects connectors dynamically
export const wagmiConfigPrivy = createPrivyConfig({
  chains: [celo],
  transports: { [celo.id]: http("https://forno.celo.org") },
});

// Fallback when VITE_PRIVY_APP_ID is not configured.
// Cast avoids a type collision between wagmi's native Config and the
// module-augmented type registered for wagmiConfigPrivy.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const wagmiConfigStandalone = createWagmiConfig({
  chains: [celo],
  connectors: [injected({ target: "metaMask" }), injected()],
  transports: { [celo.id]: http("https://forno.celo.org") },
}) as unknown as typeof wagmiConfigPrivy;

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfigPrivy;
  }
}

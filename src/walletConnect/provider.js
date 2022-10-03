import WalletConnectProvider from "@walletconnect/web3-provider";

export const provider = new WalletConnectProvider({
  infuraId: "9aa3d95b3bc440fa88ea12eaa4456161",
});

export const providerFactory = () =>
  new WalletConnectProvider({
    infuraId: "9aa3d95b3bc440fa88ea12eaa4456161",
  });

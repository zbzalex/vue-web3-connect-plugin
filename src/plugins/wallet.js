import Vue from "vue";
import { providerFactory } from "../walletConnect/provider";
import detectEthereumProvider from "@metamask/detect-provider";
import Web3 from "web3";
import erc20 from "~/abis/erc20.json";
import BigNumber from "bignumber.js";
import manifest from "~/abis/manifest.json";

export default function (Vue_, options) {
  Vue.prototype.$wallet = new Vue({
    data: () => {
      return {
        address: null,
        chainId: 0,
        connected: false,
        balance: null,
        provider: null,
        web3: null,
      };
    },
    computed: {
      isMetaMask() {
        return this.provider.isMetaMask;
      },

      isWalletConnect() {
        return this.provider.isWalletConnect;
      },

      isTronLink() {
        return this.provider.isTronLink;
      },

      chainSymbol() {
        if (this.isTronLink) {
          return "TRX";
        }

        switch (this.web3.utils.hexToNumber(this.chainId)) {
          case 1:
          case 3:
          case 42:
          case 4:
          case 5:
            return "ETH";
          case 56:
            return "BNB";
          case 250:
            return "FTM";
          case 10000:
            return "BCH";
          case 10001:
            return "ETHW";
        }

        return "XXX";
      },
    },
    methods: {
      async autoConnect() {
        console.log("autoConnect()");

        let provider;
        if ((provider = localStorage.getItem("provider")) !== null) {
          switch (provider) {
            case "walletconnect":
              this.connectWalletConnect();
              break;
            case "mm":
              this.connectMetamask();
              break;
            case "tronlink":
              this.connectTronLink();
              break;
          }
        }
      },

      async connectMetamask() {
        console.log("connectMetamask()");
        const provider = await detectEthereumProvider();
        if (provider) {
          try {
            await provider.enable();

            provider.on("disconnect", this.disconnect);
            provider.on("accountsChanged", this.handleAccountsChanged);
            provider.on("chainChanged", this.handleChainIdChanged);

            provider
              .request({ method: "eth_requestAccounts" })
              .then(this.handleAccountsChanged);

            this.provider = provider;

            localStorage.setItem("provider", "mm");
          } catch (e) {}
        }
      },

      async disconnectMetamask() {
        this.connected = false;
        this.address = null;

        localStorage.removeItem("provider");
      },
      async connectWalletConnect() {
        console.log("connectWalletConnect()");

        const provider = providerFactory();

        try {
          await provider.enable();

          this.connected = true;

          provider.on("disconnect", this.disconnect);
          provider.on("accountsChanged", this.handleAccountsChanged);
          provider.on("chainChanged", this.handleChainIdChanged);

          this.provider = provider;

          this.address = provider.accounts[0];
          this.chainId = provider.chainId;

          localStorage.setItem("provider", "walletconnect");
        } catch (e) {}
      },

      async disconnectWalletConnect() {
        this.connected = false;
        this.address = null;

        localStorage.removeItem("provider");
      },

      async connectTronLink() {
        console.log("connectTronLink()");
        const connectToTronLinkInterval = setInterval(() => {
          if (window.tronLink) {
            console.log("tronLink found");

            clearInterval(connectToTronLinkInterval);

            let requestAccountsUuid;
            window.onmessage = (e) => {
              if (!window.tronLink || !window.tronLink.tronWeb) {
                return;
              }

              const provider = window.tronLink.tronWeb;

              Object.assign(provider, {
                isTronLink: true,
              });

              //console.log({ ...provider });

              if (!e || !e.data || !e.data.message) {
                return;
              }

              const msg = e.data.message;

              if (!msg.action) {
                return;
              }

              /// actions
              switch (msg.action) {
                /// tunnels
                case "tunnel":
                  if (msg.data.action === "request") {
                    switch (msg.data.data.method) {
                      case "tron_requestAccounts":
                        console.log("[tronLink] requestAccounts");
                        if (requestAccountsUuid || this.connected) {
                          return;
                        }

                        requestAccountsUuid = msg.data.uuid;
                        break;
                    }
                  }
                  break;
                /// accept from web
                case "connect":
                  console.log("[tronLink] connect");

                  this.connected = true;
                  this.provider = provider;

                  localStorage.setItem("provider", "tronlink");
                  break;
                case "tabReply":
                  console.log(msg);
                  if (msg.data.data.name) {
                    switch (msg.data.data.name) {
                      case "Wallet":
                        if (msg.data.isAuth) {
                          console.log("[tronLink] authorized wallet");

                          this.connected = true;
                          this.address = msg.data.data.address;
                          this.provider = provider;

                          this.syncBalance();

                          localStorage.setItem("provider", "tronlink");
                        }
                        break;
                    }
                  } else {
                    if (msg.data.uuid === requestAccountsUuid) {
                      console.log("[tronLink] reply for requestAccounts");
                      console.log("[tronLink] ", msg.data.data.message);
                      if (msg.data.data.code === 200) {
                        this.connected = true;
                        this.address = provider.defaultAddress.base58;
                        this.provider = provider;

                        this.syncBalance();

                        localStorage.setItem("provider", "tronlink");
                        // } else if (msg.data.data.code === 4001) {
                      }
                    }
                  }
                  break;
                case "setAccount":
                  console.log("[tronLink] setAccount");
                  this.address = msg.data.address;

                  this.syncBalance();
                  break;
              }

              console.log("[tronLink] request tron_requestAccounts");
            };

            window.tronLink.request({ method: "tron_requestAccounts" });
          }
        }, 50);
      },

      async syncBalance() {
        if (!this.address) {
          return;
        }

        if (this.isTronLink) {
          console.log("[tronLink] getBalance()");
          const balance = await this.provider.trx.getBalance(this.address);

          const normBalance = new BigNumber(balance).dividedBy(
            new BigNumber(10).pow(6)
          );

          console.log("[tronLink] balance = ", normBalance.toFixed());

          this.balance = normBalance.toFixed();
        } else {
          const balance = await this.web3.eth.getBalance(this.address);
          this.balance = this.web3.utils.fromWei(balance);
        }
      },

      async handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
          return;
        }
        this.address = accounts[0];
        this.balance = null;

        if (this.provider.isMetaMask) {
          this.connected = true;
          this.chainId = await this.provider.request({ method: "eth_chainId" });
        }

        this.syncBalance();
      },

      async handleChainIdChanged(chainId) {
        console.log("handleChainIdChanged()");
        console.log(chainId);
        this.chainId = chainId;
        this.balance = null;
        this.syncBalance();
      },

      disconnect() {
        this.provider = null;
        this.chainId = 0;
        this.address = null;
        this.balance = null;
        this.connected = false;

        window.onmesage = () => {}; /// void

        localStorage.removeItem("provider");
      },

      createErc20Contract(contractAddress) {
        return new this.web3.eth.Contract(erc20, contractAddress);
      },

      /// contract tx
      createErc20Transfer(contractAddress, to, amount) {
        const erc20contract = this.createErc20Contract(contractAddress);
        const r__ = erc20contract.methods.transfer(to, amount);
        return new Promise(async (r, reject) => {
          await r__
            .send({
              from: this.address,
            })
            .on("transactionHash", (hash) => {
              r();
            })
            .on("confirmation", function (confirmationNumber, receipt) {})
            .on("receipt", function (receipt) {})
            .on("error", (error, receipt) => {
              reject();
            });
        });
      },
      /// raw tx
      createTransfer(to, amount) {
        return new Promise((r, reject) => {
          this.web3.eth
            .sendTransaction({
              from: this.address,
              to,
              value: amount,
            })
            .on("transactionHash", function (hash) {
              r();
            })
            .on("receipt", function (receipt) {})
            .on("confirmation", function (confirmationNumber, receipt) {})
            .on("error", (error, receipt) => {
              reject();
            });
        });
      },
      getWeb3() {
        return this.web3;
      },
      getChainId() {
        return this.web3.utils.hexToNumber(this.chainId);
      },
      switchChain(chainId) {
        if (!this.provider) {
          return;
        }

        this.provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: this.web3.utils.toHex(chainId) }],
        });
      },

      createTronTransfer(to, amount) {
        return this.provider.trx.sendTransaction(to, amount);
      },

      async createTrc20Contract(contractAddress) {
        return await this.provider.contract().at(contractAddress);
      },

      async createTrc20Transfer(contractAddress, to, amount) {
        return (await this.createTrc20Contract(contractAddress))
          .transfer(to, amount)
          .send();
      },

      testPay(code) {
        return code in manifest ? manifest[code] : null;
      },

      isNetworkValid(code) {
        const config = this.testPay(code);
        return (
          config !== null &&
          ((config.type === "evm" &&
            (this.isMetaMask || this.isWalletConnect)) ||
            (config.type === "tron" && this.isTronLink)) &&
          this.connected
        );
      },

      pay(code, to, amount) {
        let config;
        if ((config = this.testPay(code)) === null) {
          return Promise.reject();
        }

        switch (config.type) {
          case "evm":
            /// check evm network
            if (
              (!this.isMetaMask && !this.isWalletConnect) ||
              this.getChainId() !== 1
            ) {
              this.switchChain(1);
              return Promise.reject();
            }

            if (!config.contract) {
              return this.createTransfer(
                to,
                this.web3.utils.toWei(String(amount))
              );
            } else {
              return this.createErc20Transfer(
                config.contract,
                to,
                new BigNumber(amount)
                  .multipliedBy(new BigNumber(10).pow(config.decimals))
                  .toFixed()
              );
            }
            break;
          case "tron":
            if (!this.isTronLink) {
              console.log("Please, connect TronLink");
              return Promise.reject();
            }

            if (!config.contract) {
              return this.createTronTransfer(
                to,
                new BigNumber(amount)
                .multipliedBy(new BigNumber(10).pow(config.decimals))
                .toFixed()
              );
            } else {
              return this.$wallet.createTrc20Transfer(
                config.contract,
                to,
                new BigNumber(amount)
                  .multipliedBy(new BigNumber(10).pow(config.decimals))
                  .toFixed()
              );
            }
            break;
        }
      },
    },

    watch: {
      connected(connected) {
        if (connected) {
          this.web3 = new Web3(this.provider);

          this.syncBalance();
        }
      },
    },
  });
}

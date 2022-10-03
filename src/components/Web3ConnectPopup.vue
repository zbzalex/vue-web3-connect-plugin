<template>
  <div v-if="connectPopup">
      <!-- <div class="connect-popup-overlay"></div> -->
      <div class="connect-popup">
        <div class="connect-popup--content">
          <div class="connect-popup--close" @click="close">Close</div>
          <div class="connect-popup--providers">
            <div class="connect-popup--provider" v-for="(provider, index) in providers" @click="connect(provider.provider)">
              <div class="connect-popup--provider-name">{{ provider.name }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>

<script>
export default {
  data: () => {
    return {
      connectPopup: false,
      providers: [
     	{
      		"provider": "mm",
      		"name":		"MetaMask"
      	},
      	{
      		"provider": "walletconnect",
      		"name":		"Wallet Connect"
      	},
      	{
      		"provider":	"tronlink",
      		"name":		"TronLink"
      	}
      ],
    }
  },
  methods: {
    connect(provider) {
      this.connectPopup = false

      switch (provider) {
        case "mm":
          this.$wallet.connectMetamask()
          break;
        case "walletconnect":
          this.$wallet.connectWalletConnect()
          break;
        case "tronlink":
          this.$wallet.connectTronLink()
          break;
      }
    },
    connectWallet() {
      console.log('connectWallet()')
      this.connectPopup = true
    },
    close() {
      console.log('close()')
      this.connectPopup = false
    },
  },
}
</script>

<style scoped lang="scss">
.connect-popup {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 998;
  background-color: rgba(0, 0, 0, 0.7);
}

.connect-popup--content {
  position: relative;
  width: 350px;
  max-width: 440px;
  border-radius: 5px;
  padding: 48px 20px 20px 20px;
  background-color: #ffffff;
  max-width: 420px;
  width: 100%;
  margin: 0px 5px;
  z-index: 999;
}

.connect-popup--close {
  position: absolute;
  top: 20px;
  right: 20px;
  display: inline;
  cursor: pointer;
  font-weight: 900;
  font-size: 1rem;
  text-transform: uppercase;
  color: #999999;
}

.connect-popup--providers {}

.connect-popup--provider {
  padding: 20px;
  border-bottom: 1px solid #CCCCCC;
  cursor: pointer;
}

.connect-popup--provider:hover {
  background-color: rgba(0, 0, 0, .1);
}

.connect-popup--provider-name {
  color: #989898;
  font-size: 1.5rem;
  font-weight: 900;
  text-align: center;
}

.connect-popup--provider:last-child {
  border-bottom: 0;
}
</style>

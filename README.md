# CODE-QUIZ-DAPP

https://adetayot.github.io/Code-quiz-play/

This is simple speed test application built on Celo.
It has a simple functionality, where users pay a certain fee, undergo a quick quiz, and if they're fast enough they win the rewards from the smart contract.

For this contract, the following parameters were set.
* Quiz Fee = 1 cUSD
* Reward Fee = 3 cUSD
* Reboot Time = 24 Hours
* A benchmark Score = 40 secs.

Please note: The initial idea was to get the contract award the users who had the highest scores at the end of each day without having the users depend on the admin for payment,
but seeing as I could not implement this, I had to revert to placing a benchmark score, so if the user attains this score he is automatically rewarded.
If there is a much more simpler way to achieve my goal, It will be very much appreciated.

There are also other stop gaps that should prevent malicious users from exploiting the contract
* Each user is allowed to play once within a reboot time, that starts as soon as the user commences the quiz.
* To Prevent users who cancel the quiz before the end of the quiz, they are also set to experience the reboot time limit, even though they did not complete the     quiz

Please note: A way to create more security, is by increasing the question database and so as for every new attempt, there is a randomised based selection of questions given to each user. So as to reduce the user's chance of winning the reward, if they intend on creating multiple accounts.

# Install

```

npm install

```

or 

```

yarn install

```

# Start

```

npm run dev

```

# Build

```

npm run build

```
# Usage
1. Install the [CeloExtensionWallet](https://chrome.google.com/webstore/detail/celoextensionwallet/kkilomkmpmkbdnfelcpgckmpcaemjcdh?hl=en) from the google chrome store.
2. Create a wallet.
3. Go to [https://celo.org/developers/faucet](https://celo.org/developers/faucet) and get tokens for the alfajores testnet.
4. Switch to the alfajores testnet in the CeloExtensionWallet.

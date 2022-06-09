# Fab Punk Sales Bot

A discord and twitter bot to notify of when Fab Punk NFTs have been sold,
when rare items from the collection hit the market, and when the floor price changes.

This bot should work with any Solana NFT collection of your choice

## How to use

First clone the repo to you local machine:

`gh repo clone fabric-foundation/fabpunkbot`

Then initialize the repo:

`npm init`

Create a file called ".env" and populate it with the following variables:

```
RPC_URL='YOUR RPC URL'
DISCORD_CLIENT_TOKEN='YOUR DISCORD BOTH TOKEN'
NFT_CREATOR_KEY='YOUR NFT CREATOR ACCOUNT'
```

Change the discord channel to your own channel:

`let channel = await this.discordClient.channels.fetch('YOUR CHANNEL HERE');`

Run the script:

`node index.js`

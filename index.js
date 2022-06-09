const web3 = require('@solana/web3.js');
const { Connection, programs } = require('@metaplex/js');
const axios = require('axios');

//if (!process.env.PROJECT_ADDRESS || !process.env.DISCORD_URL) {
//    console.log("Error: No environment variables set");
//    return;
//}
const solanaConnection = new web3.Connection("https://fabric.genesysgo.net", 'confirmed');
const metaplexConnection = new Connection('mainnet-beta');
const { metadata: { Metadata } } = programs;


class PunkBot {
    constructor() {
        this.pubKey = new web3.PublicKey("3hh8bFCymnULFUHKcMfQwGoF5Mt7p1pqBrUC3JHbYDiL");
        this.signatures = [];
        this.lastSignature = [];
        this.options = { };
        this.pollInterval = 1;
        this.marketplaces = [
            "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K"
        ];
        this.marketplaceNames = [
            "Magic Eden"
        ]
    }

    async getTransactions() {
        //await timer(pollInterval);
        console.log("Fetching transactions...");
        try {
            this.signatures = await solanaConnection.getSignaturesForAddress(this.pubKey, this.options);
            if(this.signatures) {
                this.lastSignature = this.signatures[0].signature;
            }
        } catch(err) {
            console.log("Error: ", err);
        }
    }

    printSale(date, price, signature, title, marketplace, imageURL) {
        console.log("-------------------------------------------");
        console.log(`Sale at ${date} ---> ${price} SOL`);
        console.log("Signature: ", signature);
        console.log("Name: ", title);
        console.log("Image: ", imageURL);
        console.log("Marketplace: ", marketplace);
    }

    async getMetadata(tokenPubKey) {
        try {
            const addr = await Metadata.getPDA(tokenPubKey)
            const resp = await Metadata.load(metaplexConnection, addr);
            const { data } = await axios.get(resp.data.data.uri);

            return data;
        } catch (error) {
            console.log("Error getting metadata: ", error)
        }
    }

    async findMarket(accounts) {
        let marketplaceAccount;

        for (var i = 0; i < this.marketplaces.length; i++) {
            if(accounts.includes(this.marketplaces[i])) {
                marketplaceAccount = this.marketplaces[i];
            }
        }
        return marketplaceAccount;
    }

    async getSale() {
        for (var i = 0; i < this.signatures.length; i++) {
            await timer(2000);
            let signature = this.signatures[(this.signatures.length - 1) - i].signature;
            let txn = await solanaConnection.getTransaction(signature);

            if (txn.meta.err == null) {

                const dateString = new Date(txn.blockTime * 1000).toLocaleString();
                let price = Math.abs((txn.meta.preBalances[0] - txn.meta.postBalances[0])) / web3.LAMPORTS_PER_SOL;
                let accounts = txn.transaction.message.accountKeys.toString();
                accounts = accounts.split(",");

                let marketplaceAccount = await this.findMarket(accounts);

                if(marketplaceAccount) {
                    let marketplace = this.marketplaces.indexOf(marketplaceAccount);

                    if (this.marketplaces.includes(marketplaceAccount)) {
                        let metadata = await this.getMetadata(txn.meta.postTokenBalances[0].mint);
                        if (metadata) {
                            await this.printSale(dateString, price, signature, metadata.name, this.marketplaceNames[marketplace], metadata.image);
                        } else {
                            console.log("Error: Couldn't get NFT metadata");
                        }
                    } else {
                        console.log("Error: Unsupported Sale/Txn");
                    }
                }
            }
        }
    }

    async run() {
        console.log("Starting bot...");
        await this.getTransactions();
        if(this.signatures) {
            await this.getSale();
        }
    }
}


let punk = new PunkBot();
punk.run();

const timer = ms => new Promise(res => setTimeout(res, ms))
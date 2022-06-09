require('dotenv').config();
const web3 = require('@solana/web3.js');
const { Connection, programs } = require('@metaplex/js');
const axios = require('axios');
const { Client, Intents, MessageEmbed } = require('discord.js');


if (!process.env.NFT_CREATOR_KEY || !process.env.DISCORD_CLIENT_TOKEN || !process.env.RPC_URL) {
    console.log("Error: No environment variables set");
    return;
}

const solanaCon = new web3.Connection(process.env.RPC_URL, 'confirmed');
const metaplexCon = new Connection('mainnet-beta');
const { metadata: { Metadata } } = programs;


class PunkBot {
    constructor() {
        this.pubKey = new web3.PublicKey(process.env.NFT_CREATOR_KEY);
        this.signatures = [];
        this.lastSignature = [];
        this.pollInterval = 3000;
        this.marketplaces = [
            "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K"
        ];
        this.marketplaceNames = [
            "Magic Eden"
        ];
        this.discordClient = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
        this.floor = 0;
    }

    async initDiscord() {
        await this.discordClient.login(process.env.DISCORD_CLIENT_TOKEN);
        console.log(`Logged in as ${this.discordClient.user.tag}!`);
    }

    async sendDiscord(date, price, signature, title, marketplace, imageURL, mint){
        let channel = await this.discordClient.channels.fetch('895211318020304917');

        const punkEmbed = new MessageEmbed()
    	.setColor('#21d7e5')
    	.setTitle(title)
    	.setURL("https://magiceden.io/item-details/" + mint)
    	.addFields(
    		{ name: 'Price', value: price + " SOL" },
            { name: 'Transaction', value: signature },
            { name: 'Mint', value: mint },
    		{ name: 'Marketplace', value: marketplace, inline: true },
    		{ name: 'Timestamp', value: date, inline: true },
    	)
    	.setImage(imageURL)
    	.setTimestamp();

        channel.send({ embeds: [punkEmbed] });
    }

    async sendDiscordFloor(color, title, imageURL, floor) {
        let channel = await this.discordClient.channels.fetch('895211318020304917');

        const punkEmbed = new MessageEmbed()
    	.setColor(color)
    	.setTitle(title)
    	.setURL("https://magiceden.io/marketplace/fab_punks")
    	.addFields(
    		{ name: 'Price', value: floor },
    	)
    	.setImage(imageURL)
    	.setTimestamp();

        channel.send({ embeds: [punkEmbed] });
    }

    async checkFloor(floor) {
        console.log("Checking floor...");
        let curFloor = Math.floor(this.floor * 100) / 100;
        let newFloor = Math.floor(floor * 100) / 100;

        if(curFloor > newFloor) {
            console.log("Punk floor is down! " + floor + " SOL");
            await this.sendDiscordFloor("#e84127", "Punk Floor is Down!", "https://c.tenor.com/lhey0DPlkiQAAAAC/rage-red-stocks.gif", String(floor));
        }
        if(curFloor < newFloor) {
            console.log("Punk floor is up! " + floor + " SOL");
            await this.sendDiscordFloor("#63f542", "Punk Floor is up!", "https://i.pinimg.com/originals/80/77/19/807719eb8b16558936fb4867ad4ffdda.gif", String(floor));
        }
    }

    async pollFloor(){
        try {
            console.log("Polling ME Floor...");
            const { data } = await axios.get("https://api-mainnet.magiceden.dev/v2/collections/fab_punks/stats");
            let floor = data.floorPrice / 1000000000;
            await this.checkFloor(floor);
            this.floor = floor;
        } catch (error) {
            console.log("Error getting ME Floor: ", error);
        }
    }

    async getTransactions() {
        await timer(this.pollInterval);
        console.log("Fetching transactions...");
        try {
            this.signatures = await solanaCon.getSignaturesForAddress(this.pubKey, { until: this.lastSignature });
            if(this.signatures.length > 0) {
                this.lastSignature = this.signatures[0].signature;

            }
        } catch(err) {
            console.log("Error: ", err);
        }
    }

    printSale(date, price, signature, title, marketplace, imageURL, mint) {
        console.log("-------------------------------------------");
        console.log(`Sale at ${date} ---> ${price} SOL`);
        console.log("Signature: ", signature);
        console.log("Mint: ", mint);
        console.log("Name: ", title);
        console.log("Image: ", imageURL);
        console.log("Marketplace: ", marketplace);
    }

    async getMetadata(tokenPubKey) {
        try {
            const addr = await Metadata.getPDA(tokenPubKey);
            const resp = await Metadata.load(metaplexCon, addr);
            const { data } = await axios.get(resp.data.data.uri);

            return data;
        } catch (error) {
            console.log("Error getting metadata: ", error);
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

    async checkFoxSnipe(address) {
        if(address == "FoXyMu5xwXre7zEoSvzViRk3nGawHUp9kUh97y2NDhcq"){
            return 1;
        } else {
            return 0;
        }
    }

    async getSale() {
        for (var i = 0; i < this.signatures.length; i++) {
            let signature = this.signatures[(this.signatures.length - 1) - i].signature;
            let txn = await solanaCon.getTransaction(signature);

            if (txn.meta.err == null) {

                const dateString = new Date(txn.blockTime * 1000).toLocaleString();
                let price = Math.abs((txn.meta.preBalances[0] - txn.meta.postBalances[0])) / web3.LAMPORTS_PER_SOL;
                let accounts = txn.transaction.message.accountKeys.toString();
                accounts = accounts.split(",");

                let marketplaceAccount = await this.findMarket(accounts);

                if(marketplaceAccount) {
                    let marketplace = this.marketplaces.indexOf(marketplaceAccount);

                    if (this.marketplaces.includes(marketplaceAccount)) {
                        let snipe = await this.checkFoxSnipe(txn.meta.postTokenBalances[0].mint);
                        let metadata = await this.getMetadata(txn.meta.postTokenBalances[snipe].mint);
                        let mint = txn.meta.postTokenBalances[snipe].mint;

                        if (metadata) {
                            await this.printSale(dateString, price, signature, metadata.name, this.marketplaceNames[marketplace], metadata.image, mint);
                            await this.sendDiscord(dateString, price, signature, metadata.name, this.marketplaceNames[marketplace], metadata.image, mint);
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
        await this.initDiscord();

        this.lastSignature = await solanaCon.getSignaturesForAddress(this.pubKey, { limit: 1 });
        this.lastSignature = this.lastSignature[0].signature;

        let i = 0;

        while(true) {
            await this.getTransactions();
            if(this.signatures) {
                await this.getSale();
            }

            i++;
            if(i == 1 || i == 300 || i == 600 || i == 900) {
                await this.pollFloor();
            }
            if(i == 1200) {
                i = 0;
            }
        }
    }
}


let punk = new PunkBot();
punk.run();

const timer = ms => new Promise(res => setTimeout(res, ms))

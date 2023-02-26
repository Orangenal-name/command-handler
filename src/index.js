const CommandHandler = require("./command-handler/CommandHandler");
const mongoose = require("mongoose");
const Cooldowns = require("./util/Cooldowns");

mongoose.set("strictQuery", false);

class Main {
  constructor({
    client,
    mongoUri,
    commandsDir,
    testServers = [],
    botOwners = [],
    cooldownConfig = {},
  }) {
    if (!client) {
      throw new Error("No client provided!");
    }

    this._testServers = testServers;
    this._botOwners = botOwners;
    this._cooldowns = new Cooldowns({ instance: this, cooldownConfig });

    if (mongoUri) {
      this.connectToMongo(mongoUri);
    } else {
      console.warn("No database provided!");
    }

    if (commandsDir) {
      this._commandHandler = new CommandHandler(this, commandsDir, client);
    } else {
      console.warn("No command directory provided!");
    }
  }

  get testServers() {
    return this._testServers;
  }

  get botOwners() {
    return this._botOwners;
  }

  get cooldowns() {
    return this._cooldowns;
  }

  get commandHandler() {
    return this._commandHandler;
  }

  connectToMongo(mongoUri) {
    mongoose.connect(mongoUri, {
      keepAlive: true,
    });
  }
}

module.exports = Main;

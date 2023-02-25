const CommandHandler = require("./command-handler/CommandHandler");
const mongoose = require("mongoose");

mongoose.set("strictQuery", false);

class Main {
  constructor({ client, mongoUri, commandsDir, testServers = [] }) {
    if (!client) {
      throw new Error("No client provided!");
    }

    this._testServers = testServers;

    if (mongoUri) {
      this.connectToMongo(mongoUri);
    } else {
      console.warn("No database provided!");
    }

    if (commandsDir) {
      new CommandHandler(this, commandsDir, client);
    } else {
      console.warn("No command directory provided!");
    }
  }

  get testServers() {
    return this._testServers;
  }

  connectToMongo(mongoUri) {
    mongoose.connect(mongoUri, {
      keepAlive: true,
    });
  }
}

module.exports = Main;

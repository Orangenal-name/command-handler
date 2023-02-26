const cooldownSchema = require("../models/cooldown-schema");

const cooldownUnits = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

const cooldownTypes = ["perUser", "perUserGuild", "perGuild", "global"];

class Cooldowns {
  /*
   *    perUser: <userId-actionId:expires>
   *    perUserGuild: <userId-guildId-actionId:expires>
   *    perGuild: <guildId:expires>
   *    global <action: expires>
   */
  _cooldowns = new Map();

  constructor({
    instance,
    errorMessage = "Please wait {TIME} before running this command again.",
    botOwnersBypass = false,
    dbRequired = 300,
  }) {
    this._instance = instance;
    this._errorMessage = errorMessage;
    this._botOwnersBypass = botOwnersBypass;
    this._dbRequired = dbRequired;

    this.loadCooldowns();
  }

  async loadCooldowns() {
    //checks if expires is less than current date0------mongoDB query, lt means less than.
    await cooldownSchema.deleteMany({ expires: { $lt: new Date() } });

    const results = await cooldownSchema.find({});

    for (const result of results) {
      const { _id, expires } = result;

      this._cooldowns.set(_id, expires);
    }
  }

  getKeyFromCooldownUsage(cooldownUsage) {
    const { cooldownType, userId, actionId, guildId } = cooldownUsage;

    return this.getKey(cooldownType, userId, actionId, guildId);
  }

  async cancelCooldown(cooldownUsage) {
    const key = this.getKeyFromCooldownUsage(cooldownUsage);

    this._cooldowns.delete(key);

    await cooldownSchema.deleteOne({ _id: key });
  }

  async updateCooldown(cooldownUsage, expires) {
    const key = this.getKeyFromCooldownUsage(cooldownUsage);

    this._cooldowns.set(key, expires)

    const now = new Date()
    const secondsDiff = (expires.getTime() - now.getTime())/1000

    if (secondsDiff > this._dbRequired) {
      await cooldownSchema.findOneAndUpdate({_id: key},{_id:key, expires},{upsert:true})
    }
  }

  verifyCooldown(duration) {
    if (typeof dur === "number") return duration;

    const split = duration.split(" ");

    if (split.length !== 2)
      throw new Error(
        `Duration "${duration}" is invalid. Please use "time unit" for example: "10 s" or "3 m"`
      );

    const quantity = +split[0];
    const type = split[1].toLowerCase();

    if (!cooldownUnits[type]) {
      throw new Error(
        `Invalid duration type "${type}. Please use one of the following: ${cooldownUnits}`
      );
    }

    if (quantity <= 0) {
      throw new Error(`Invalid quantity: ${quantity}`);
    }

    return quantity * cooldownUnits[type];
  }

  getKey(cooldownType, userId, actionId, guildId) {
    const isPerUser = cooldownType === cooldownTypes[0];
    const isPerUserGuild = cooldownType === cooldownTypes[1];
    const isPerGuild = cooldownType === cooldownTypes[2];
    const isGlobal = cooldownType === cooldownTypes[3];

    if ((isPerUserGuild || isPerGuild) && !guildId) {
      throw new Error(
        `Invalid cooldown type: "${cooldownType}" used outside of a guild`
      );
    }

    if (isPerUser) return `${userId}-${actionId}`;
    if (isPerUserGuild) return `${userId}-${guildId}`;
    if (isPerGuild) return `${guildId}`;
    if (isGlobal) return actionId;
  }

  canBypass(userId) {
    return this._botOwnersBypass && this._instance.botOwners.includes(userId);
  }

  async start({ cooldownType, userId, actionId, guildId = "", duration }) {
    if (this.canBypass(userId)) return;
    if (!cooldownTypes.includes(cooldownType))
      throw new Error(`Invalid cooldown type "${cooldownType}"`);

    const seconds = this.verifyCooldown(duration);

    const key = this.getKey(cooldownType, userId, actionId, guildId);

    const expires = new Date();
    expires.setSeconds(expires.getSeconds() + seconds);

    if (seconds >= this._dbRequired) {
      await cooldownSchema.findOneAndUpdate(
        {
          _id: key,
        },
        {
          _id: key,
          expires,
        },
        {
          //update if it already exists, insert if it does not
          upsert: true,
        }
      );
    }

    this._cooldowns.set(key, expires);
  }

  checkRun({
    cooldownType,
    userId,
    actionId,
    guildId = "",
    errorMessage = this._errorMessage,
  }) {
    if (this.canBypass(userId)) return true;

    const key = this.getKey(cooldownType, userId, actionId, guildId);
    const expires = this._cooldowns.get(key);

    if (!expires) return true;

    const now = new Date();
    if (now > expires) {
      this._cooldowns.delete(key);
      return true;
    }

    const secondsDiff = (expires.getTime() - now.getTime()) / 1000;

    const d = Math.floor(secondsDiff / (3600 * 24));
    const h = Math.floor((secondsDiff % (3600 * 24)) / 3600);
    const m = Math.floor((secondsDiff % 3600) / 60);
    const s = Math.floor(secondsDiff % 60);

    let time = "";
    if (d > 0) time += `${d}d `;
    if (h > 0) time += `${h}h `;
    if (m > 0) time += `${m}m `;
    time += `${s}s`;

    return errorMessage.replace("{TIME}", time);
  }
}

module.exports = Cooldowns;
module.exports.cooldownTypes = cooldownTypes;

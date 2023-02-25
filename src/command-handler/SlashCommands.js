const { ApplicationCommandOptionType } = require("discord.js");

class SlashCommands {
  constructor(client) {
    this._client = client;
  }

  async getCommands(guildId) {
    let commands;

    if (guildId) {
      const guild = await this._client.guilds.fetch(guildId);
      commands = guild.commands;
    } else {
      commands = this._client.application.commands;
    }

    await commands.fetch();

    return commands;
  }

  checkOptions(options, existingOptions) {
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const existing = existingOptions[i];

      if (
        option.name !== existing.name ||
        option.type !== existing.type ||
        option.description !== existing.description
      ) {
        return true;
      }
    }

    return false;
  }

  async create(name, description, options, guildId) {
    const commands = await this.getCommands(guildId);

    const existingCommand = commands.cache.find((cmd) => cmd.name === name);
    if (existingCommand) {
      const { description: exisitingDescription, options: existingOptions } =
        existingCommand;

      if (
        description !== exisitingDescription ||
        options.length !== existingOptions.length ||
        this.checkOptions(options, existingOptions)
      ) {
        commands.edit(existingCommand.id, { description, options });
      }

      return;
    }

    await commands.create({
      name,
      description,
      options,
    });
  }

  async delete(commandName, guildId) {
    const commands = await this.getCommands(guildId);

    const existingCommand = commands.cache.find(
      (cmd) => cmd.name === commandName
    );

    if (!existingCommand) {
      return;
    }

    await existingCommand.delete();
  }

  createOptions({ minArgs = 0, expectedArgs = "" }) {
    const options = [];

    if (expectedArgs) {
      const split = expectedArgs
        .substring(1, expectedArgs.length - 1)
        .split("> <");

      for (let i = 0; i < split.length; i++) {
        const arg = split[i];

        options.push({
          name: arg.toLowerCase().replace(" ", "-"),
          description: arg,
          type: ApplicationCommandOptionType.String,
          required: i < minArgs,
        });
      }
    }

    return options;
  }
}

module.exports = SlashCommands;

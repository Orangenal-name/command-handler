const path = require("path");
const { InteractionType } = require("discord.js");

const getAllFiles = require("../util/get-all-files");
const Command = require("./Command");
const SlashCommands = require("./SlashCommands");
const { cooldownTypes } = require("../util/Cooldowns");

class CommandHandler {
  // <commandName, instance of command class>
  _commands = new Map();

  _validations = this.getValidations("run-time");

  constructor(instance, commandsDir, client) {
    this._instance = instance;
    this._commandsDir = commandsDir;
    this._slashCommands = new SlashCommands(client);

    this.readFiles();
    this.interactionListener(client);
  }

  get commands() {
    return this._commands;
  }

  readFiles() {
    const defaultCommands = getAllFiles(path.join(__dirname, "./commands"));
    const files = getAllFiles(this._commandsDir);
    const validations = this.getValidations("syntax");

    for (let file of [...defaultCommands, ...files]) {
      const commandObject = require(file);

      let commandName = file.split(/[/\\]/);
      commandName = commandName.pop();
      commandName = commandName.split(".")[0];

      const command = new Command(this._instance, commandName, commandObject);

      const { description, testOnly, delete: del } = commandObject;

      if (del) {
        if (testOnly) {
          for (const guildId of this._instance.testServers) {
            this._slashCommands.delete(command.commandName, guildId);
          }
        } else {
          this._slashCommands.delete(command.commandName);
        }
        continue;
      }

      for (const validation of validations) {
        validation(command);
      }

      this._commands.set(command.commandName, command);
      const options = commandObject.options;

      if (testOnly) {
        for (const guildId of this._instance.testServers) {
          this._slashCommands.create(
            command.commandName,
            description,
            options,
            guildId
          );
        }
      } else {
        this._slashCommands.create(command.commandName, description, options);
      }
    }
  }

  //* the thing that actually handles commands

  async runCommand(command, args, interaction) {
    const { callback, cooldowns, deferReply } = command.commandObject;

    try {
      const guild = interaction.guild;
      const member = interaction.member;
      const user = interaction.user;

      const usage = {
        instance: command.instance,
        interaction,
        args,
        guild,
        member,
        user,
      };

      for (const validation of this._validations) {
        if (!(await validation(command, usage))) {
          if (interaction.replied) return "Error";
          else if (deferReply)
            interaction.editReply("There was an error executing that command.");
          else
            interaction.reply({
              content: "There was an error executing that command.",
              ephemeral: true,
            });
          return "Error";
        }
      }

      if (cooldowns) {
        let cooldownType;

        for (const type of cooldownTypes) {
          if (cooldowns[type]) {
            cooldownType = type;
            break;
          }
        }

        const cooldownUsage = {
          cooldownType,
          userId: user.id,
          actionId: `command_${command.commandName}`,
          guildId: guild?.id,
          duration: cooldowns[cooldownType],
          errorMessage: cooldowns.errorMessage,
        };

        const result = this._instance.cooldowns.checkRun(cooldownUsage);

        if (typeof result === "string") return result;

        await this._instance.cooldowns.start(cooldownUsage);

        usage.cancelCooldown = () => {
          this._instance.cooldowns.cancelCooldown(cooldownUsage);
        };

        usage.updateCooldown = (expires) => {
          this._instance.cooldowns.updateCooldown(cooldownUsage, expires);
        };
      }

      return await callback(usage);
    } catch (err) {
      console.log(err);
      if (deferReply)
        interaction.editReply("There was an error executing that command!");
      else if (!interaction.replied)
        interaction.reply("There was an error executing that command!");
      return "Error";
    }
  }

  //* interaction listener

  interactionListener(client) {
    client.on("interactionCreate", async (interaction) => {
      if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
        this.handleAutoComplete(interaction);
        return;
      }

      if (interaction.type !== InteractionType.ApplicationCommand) {
        return;
      }

      let args = []
      for (const option of interaction.options.data) {
        if (!option.options) args = [...args, String(option.value)]
        else {
          for (const suboption of option.options) {
            args = [...args, String(suboption.value)]
          }
        }
      }
      // const args = interaction.options.data.map(({ value }) => {
      //   return String(value);
      // });

      const command = this._commands.get(interaction.commandName);
      if (!command) {
        return interaction.reply({
          content:
            "That command could not be found. Please report this to Orangenal name#9280",
          ephemeral: true,
        });
      }

      const { deferReply, ephemeral } = command.commandObject;

      if (deferReply) {
        await interaction.deferReply({ ephemeral });
      }

      const response = await this.runCommand(command, args, interaction);

      if (!response) {
        return !interaction.replied
          ? interaction.reply({
              content: "There was an error executing that command",
              ephemeral: true,
            })
          : "HEHEHEHA";
      }

      if (response === "Error") return;
      if (deferReply) interaction.editReply(response).catch(() => {});
      else if (interaction.replied) return;
      else
        return interaction
          .reply({
            content: response,
            ephemeral,
          })
          .catch(() => {});
    });
  }

  async handleAutoComplete(interaction) {
    const command = this._commands.get(interaction.commandName);
    if (!command) {
      return;
    }

    const { autoComplete } = command.commandObject;

    if (!autoComplete) return;

    const focusedOption = interaction.options.getFocused(true);
    const choices = await autoComplete(
      interaction,
      command,
      focusedOption.name
    );

    const filtered = choices
      .filter((choice) =>
        choice.toLowerCase().startsWith(focusedOption.value.toLowerCase())
      )
      .slice(0, 25);

    await interaction.respond(
      filtered.map((choice) => ({ name: choice, value: choice }))
    );
  }

  getValidations(folder) {
    const validations = getAllFiles(
      path.join(__dirname, `./validations/${folder}`)
    ).map((filePath) => require(filePath));

    return validations;
  }
}

module.exports = CommandHandler;

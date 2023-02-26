const {
  PermissionFlagsBits,
  ApplicationCommandOptionType,
} = require("discord.js");
const requiredPermissions = require("../../models/required-permissions-schema");

const clearPermissions = [
  "Clear Permissions",
  "Clear Perms",
  "Clear All Permissions",
  "Clear All",
  "Clear",
];

module.exports = {
  description: "Sets the required permissions for different commands",
  deferReply: false,
  ephemeral: true,

  testOnly: false,
  //delete: true,

  guildOnly: true,
  ownerOnly: false,

  /*
      perUser
      perUserGuild
      perGuild
      global

    cooldowns: {
      perUser: "10 s",

      errorMessage:
        "You aren't patient enough. Please wait {TIME} to use this command again",
    },*/

  options: [
    {
      name: "get",
      description: "Gets the permissions of a command",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
    {
          name: "command",
          description: "The command to get the permissions of",
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true,
        },
      ],
    },
    {
      name: "set",
      description: "Sets the permissions required for a command",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "command",
          description: "The command to set the permissions of",
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true,
        },
        {
          name: "permission",
          description: "The permission to require for the command",
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true,
        },
      ],
    },
  ],

  autoComplete: (_, command, arg) => {
    if (arg === "command") {
      return [...command.instance.commandHandler.commands.keys()];
    } else if (arg === "permission") {
      return [...clearPermissions, ...Object.keys(PermissionFlagsBits)];
    }
  },

  permissions: [PermissionFlagsBits.Administrator],

  callback: async ({ instance, guild, args }) => {
    const [commandName, permission] = args;

    const command = instance.commandHandler.commands.get(commandName);
    if (!command) return `The command "/${commandName}" does not exist!`;

    const _id = `${guild.id}-${commandName}`;

    if (!permission) {
      const document = await requiredPermissions.findById(_id);

      const permissions = document ? document.permissions.join(", ") : `None.`

      return `Permissions required for "/${commandName}": ${permissions}`
    }

    if (clearPermissions.includes(permission)) {
      await requiredPermissions.deleteOne({ _id });

      return `Everyone can now use "/${commandName}"`;
    }

    const alreadyExists = await requiredPermissions.findOne({
      _id,
      permissions: {
        $in: [permission],
      },
    });

    if (alreadyExists) {
      await requiredPermissions.findOneAndUpdate(
        { _id },
        { _id, $pull: { permissions: permission } }
      );
      return `Successfully updated "/${commandName}" to no longer require the ${permission} permission`;
    }

    if (!Object.keys(PermissionFlagsBits).includes(permission)) return `Invalid permission: ${permission}`

    await requiredPermissions.findOneAndUpdate(
      { _id },
      { _id, $addToSet: { permissions: permission } },
      { upsert: true }
    );

    return `Successfully updated "/${commandName}" to require the ${permission} permission`;
  },
};

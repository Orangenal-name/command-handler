const { PermissionFlagsBits } = require("discord.js");
const requiredPermissions = require("../../../models/required-permissions-schema");

const keys = Object.keys(PermissionFlagsBits);

module.exports = async (command, usage) => {
  const { permissions = [], deferReply } = command.commandObject;
  const { member, interaction, guild } = usage;
  const cmdPerms = [...permissions];

  if (!member) return true;

  const document = await requiredPermissions.findById(
    `${guild.id}-${command.commandName}`
  );

  if (document) {
    for (const permission of document.permissions) {
      if (!permissions.includes(permission)) permissions.push(permission);
    }
  }

  console.log(permissions);

  if (permissions.length) {
    const missingPermissions = [];

    for (const permission of permissions) {
      if (
        !cmdPerms.includes(permission) &&
        !document.permissions.includes(permissions)
      )
        continue;
      if (!member.permissions.has(permission)) {
        const permissionName = keys.find(
          (key) => key === permission || PermissionFlagsBits[key] === permission
        );
        missingPermissions.push(permissionName);
      }
    }

    if (missingPermissions.length) {
      if (deferReply)
        interaction.editReply("You don't have permission to do that!");
      else
        await interaction.reply({
          content: `"You don't have permission to do that!"${missingPermissions}`,
          ephemeral: true,
        });
      return false;
    }
  }

  return true;
};

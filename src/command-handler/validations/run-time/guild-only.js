module.exports = (command, usage) => {
  const { guildOnly } = command.commandObject;
  const { guild, interaction } = usage;

  if (guildOnly === true && !guild) {
    const text = "This command can only be run inside a server!"

    if (interaction) interaction.reply(text);

    return false;
  }

  return true;
};

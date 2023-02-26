module.exports = (command) => {
    const { commandObject, commandName } = command;
    const {guildOnly, testOnly, permissions = []} = commandObject
  
    if (guildOnly !== true && testOnly !== true && permissions.length) {
      throw new Error(`Command "${commandName}" is available in DMs, but permissions are required!`);
    }
  };
  
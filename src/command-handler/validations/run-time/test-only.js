module.exports = (command, usage) => {
  const { instance, commandObject } = command;
  const { guild } = usage;

  if (commandObject.testOnly !== true) {
    return;
  }

  return instance.testServers.includes(guild?.id)
};

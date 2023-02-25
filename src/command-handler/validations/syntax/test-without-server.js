module.exports = (command) => {
  const { instance, commandName, commandObject } = command;

  if (commandObject.testOnly !== true || instance.testServers.length) {
    return;
  }

  throw new Error(`Command "${commandName}" is a test command only, but there are no test servers!`)
};

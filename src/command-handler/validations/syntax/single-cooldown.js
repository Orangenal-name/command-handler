const { cooldownTypes } = require("../../../util/Cooldowns");

module.exports = (command) => {
  const { commandObject, commandName } = command;

  if (!commandObject.cooldowns) {
    return;
  }

  let counter = 0;
  for (const type of cooldownTypes) {
    if (commandObject.cooldowns[type]) counter++;
  }

  if (counter === 0) throw new Error(`No cooldown type specified on command "${commandName}!"`);
  if (counter > 1) {
    throw new Error(`Multiple cooldown types on command "${commandName}," please specify only one!`)
  }
};

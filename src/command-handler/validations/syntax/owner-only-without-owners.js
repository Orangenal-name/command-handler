module.exports = (command) => {
    const {instance, commandName, commandObject} = command;

    if (commandObject.ownerOnly !== true || instance.botOwners.length) {
        return;
    }

    throw new Error(`Command ${commandName} is an owner only command, but no owners are configured.`)
}
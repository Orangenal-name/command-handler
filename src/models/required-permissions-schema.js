const { Schema, model, models } = require("mongoose");

const requiredPermissionsSchema = new Schema({
  _id: {
    // guildId-commandName
    type: String,
    require: true,
  },
  permissions: {
    type: [String],
    require: true,
  },
});

const name = "required-permissions";
module.exports = models[name] || model(name, requiredPermissionsSchema);
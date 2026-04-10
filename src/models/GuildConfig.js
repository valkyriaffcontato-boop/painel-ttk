const mongoose = require('mongoose');

const GuildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    supportRoleId: { type: String },
    adminRoleId: { type: String },
    ticketCategoryId: { type: String },
    logsChannelId: { type: String },
    ticketCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);

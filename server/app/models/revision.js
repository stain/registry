'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RevisionSchema = new Schema({
    //storing name as a copy of tool name for easier search
    name: String,
    description: String,
    c_version: String,
    author: String,
    json: Schema.Types.Mixed,
    version: Number,
    order: {type: Number, default: 1},
    is_public: {type: Boolean, default: false},
    app_id: { type: Schema.Types.ObjectId, ref: 'App' }
});

RevisionSchema.virtual('date')
    .get(function () {
        return this._id.getTimestamp();
    });

mongoose.model('Revision', RevisionSchema);


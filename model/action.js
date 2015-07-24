/* jslint node: true */
"use strict";

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Schema used for actions
var actionSchema = new Schema({
  user: String,
  action: String,
  queue: String,
  time: { type: Number, default: Date.now }
});

var Action = mongoose.model("Action", actionSchema);
module.exports = Action;
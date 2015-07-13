/* jslint node: true */
"use strict";

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
//-----

// Schema used for users in the queues
var userSchema = new Schema({
  name: String,
  location: String,
  startTime: { type: Number, default: Date.now },
  messages: [String],
  gettingHelp: { type: Boolean, default: false },
  action: { type: String, default: '' },
  comment: { type: String, default: '' },
  type: String,
  completion: Boolean
});

// creates a JSON-object from the schema
userSchema.methods.toJSON = function () {
  return {
    name: this.name,
    location: this.location,
    time: this.startTime,
    messages: this.messages,
    gettingHelp: this.gettingHelp,
    action: this.action,
    comment: this.comment,
    type: this.type,
    completion: this.completion
  };
};


var User = mongoose.model("User", userSchema);
module.exports = User;
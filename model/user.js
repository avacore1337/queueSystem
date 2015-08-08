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
  completion: { type: Boolean, default: false },
  badLocation: { type: Boolean, default: false }
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
    completion: this.completion,
    badLocation: this.badLocation
  };
};

// Adds a comment about the user
userSchema.methods.addMesssage = function (message) {
  this.messages.push(message);
};

// Removes all the messages about the user
userSchema.methods.removeMesssages = function () {
  this.messages = [];
};

var User = mongoose.model("User", userSchema);
module.exports = User;
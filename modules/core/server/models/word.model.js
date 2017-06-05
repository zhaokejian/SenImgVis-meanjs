'use strict';

var mongoose = require('mongoose');

var WordSchema = new mongoose.Schema({
  word: String,
  vec: [Number],
  solution: [Number],
  children: [Number],
  constructors: [],
  projections: [],
  index: Number,
  origin_constructors: [],
  colorhistogram_solution_step1: [Number],
  solution_step1: [Number],
  solution_new: [Number]
}, { collection: 'word' });

module.exports = mongoose.model('Word', WordSchema);

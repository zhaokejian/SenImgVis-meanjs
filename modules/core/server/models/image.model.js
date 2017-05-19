'use strict';

var mongoose = require('mongoose');

var ImageSchema = new mongoose.Schema({
  id: String,
  cnn_vec: [Number],
  caption: [],
  caption_vec: [Number],
  solution: [Number],
  constructors: [],
  index: Number,
  origin_constructors: [],
  colorhistogram_solution_step1: [Number],
  solution_step1: [Number]
}, {
  collection: 'image'
});

mongoose.model('Image', ImageSchema);

'use strict';

var jsonpatch = require('fast-json-patch'),
  cosine = require('compute-cosine-similarity'),
  Image = require('../models/image.model'),
  Word = require('../models/word.model');

// Gets a list of Images
exports.index = function(req, res) {
  let include_word = req.query.include_word || [],
    include_image = req.query.include_image || [];
  let exclude_word = req.query.exclude_word || [],
    exclude_image = req.query.exclude_image || [];
  let image_projection = {
    'id': 1,
    'caption_vec': 1
  };
  let word_projection = {
    'word': 1,
    'vec': 1
  };
  let data = {};
  return Image.find(null, image_projection).exec()
    .then((images) => {
      data.images = images;
      console.log('get images');
      return Word.find(null, word_projection).exec();
    })
    .then((words) => {
      data.words = words;
      console.log('get words');
      return query(data, include_word, exclude_word, include_image, exclude_image);
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

function query(data, include_word, exclude_word, include_image, exclude_image) {
  include_word = genHash(include_word);
  exclude_word = genHash(exclude_word);
  include_image = genHash(include_image);
  exclude_image = genHash(exclude_image);
  console.log('querying', include_word, exclude_word, include_image, exclude_image);
  let vec = [];
  let dist = [];
  for (let image of data.images) {
    if (include_image[image.id]) {
      plusVec(vec, image.caption_vec);
    } else if (exclude_image[image.id]) {
      minusVec(vec, image.caption_vec);
    }
  }
  for (let word of data.words) {
    if (include_word[word.word]) {
      plusVec(vec, word.vec);
    } else if (exclude_word[word.word]) {
      minusVec(vec, word.vec);
    }
  }
  console.log('compute vec');
  for (let image of data.images) {
    dist.push({
      id: image.id,
      d: 1 - cosine(vec, image.caption_vec)
    });
  }
  dist.sort((a, b) => a.d - b.d);
  console.log('select nearest');
  return dist.slice(0, 100);
}

function genHash(arr) {
  let hash = {};
  if (typeof arr === 'string') {
    arr = [arr];
  }
  for (let x of arr) {
    hash[x] = 1;
  }
  return hash;
}

function plusVec(vec, tmp) {
  if (vec.length === 0) {
    for (let i = 0; i < tmp.length; i++) {
      vec.push(tmp[i]);
    }
    return;
  }
  for (let i = 0; i < vec.length; i++) {
    vec[i] += tmp[i]
  }
}

function minusVec(vec, tmp) {
  if (vec.length === 0) {
    for (let i = 0; i < tmp.length; i++) {
      vec.push(-tmp[i]);
    }
    return;
  }
  for (let i = 0; i < vec.length; i++) {
    vec[i] -= tmp[i]
  }
}


function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if (entity) {
      return res.status(statusCode).json(entity);
    }
    return null;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
  };
}

'use strict';

var jsonpatch = require('fast-json-patch'),
    Word = require('../models/word.model'),
    keyword = require('../resource/keyword');
// import jsonpatch from 'fast-json-patch';
// import Word from './word.model';
// import keyword from '../project/keyword';

function IsKeyword() {
  let hash = {};
  keyword.forEach(d => hash[d] = 1);
  return function(word) {
    return hash[word];
  };
}

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if(entity) {
      return res.status(statusCode).json(entity);
    }
    return null;
  };
}

function patchUpdates(patches) {
  return function(entity) {
    try {
      jsonpatch.apply(entity, patches, /*validate*/ true);
    } catch(err) {
      return Promise.reject(err);
    }

    return entity.save();
  };
}

function removeEntity(res) {
  return function(entity) {
    if(entity) {
      return entity.remove()
        .then(() => {
          res.status(204).end();
        });
    }
  };
}

function handleEntityNotFound(res) {
  return function(entity) {
    if(!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
    res.status(statusCode).send(err);
  };
}

// Gets a list of Words
exports.index = function(req, res) {
  let projection = { '_id': 0, 'word': 1, 'solution': 1, 'index': 1 };
  let isKeyword = IsKeyword();
  return Word.find(null, projection).exec()
    .then(entity => {
      // Filter by specified keywords
      return entity.filter(d => isKeyword(d.word));
      // return entity;
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single image from the DB
exports.show = function(req, res) {
  let id = req.params.id;
  let filter = { 'word': req.params.id };
  let projection = { 'word': 1, 'constructors': 1, 'children': 1, 'index': 1 };
  console.log('id:', id);
  return Word.find(filter, projection).exec()
    .then(function(data) {
      console.log(data[0].constructors);
      console.log(data[0].children);
      return data;
    })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

exports.getChildren = function(req, res) {
  let projection = { 'word': 1, 'origin_constructors': 1, 'children': 1, 'index': 1 };
  console.log('children');
  return Word.find(null, projection).exec()
    .then(function(word) {
      word.sort((a, b) => a.index - b.index);
      word = word.map(d => {
        return { _id: d._id, constructors: d.origin_constructors, children: [] };
      });
      for (let i = 0; i < word.length; i++) {
        let constructors = word[i].constructors;
        for (let parent of constructors) {
          let index = parent.index;
          word[index].children.push(i);
        }
      }
      updateWordChildren(word);
      return word;
    })
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

function updateWordChildren(words) {
  console.log(words[0]);
  for (let d of words) {
    Word.findByIdAndUpdate(d._id, { $set: { 'children': d.children } }, function (error) {
      if (error) console.log(error);
    });
  }
}

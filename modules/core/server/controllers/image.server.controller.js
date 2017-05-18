'use strict';

// import jsonpatch from 'fast-json-patch';
// import Image from './image.model';
var jsonpatch = require('fast-json-patch'),
    Image = require('../models/image.model');

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

// Gets a list of Images
export function index(req, res) {
  let projection = { '_id': 0, 'id': 1, 'solution': 1, 'caption': 1, 'index': 1 };
  return Image.find(null, projection).exec()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

// Gets a single image from the DB
export function show(req, res) {
  let filter = { 'id': req.params.id };
  let projection = { 'id': 1, 'constructors': 1 };
  return Image.find(filter, projection).exec()
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

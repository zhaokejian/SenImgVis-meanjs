'use strict';

var jsonpatch = require('fast-json-patch'),
    Xto2d = require('./project.server.service'),
    reconstruct = require('./reconstruct.server.service'),
    keyword = require('../../resource/keyword'),
    Image = require('../../models/image.model'),
    Word = require('../../models/word.model');

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

exports.DefaultProjection = function(req, res) {
  let image_projection = { 'id': 1, 'origin_constructors': 1, 'caption': 1, 'index': 1, 'solution': 1 };
  let word_projection = { 'word': 1, 'origin_constructors': 1, 'index': 1, 'solution': 1 };
  let data = {};
  console.time('find Image in DefaultProjection');
  return Image.find(null, image_projection).exec()
    .then((image) => {
      console.timeEnd('find Image in DefaultProjection');
      data.image = image;
      console.time('find Word in DefaultProjection');
      return Word.find(null, word_projection).exec();
    })
    .then((word) => {
      console.timeEnd('find Word in DefaultProjection');
      data.word = word;
      return data;
    })
    .then((data) => {
      console.time('sort & map in DefaultProjection');
      data.image.sort((a, b) => a.index - b.index);
      data.word.sort((a, b) => a.index - b.index);
      let imageConstructors = data.image.map(d => d.origin_constructors);
      let wordConstructors = data.word.map(d => d.origin_constructors);
      console.timeEnd('sort & map in DefaultProjection');
      let result = {};
      result.image = data.image.map((d, i) => {
        return { _id: d._id, id: d.id, caption: d.caption, constructors: imageConstructors[i], solution: d.solution };
      });
      result.word = data.word.map((d, i) => {
        return { _id: d._id, word: d.word, constructors: wordConstructors[i], solution: d.solution };
      });
      // reset the constructors
      updateWord(result.word);
      updateImage(result.image);
      return result;
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
};

exports.LowProjection = function(req, res) {
  let image_projection = { 'id': 1, 'origin_constructors': 1, 'caption': 1, 'index': 1, 'colorhistogram_solution_step1': 1 };
  let word_projection = { 'word': 1, 'origin_constructors': 1, 'index': 1, 'colorhistogram_solution_step1': 1 };
  let data = {};
  return Image.find(null, image_projection).exec()
    .then((image) => {
      data.image = image;
      return Word.find(null, word_projection).exec();
    })
    .then((word) => {
      data.word = word;
      return data;
    })
    .then((data) => {
      data.image.sort((a, b) => a.index - b.index);
      data.word.sort((a, b) => a.index - b.index);
      let imageConstructors = data.image.map(d => d.origin_constructors);
      let wordConstructors = data.word.map(d => d.origin_constructors);
      let result = {};
      result.image = data.image.map((d, i) => {
        return { _id: d._id, id: d.id, caption: d.caption, constructors: imageConstructors[i], solution: d.colorhistogram_solution_step1 };
      });
      result.word = data.word.map((d, i) => {
        return { _id: d._id, word: d.word, constructors: wordConstructors[i], solution: d.colorhistogram_solution_step1 };
      });
      updateWord(result.word);
      updateImage(result.image);
      console.log(Object.keys(result));
      return result;
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
};

exports.CnnProjection = function(req, res) {
  let image_projection = { 'id': 1, 'origin_constructors': 1, 'caption': 1, 'index': 1, 'solution_step1': 1 };
  let word_projection = { 'word': 1, 'origin_constructors': 1, 'index': 1, 'solution_step1': 1 };
  let data = {};
  return Image.find(null, image_projection).exec()
    .then((image) => {
      data.image = image;
      return Word.find(null, word_projection).exec();
    })
    .then((word) => {
      data.word = word;
      return data;
    })
    .then((data) => {
      data.image.sort((a, b) => a.index - b.index);
      data.word.sort((a, b) => a.index - b.index);
      let imageConstructors = data.image.map(d => d.origin_constructors);
      let wordConstructors = data.word.map(d => d.origin_constructors);
      let result = {};
      result.image = data.image.map((d, i) => {
        return { _id: d._id, id: d.id, caption: d.caption, constructors: imageConstructors[i], solution: d.solution_step1 };
      });
      result.word = data.word.map((d, i) => {
        return { _id: d._id, word: d.word, constructors: wordConstructors[i], solution: d.solution_step1 };
      });
      updateWord(result.word);
      updateImage(result.image);
      return result;
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
};

exports.ReconstructWord = function(req, res) {
  let word = req.params.word;
  let query = req.query;
  if (query.parents) {
    if (query.parents instanceof Array) {
      query.constructors = query.parents.map(d => JSON.parse(d));;
    }
    else {
      query.constructors = [query.parents].map(d => JSON.parse(d));;
    }
    console.log('reconstruct', query.text, 'parent', query.constructors);
  }
  else {
    console.log('reconstruct', query.text, 'parent', 'none');
    query.constructors = [];
  }
  let image_projection = { 'id': 1, 'solution_step1': 1, 'constructors': 1, 'caption': 1, 'index': 1 };
  let word_projection = { 'word': 1, 'solution_step1': 1, 'constructors': 1, 'projections': 1, 'index': 1 };
  // let isKeyword = IsKeyword();
  let data = {};
  return Image.find(null, image_projection).exec()
    .then((image) => {
      data.image = image;
      return Word.find(null, word_projection).exec();
    })
    .then((word) => {
      data.word = word;
      return data;
    })
    .then((data) => {
      data.image.sort((a, b) => a.index - b.index);
      data.word.sort((a, b) => a.index - b.index);
      let wordIndex;
      let hash = {};
      for (let i = 0; i < data.word.length; i++) {
        if (data.word[i].word === query.text)
          wordIndex = i;
      }
      console.log(wordIndex);
      let wordProjections = data.word.map(d => d.projections);
      let imageConstructors = data.image.map(d => d.constructors);
      let wordConstructors = data.word.map(d => d.constructors);
      wordConstructors[wordIndex] = query.constructors;
      let result = {};
      result.image = data.image.map((d, i) => {
        return { _id: d._id, id: d.id, caption: d.caption, constructors: imageConstructors[i] };
      });
      result.word = data.word.map((d, i) => {
        return { _id: d._id, word: d.word, constructors: wordConstructors[i] };
      });

      let newsolution = reconstruct.reconstructWord(wordConstructors, imageConstructors, wordProjections);
      for (let i = 0; i < newsolution.image.length; i++) {
        result.image[i].solution = newsolution.image[i];
        if (!newsolution.image[i]) console.log(i);
      }
      for (let i = 0; i < newsolution.word.length; i++) {
        result.word[i].solution = newsolution.word[i];
      }
      updateWord(result.word);
      return result;
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

exports.ReconstructImage = function(req, res) {
  let query = req.query;
  if (query.parents) {
    if (query.parents instanceof Array) {
      query.constructors = query.parents.map(d => JSON.parse(d));
    }
    else {
      query.constructors = [query.parents].map(d => JSON.parse(d));;
    }
    console.log('reconstruct', query.id, 'parent', query.constructors);
  }
  else {
    console.log('reconstruct', query.id, 'parent', 'none');
    query.constructors = [];
  }
  let image_projection = { 'id': 1, 'constructors': 1, 'caption': 1, 'index': 1 };
  let word_projection = { 'word': 1, 'constructors': 1, 'solution_new': 1, 'index': 1 };
  // let isKeyword = IsKeyword();
  let data = {};
  return Image.find(null, image_projection).exec()
    .then((image) => {
      data.image = image;
      return Word.find(null, word_projection).exec();
    })
    .then((word) => {
      data.word = word;
      return data;
    })
    .then((data) => {
      data.image.sort((a, b) => a.index - b.index);
      data.word.sort((a, b) => a.index - b.index);
      let imageIndex;
      let hash = {};
      for (let i = 0; i < data.image.length; i++) {
        if (data.image[i].id === query.id)
          imageIndex = i;
      }
      console.log(imageIndex);
      let wordPositions = data.word.map(d => d.solution_new);
      console.log("wordPositions in reConstructImage");
      console.log(wordPositions);
      let imageConstructors = data.image.map(d => d.constructors);
      let wordConstructors = data.word.map(d => d.constructors);
      imageConstructors[imageIndex] = query.constructors;
      let result = {};
      result.image = data.image.map((d, i) => {
        return { _id: d._id, id: d.id, caption: d.caption, constructors: imageConstructors[i] };
      });
      result.word = data.word.map((d, i) => {
        return { _id: d._id, word: d.word, constructors: wordConstructors[i] };
      });
      updateImage(result.image);
      // let newsolution = reconstruct.reconstructWord(wordConstructors, imageConstructors, wordProjections);
      let newsolution = reconstruct.reConstructImage(wordPositions, imageConstructors);
      for (let i = 0; i < newsolution.image.length; i++) {
        result.image[i].solution = newsolution.image[i];
        if (!newsolution.image[i]) console.log(i);
      }
      for (let i = 0; i < newsolution.word.length; i++) {
        result.word[i].solution = newsolution.word[i];
      }
      return result;
    })
    .then(respondWithResult(res))
    .catch(handleError(res));
}

function updateImage(images) {
  for (let d of images) {
    Image.findByIdAndUpdate(d._id, { $set: { 'constructors': d.constructors } }, function (error) {
      if (error) console.log(error);
    });
  }
}
function updateWord(words) {
  for (let d of words) {
    Word.findByIdAndUpdate(d._id, { $set: { 'constructors': d.constructors, 'solution_new': d.solution } }, function (error) {
      if (error) console.log(error);
    });
  }
  console.log("updateWord");
}

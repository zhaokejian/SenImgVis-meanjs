(function() {
  'use strict';

  // Create the Socket.io wrapper service
  angular
    .module('core')
    .factory('databese', database);

  // database.$inject = [$rootScope];

  // Return a function to search word
  let SearchWord = function(words) {
    let word2id = {};
    words.forEach((d, i) => {
      word2id[d.word] = i;
    });
    return function(word) {
      if (!word2id.hasOwnProperty(word)) return;
      return words[word2id[word]];
    };
  };

  // Return a function to search image
  let SearchImage = function(images) {
    let image2id = {};
    images.forEach((d, i) => {
      image2id[d.id] = i;
    });
    return function(id) {
      if (!image2id.hasOwnProperty(id)) return;
      return images[image2id[id]];
    };
  };

  function database() {
    let images, words;
    let database = {};
    let searchImage, searchWord;
    database.configure = function(data) {
      images = data.image;
      words = data.word;
      searchImage = SearchImage(images);
      searchWord = SearchWord(words);
    }
    database.searchImage = function(ids) {
      let result = [];
      for (let id of ids) {
        result.push(searchImage(id));
      }
      return result.filter(d => d != undefined);
    };
    database.searchWord = function(words) {
      let result = [];
      for (let word of words) {
        result.push(searchWord(word));
      }
      return result.filter(d => d != undefined);
    }
    return database;
  }
}());

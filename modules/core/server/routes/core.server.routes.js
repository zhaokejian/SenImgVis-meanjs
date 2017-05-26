'use strict';

module.exports = function(app) {
  // Root routing
  var core = require('../controllers/core.server.controller'),
      project = require('../controllers/project/project.server.controller'),
      image = require('../controllers/image.server.controller'),
      word = require('../controllers/word.server.controller'),
      search = require('../controllers/search.server.controller');

  // project api
  app.route('/api/project/').get(project.DefaultProjection);
  app.route('/api/project/lowstep1').get(project.LowProjection);
  app.route('/api/project/cnnstep1').get(project.CnnProjection);
  app.route('/api/project/word/:word').get(project.ReconstructWord);
  app.route('/api/project/image/:id').get(project.ReconstructImage);

  // image api
  app.route('/api/image/').get(image.index);
  app.route('/api/image/:id').get(image.show);

  // word api
  app.route('/api/word/').get(word.index);
  app.route('/api/word/:id').get(word.show);
  app.route('/api/word/children/construct').get(word.getChildren);

  //search api
  app.route('/api/search/').get(search.index);

  // Define error pages
  app.route('/server-error').get(core.renderServerError);

  // Return a 404 for all undefined api, module or lib routes
  app.route('/:url(api|modules|lib)/*').get(core.renderNotFound);

  // Define application route
  app.route('/*').get(core.renderIndex);
};

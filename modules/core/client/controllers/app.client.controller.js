(function(app) {
  'use strict';

  class AppController {
    constructor($scope, $http, event, database) {
      this.$http = $http;
      this.event = event;
      this.database = database;
      this.$scope = $scope;
      this.level = 0;
      this.scale = 1;
      this.offset = [0, 0];
      this.transition = [];
      this.query = {
        keywords: [
          ['Cat', 'plus'],
          ['Dog', 'plus'],
          ['Boy', 'plus']
        ],
        keyimages: []
      };
      this.locateText = '';

      $scope.$safeApply = function(fn) {
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest')
          this.$eval(fn);
        else
          this.$apply(fn);
      };
    }

    $onInit() {
      let msg = {};
      console.log('success');
      console.time('http_get::/api/project/');
      this.$http.get('/api/project/')
        .then(response => {
          console.timeEnd('http_get::/api/project/');
          msg = response.data;
          console.log(msg);
          if (msg.image && msg.word) {
            this.event.emit(this.event.DATASETCHANGED, msg);
            this.database.configure(msg);
            this.msg = msg;
          }
        });
    }
  }

  angular
    .module(app.applicationModuleName)
    .controller('AppController', ['$scope','$http', 'event', 'database', AppController]);

}(ApplicationConfiguration));

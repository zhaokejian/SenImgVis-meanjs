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
      // this.$http.get('/api/project')
      //   .then(response => {
      //     msg = response.data;
      //     console.log(msg);
      //     if (msg.image && msg.word) {
      //       this.event.emit(this.event.DATASETCHANGED, msg);
      //       this.database.configure(msg);
      //       this.msg = msg;
      //     }
      //   });
    }

    // expand() {
    //   let self = this;
    //   let pre = this.level;
    //   self.level = Math.min(self.level + 1, 50);
    //   if (pre === this.level) return;
    //   self.$scope.$safeApply(function() {
    //     self.scale = (self.level * 0.5) + 1;
    //   });
    //   console.log('expand');
    // }
    //
    // contract() {
    //   let self = this;
    //   let pre = this.level;
    //   self.level = Math.max(self.level - 1, 0);
    //   if (pre === this.level) return;
    //   self.$scope.$safeApply(function() {
    //     self.scale = (self.level * 0.5) + 1;
    //   });
    //   console.log('contract');
    // }
    //
    // move(dx, dy) {
    //   let self = this;
    //   self.$scope.$safeApply(function() {
    //     self.offset = [
    //       self.offset[0] + (dx / self.scale),
    //       self.offset[1] + (dy / self.scale)
    //     ]
    //   });
    //   // console.log('move', self.offset);
    // }
    //
    // deleteQuery(index, type) {
    //   let self = this;
    //   if (type === 'word') {
    //     self.query.keywords.splice(index, 1);
    //   } else {
    //     self.query.keyimages.splice(index, 1);
    //   }
    // }
    //
    // switchAction = function(index, type) {
    //   let self = this;
    //   let data = type === 'word' ? self.query.keywords[index] : self.query.keyimages[index];
    //   if (data[1] === 'plus')
    //     data[1] = 'minus';
    //   else
    //     data[1] = 'plus';
    // }
    //
    // locateTo = function(word) {
    //   this.locateText = word;
    //   console.log('locate', this.locateText);
    // }

  }

  angular
    .module(app.applicationModuleName)
    .controller('AppController', ['$scope','$http', 'database', 'myevent', AppController]);

}(ApplicationConfiguration));

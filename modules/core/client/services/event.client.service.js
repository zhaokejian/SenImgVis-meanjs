(function(app) {
  'use strict';

  angular
    .module(app.applicationModuleName)
    .factory('event', ['$rootScope', function($rootScope) {
      let event = {};
      event.emit = function(evt, msg) {
        $rootScope.$broadcast(evt, msg);
      };
      event.on = function(scope, evt, callback) {
        scope.$on(evt, function(_, msg) {
          callback(msg);
        });
      };
      let addEvent = function(evt) {
        let uppercaseEvt = evt.toUpperCase();
        event[uppercaseEvt] = evt;
      };

      addEvent('datasetChanged');
      addEvent('showimageChanged');
      addEvent('searchKeyword');
      addEvent('searchImage');
      addEvent('specifyKeyimage');
      addEvent('specifyKeyword');
      addEvent('showReconstruct');
      addEvent('SHOWIMAGECONSTRUCTOR');
      addEvent('SEMANTICQUERYRESULT');

      return event;
    }]);
}(ApplicationConfiguration));

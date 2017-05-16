(function(app) {
  'use strict';

  angular
    .module(app.applicationModuleName)
    .factory('myevent', [$rootScope, function myevent($rootScope) {
      let myevent = {};
      myevent.emit = function(evt, msg) {
        $rootScope.$broadcast(evt, msg);
      };
      myevent.on = function(scope, evt, callback) {
        scope.$on(evt, function(_, msg) {
          callback(msg);
        });
      };
      let addEvent = function(evt) {
        let uppercaseEvt = evt.toUpperCase();
        myevent[uppercaseEvt] = evt;
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

      return myevent;
    }]);
}(ApplicationConfiguration));

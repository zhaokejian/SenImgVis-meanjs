(function(app){

'use strict';

function expandBrowser(browser) {
  browser.classed('close-browser', false);
  browser.classed('expand-browser', true);
}

function closeBrowser(browser) {
  browser.classed('expand-browser', false);
  browser.classed('close-browser', true);
}

angular
  .module(app.applicationModuleName)
  .directive('browser', ['event', 'browserCtrl', function(event, Browser) {
    return {
      restrict: 'E',
      templateUrl: '/modules/core/client/templates/browser.template.html',
      link: function(scope, element, attrs) {
        let base = "http://10.76.2.57:8000/";
        scope.base = base;
        scope.imageBuckets = [];
        scope.thumbnails = [];
        scope.imageIndex = 0;
        scope.imagesrc = '';
        scope.caption = '';
        scope.closing = 1;
        scope.arrowStyle = {};
        scope.safeApply = function (fn) {
          var phase = this.$root.$$phase;
          if (phase == '$apply' || phase == '$digest')
            this.$eval(fn);
          else
            this.$apply(fn);
        };
        scope.leftclick = function () {
          scope.imageIndex-=1;
          if (scope.imageIndex < 0)
            scope.imageIndex = scope.imageBuckets.length - 1;
          let data = scope.imageBuckets[scope.imageIndex];
          let image = new Image();
          image.src = base + data.id;
          image.onload = function () {
            scope.safeApply(function () {
              scope.imagesrc = base + data.id;
              scope.caption = data.caption[0];
              scope.closing = 0;
              scope.arrowStyle = { 'top': (image.height / 2) + 'px' };
            });
            expandBrowser(container);
          };
        };
        scope.rightclick = function () {
          scope.imageIndex += 1;
          if (scope.imageIndex > scope.imageBuckets.length - 1)
            scope.imageIndex = 0;
          let data = scope.imageBuckets[scope.imageIndex];
          let image = new Image();
          image.src = base + data.id;
          image.onload = function () {
            scope.safeApply(function () {
              scope.imagesrc = base + data.id;
              scope.caption = data.caption[0];
              scope.closing = 0;
              scope.arrowStyle = { 'top': (image.height / 2) + 'px' };
            });
            expandBrowser(container);
          };
        };
        scope.clickImage = function() {
          let data = scope.imageBuckets[scope.imageIndex];
          event.emit(event.SEARCHIMAGE, { id: data.id });
          event.emit(event.SPECIFYKEYIMAGE, {id: data.id, image: data});
        };
        let container = d3.select(element[0]);
        let expand = container.select('.expand');
        let close = container.select('.close');
        expand.on('click', function() {
          expandBrowser(container);
          scope.safeApply(function() {
            scope.closing = 0;
          });
        });
        close.on('click', function() {
          closeBrowser(container);
          scope.safeApply(function () {
            scope.closing = 1;
          });
        });
        // New data
        event.on(scope, event.SHOWIMAGECHANGED, function(msg) {
          // console.log(msg);
          if(!msg || !msg[0]) return;
          scope.imageIndex = 0;
          let data = msg[scope.imageIndex];
          scope.imageBuckets = [msg[0]];
          let image = new Image();
          image.src = base + data.id;
          image.onload = function () {
            scope.safeApply(function () {
              scope.imagesrc = base + data.id;
              scope.caption = data.caption[0];
              scope.closing = 0;
              scope.arrowStyle = { 'top': (image.height / 2) + 'px' };
            });
            expandBrowser(container);
          };
        });
        event.on(scope, event.SEMANTICQUERYRESULT, function(images) {
          console.log(images);
          scope.imageBuckets = images;
          scope.imageIndex = 0;
          let data = images[scope.imageIndex];
          let image = new Image();
          image.src = base + data.id;
          image.onload = function () {
            scope.safeApply(function () {
              scope.imagesrc = base + data.id;
              scope.caption = data.caption[0];
              scope.closing = 0;
              scope.arrowStyle = { 'top': (image.height / 2) + 'px' };
            });
            expandBrowser(container);
          };
        });
      }
    }
  }]);

}(ApplicationConfiguration));

(function(app) {
  'use strict';

  angular.module(app.applicationModuleName)
    .directive('starry', ['event', '$timeout', '$http', 'starryCtrl', 'interaction',
      function(event, $timeout, $http, starry, Interaction) {
        let assignStyle = function(dom, style) {
          let keys = Object.keys(style);
          for (let n of keys) {
            dom.style[n] = style[n];
          }
        };

        let assignAttr = function(dom, attr) {
          let keys = Object.keys(attr);
          let node = d3.select(dom);
          for (let n of keys) {
            node.attr(n, attr[n]);
          }
        };

        return {
          restrict: 'E',
          templateUrl: '/modules/core/client/templates/starry.template.html',
          link: function(scope, element, attrs) {
            let root = d3.select(element[0]);
            let backcanvas = d3.select(element[0]).select('#starry-background-canvas');
            let forecanvas = d3.select(element[0]).select('#starry-canvas');
            let svg = d3.select(element[0]).select('#starry-svg');
            let exportCallback = function(msg) {
              if (msg.clickimage) {//click image in solar
                event.emit(event.SHOWIMAGECHANGED, [msg.image]);//show image in browser
                event.emit(event.SPECIFYKEYIMAGE, msg);
              }
              if (msg.showReconstruct) {
                return $http({
                  url: '/api/word/' + msg.word,
                  method: "GET"
                }).then(response => {
                  let data = response.data[0];
                  let word = msg.word;
                  let children = data.children;
                  let constructors = data.constructors;
                  let util = starry.interfaces();
                  children = children.map(util.getWordByIndex);
                  constructors = constructors.map(d => {
                    let word = util.getWordByIndex(d.index);
                    d.word = word.word;
                    return d;
                  });
                  event.emit(event.SHOWRECONSTRUCT, {
                    children,
                    constructors,
                    word
                  });
                  return data;
                });
              }
              if (msg.reconstructword) {
                console.log(msg.reconstructword);
              }
            };
            assignStyle(backcanvas.node(), {
              backgroundColor: '#000'
            });
            assignStyle(forecanvas.node(), {
              backgroundColor: 'rgb(0,0,0,0)'
            });
            assignStyle(svg.node(), {
              backgroundColor: 'rgb(0,0,0,0)'
            });
            // Assign width and height of canvas
            assignAttr(backcanvas.node(), {
              width: backcanvas.node().clientWidth,
              height: backcanvas.node().clientHeight
            });
            assignAttr(forecanvas.node(), {
              width: forecanvas.node().clientWidth,
              height: forecanvas.node().clientHeight
            });
            assignAttr(svg.node(), {
              width: svg.node().clientWidth,
              height: svg.node().clientHeight
            });
            // New data, $onInit
            event.on(scope, event.DATASETCHANGED, function(msg) {
              starry.configure({
                data: msg,
                width: forecanvas.node().clientWidth,
                height: forecanvas.node().clientHeight,
                backcanvas: backcanvas,
                forecanvas: forecanvas,
                svg: svg
              });
              starry.init();
              starry.genVirtualElements();
              starry.genInterfaces(exportCallback);
              starry.renderInit();
            });
            // New search keyword
            event.on(scope, event.SEARCHKEYWORD, function(msg) {
              let util = starry.interfaces();
              // console.log(msg);
              starry.jumpToWord(msg, svg);
            });
            // New search image
            event.on(scope, event.SEARCHIMAGE, function(msg) {
              let util = starry.interfaces();
              // console.log(msg);
              starry.jumpToImage(msg, svg);
            });

            //click svg emitter (choose image point)
            let emitter = (d) => {
              event.emit(event.SHOWIMAGECHANGED, d);
              if (!d[0]) return;
              $http({
                url: '/api/image/' + d[0].id,//get one image
                method: "GET"
              }).then(response => {
                let msg = response.data;
                let data = msg[0];
                let util = starry.interfaces();
                let constructors = data.constructors.map(d => {
                  let word = util.getWordByIndex(d.index);
                  d.word = word.word;
                  return d;
                });
                let id = data.id;
                event.emit(event.SHOWIMAGECONSTRUCTOR, {//show image constructor in searchinterface
                  constructors,
                  id
                });
                return msg;
              });
            };
            svg.call(Interaction.svg.ondrag, starry);
            svg.call(Interaction.svg.onclick, starry, emitter);
            svg.call(Interaction.svg.onmousewheel, starry);
          }
        };
      }
    ]);
}(ApplicationConfiguration))

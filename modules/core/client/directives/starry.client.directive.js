(function(app) {
  'use strict';

  // import angular from 'angular';
  // import * as d3 from 'd3';


  // import Starry from './starry.service';
  // import listenerManager from '../../util/listener';
  // import Interaction from './interaction.service';

  angular.module(app.applicationModuleName)
    .directive('starry', ['event', '$timeout', '$http', 'starryCtrl', 'listener', 'interaction',
      function(event, $timeout, $http, starry, listener, Interaction) {
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

        let draggable = function(dom, config) {
          let top, left;
          let start = [];
          listener.addEventListener(dom, 'ondragstart', (e) => {
            start = [e.x, e.y];
            top = parseInt(dom.style.top);
            left = parseInt(dom.style.left);
          });
          listener.addEventListener(dom, 'ondrag', (e) => {
            let style = {};
            style.top = (top + e.y - start[1]) + 'px';
            style.left = (left + e.x - start[0]) + 'px';
            assignStyle(dom, style);
          });
          listener.addEventListener(dom, 'ondragend', (e) => {
            let style = {};
            style.top = (top + e.y - start[1]) + 'px';
            style.left = (left + e.x - start[0]) + 'px';
            assignStyle(dom, style);
          });
        };

        let addCanvas = function(root, config) {
          console.log(config);
          let canvas = root.append('canvas')
            .classed('add-canvas', true);
          assignAttr(canvas.node(), config.attr);
          assignStyle(canvas.node(), config.style);
          listener.addEventListener(canvas.node(), 'ondblclick', () => {
            canvas.remove();
            listener.deleteDom(canvas.node());
            console.log('remove canvas');
          });
          draggable(canvas.node());
          return canvas;
        };

        let configGenerator = function(name) {
          if (name === 'detailcanvas') {
            return function(p) {
              let config = {
                attr: {},
                style: {}
              };
              config.attr.width = 200;
              config.attr.height = 200;
              config.attr.draggable = true;
              config.style.left = (p[0] - config.attr.width / 2) + 'px';
              config.style.top = (p[1] - config.attr.height / 2) + 'px';
              config.style.backgroundColor = '#fff';
              return config;
            };
          }
        };

        let MultiLevelManager = function(layer1, deepest = 2) {
          let _layers = [layer1];
          let _current = 1;
          return {
            current: () => {
              return _current;
            },
            zoomIn: (d) => {
              if (_current >= deepest) return false;
              _current++;
              _layers.push(d);
              return true;
            },
            zoomOut: () => {
              if (_current === 1) return false;
              _current--;
              _layers.pop();
              return true;
            },
            data: () => {
              return _layers[_current];
            }
          };
        };

        let WheelManager = function(deepest = 3) {
          let _levels = 1;
          return {
            current: () => {
              return _levels;
            },
            zoomIn: () => {
              if (_levels < deepest) {
                _levels += 1;
                return true;
              }
              return false;
            },
            zoomOut: () => {
              if (_levels > 1) {
                _levels -= 1;
                return true;
              }
              return false;
            }
          };
        };

        let AnimationManager = function($timeout) {
          let _animations = new Map();
          let _cancel = function(animations) {
            for (let animation of animations) {
              $timeout.cancel(animation);
            }
          };
          return {
            setAnimation: function(name, animations, duration, delay = 0) {
              let promises = [];
              let len = animations.length;
              for (let i = 1; i <= len; i++) {
                let promise = (function() {
                  return $timeout(animations[i - 1], delay + ((i / len) * duration), false);
                }());
                promises.push(promise);
              }
              _animations.set(name, promises);
            },
            cancelAnimation: function(name) {
              if (_animations.has(name)) {
                let promises = _animations.get(name);
                _cancel(promises);
                _animations.delete(name);
              }
              return true;
            }
          };
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
              if (msg.clickimage) {
                event.emit(event.SHOWIMAGECHANGED, [msg.image]);
                event.emit(event.SPECIFYKEYIMAGE, msg);
              }
              if (msg.dblclickword) {
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
            // New data
            event.on(scope, event.DATASETCHANGED, function(msg) {
              starry.clear(forecanvas.node());
              starry.clear(backcanvas.node());
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
              // starry.computeGroups();
              starry.genInterfaces(exportCallback);
              starry.renderInit();
            });
            // New search keyword
            event.on(scope, event.SEARCHKEYWORD, function(msg) {
              let util = starry.interfaces();
              console.log(msg);
              starry.jumpToWord(msg, svg);
            });
            // New search image
            event.on(scope, event.SEARCHIMAGE, function(msg) {
              let util = starry.interfaces();
              console.log(msg);
              starry.jumpToImage(msg, svg);
            });
            let emitter = (d) => {
              event.emit(event.SHOWIMAGECHANGED, d);
              if (!d[0]) return;
              $http({
                url: '/api/image/' + d[0].id,
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
                event.emit(event.SHOWIMAGECONSTRUCTOR, {
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

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
                emitter([msg.image]);//showImageStructure & showimageChanged
              }
              if (msg.showWordStructure) {
                if(!msg.word) {//clear word structure
                  let word = '';
                  let children = [];
                  let constructors = [];
                  event.emit(event.SHOWWORDSTRUCTURE, {
                    children,
                    constructors,
                    word
                  });
                  return 'clear';
                }
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
                  event.emit(event.SHOWWORDSTRUCTURE, {
                    children,
                    constructors,
                    word
                  });
                  return data;
                });
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
            //click svg (choose image point) & searchImage
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
                event.emit(event.SHOWIMAGESTRUCTURE, {//show image constructor in searchinterface
                  constructors,
                  id
                });
                return msg;
              });
            };
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
              console.time('renderInit');
              starry.renderInit();
              console.timeEnd('renderInit');
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
              console.log(msg);
              starry.jumpToImage(msg, svg);
              let imageElem = util.searchImage(msg.id);
              emitter([imageElem._data_]);
            });
            //clear image-point in svg
            event.on(scope, event.CLEARIMAGEPOINT, function() {
              svg.select('.all-container').selectAll('.click-image-point').remove();
            });
            //highlight images after semanticQuery
            event.on(scope, event.SEMANTICQUERYRESULT, function(images) {
              let util = starry.interfaces();
              let imagesElem = [];
              for (var i = 0; i < 10; i++) {
                let imageElem = util.searchImage(images[i].id);
                if(imageElem._data_.solution[0] !== null){
                  imagesElem.push(imageElem);
                }
              }
              // console.log(imagesElem);
              svg.select('.all-container').selectAll('.click-image-point').remove();
              svg.select('.all-container')
                .selectAll('.click-image-point')
                .data(imagesElem)
                .enter()
                .append('circle')
                .classed('click-image-point', true)
                .attr('cx', function(d){return d.solution[0];})
                .attr('cy', function(d){return d.solution[1];})
                .attr('r', 3)
                .attr('fill', '#fff');
            });

            svg.call(Interaction.svg.ondrag, starry);
            svg.call(Interaction.svg.onclick, starry, emitter);
            svg.call(Interaction.svg.onmousewheel, starry);
          }
        };
      }
    ]);
}(ApplicationConfiguration))

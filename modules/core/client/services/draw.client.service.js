(function(app) {

  'use strict';

  // import angular from 'angular';
  // import * as d3 from 'd3';
  // import Solar from './solar.service';
  // import Interaction from './interaction.service';
  // import mathFactory from '../../util/mathfactory';
  // import textFactory from '../../util/textfactory';
  // import VPTree from '../../util/vptree';

  // import singular from '../resource/singular';
  var singular = require('../resource/singular');
  // import Transition from './transition.service';

  let ADDNEWWORD = function(selections, config) {
    selections.classed('keyword', true)
      .attr('dominant-baseline', 'middle')
      .text(d => d.text)
      .attr('fill', config.fill)
      .attr('x', d => d.solution[0])
      .attr('y', d => d.solution[1]);
  };

  let onclick = function(selections, util, svg) {
    selections.on('click', function(d, i) {
      if (d3.event)
        d3.event.stopPropagation();
      let config = {};
      config.text = d.text;
      if (latestClick !== '' && latestClick !== d.text) {
        util.deleteSolar(svg, {
          text: latestClick,
          fix: true
        });
      }
      let msg = util.fixSolar(svg, config);
      latestClick = d.text;
      // console.log(msg);
      if (msg === 'Fix') {
        svg.selectAll('.focus-keyword').classed('focus-keyword', false);
        let word = svg.selectAll('.keyword')
          .filter((d) => d.text === config.text);
        word.classed('focus-keyword', true);
      } else {
        // svg.selectAll('.focus-keyword').classed('focus-keyword', false);
        util.deleteSolar(svg, config);
      }
      svg.selectAll('.children').classed('children', false);
      svg.selectAll('.parent').classed('parent', false);
      util.exportCallback({
          'dblclickword': true,
          'word': d.text
        })
        .then(function(data) {
          let children = data.children;
          let constructors = data.constructors;
          children = children.map(util.getWordByIndex);
          constructors = constructors.map(d => util.getWordByIndex(d.index));
          children = svg.selectAll('.keyword')
            .filter(d => {
              for (let i of children) {
                if (i.word === d.text) return true;
              }
              return false;
            });
          children.classed('children', true);
          constructors = svg.selectAll('.keyword')
            .filter(d => {
              for (let i of constructors) {
                if (i.word === d.text) return true;
              }
              return false;
            });
          constructors.classed('parent', true);
        });
    });
  };

  let ondblclick = function(selections, util, svg) {
    selections.on('dblclick', function(d, i) {
      if (d3.event)
        d3.event.stopPropagation();
      svg.selectAll('.children').classed('children', false);
      svg.selectAll('.parent').classed('parent', false);
      svg.selectAll('.node-inspect').classed('node-inspect', false);
      d3.select(this).classed('node-inspect', true);
      let config = {};
      config.text = d.text;
      config.rootposition = d.solution;
      // fetch constructors
      util.exportCallback({
          'dblclickword': true,
          'word': d.text
        })
        .then(function(data) {
          let children = data.children;
          let constructors = data.constructors;
          children = children.map(util.getWordByIndex);
          constructors = constructors.map(d => util.getWordByIndex(d.index));
          children = svg.selectAll('.keyword')
            .filter(d => {
              for (let i of children) {
                if (i.word === d.text) return true;
              }
              return false;
            });
          children.classed('children', true);
          constructors = svg.selectAll('.keyword')
            .filter(d => {
              for (let i of constructors) {
                if (i.word === d.text) return true;
              }
              return false;
            });
          constructors.classed('parent', true);
        });
    });
  };

  let onmouseover = function(selections, util, svg) {
    selections.on('mouseover', function(d, i) {
      let config = {},
        radius = 500;
      config.center = d.solution;
      config.text = d.text;
      config.exportCallback = util.exportCallback;
      let images = util.brushImage(d._solution_, radius).map(d => d.data._data_);
      images = images.filter((d) => {
        let caption = d.caption[0].split(' ');
        for (let word of caption) {
          if (singular[word] === singular[config.text]) return true;
        }
        return false;
      });
      util.drawSolar(svg, images, config);
      let X = images.map(d => d.caption[0]);
      // console.log(textFactory.Frequent(X, config.text));
    });
  };

  let onmouseleave = function(selections, util, svg) {
    selections.on('mouseleave', function(d, i) {
      let config = {};
      config.text = d.text;
      util.deleteSolar(svg, config);
    });
  };

  let redraw = function(canvas) {
    let root = sketch.node();
    let context = canvas.getContext('2d');
    // context.clearRect(0, 0, canvas.width, canvas.height);
    for (let child = root.firstChild; child; child = child.nextSibling)
      draw(child);

    function draw(element) {
      switch (element.tagName) {
        case "circle":
          {
            let fillStyle = d3.color(element.getAttribute("fill"));
            if (!fillStyle) break;
            fillStyle.opacity = element.getAttribute("fill-opacity");
            context.fillStyle = fillStyle.toString();
            context.beginPath();
            context.arc(element.getAttribute("cx"), element.getAttribute("cy"), element.getAttribute("r"), 0, 2 * Math.PI, true);
            context.fill();
            break;
          }
      }
    }
  };

  let animation = function(canvas, endscale, cb) {
    clean();
    let image;
    if (originImage !== undefined) {
      image = originImage;
    } else {
      image = new Image();
      image.src = canvas.toDataURL("image/png");
      originImage = image;
    }
    targetscale *= endscale;
    let context = canvas.getContext('2d');
    let scale = d3.scaleLinear().domain([0, 1]).range([currentscale, targetscale]);
    for (let i = 1; i <= times; i++) {
      let t = d3.timeout(function() {
        let t = ease(i / times);
        currentscale = scale(t);
        let w = image.width * currentscale,
          h = image.height * currentscale;
        let x = (canvas.width - w) / 2,
          y = (canvas.height - h) / 2;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, image.width, image.height, x, y, w, h);
        //end animation
        if (i === times && cb) {
          originImage = undefined;
          currentscale = 1;
          targetscale = 1;
          cb();
          console.log('end animation');
        };
      }, i * (duration / times));
      timeouts.push(t);
    }
  };

  angular
    .module(app.applicationModuleName)
    .factory('draw', ['transition', function(Transition) {
      let draw = {};

      // Return a function to draw a word
      draw.DrawWord = function() {
        let latestClick = '';

        return function(svg, nodes, config) {
          config = config || {};
          config.fill = config.fill || '#fff';
          let container = svg.select('.all-container');
          let dump = container.selectAll('text').filter(function() {
            return !d3.select(this).classed('keyword');
          });
          console.log(dump.size());
          dump.remove();
          let current = container.selectAll('.keyword')
            .data(nodes, d => d.text);
          let remove = current.exit();
          let enter = current.enter().append('text');
          remove.remove();
          if (config.zoomByWheel) {
            current.transition()
              .call(Transition.MoveWord, function() {
                enter.call(ADDNEWWORD, config)
                  .transition().call(Transition.FadeIn);
                config.renderCanvas();
              });
          } else {
            current
              .attr('x', d => d.solution[0])
              .attr('y', d => d.solution[1]);
            enter.call(ADDNEWWORD, config)
              .transition().call(Transition.FadeIn);
          }
          enter.call(onclick, config.util, svg);
          enter.call(onmouseover, config.util, svg);
          enter.call(onmouseleave, config.util, svg);
          // enter.call(ondblclick, config.util, svg);
          return enter;
        };
      };


      draw.AnimateCanvas = function() {
        let originImage;
        let targetscale = 1;
        let currentscale = 1;
        let timeouts = [];
        let duration = 1000;
        let fps = 40;
        let times = parseInt(fps * (duration / 1000));
        let ease = d3.easeCubic;
        let clean = function() {
          for (let t of timeouts)
            t.stop();
          timeouts = [];
        }

        return animation;
      };
      // Return a function to draw an image
      draw.DrawImage = function() {
        d3.namespaces.custom = 'https://d3js.org/namespace/custom';
        let sketch = d3.select('body').append('custom:sketch');
        let radius = 3,
          opacity = 0.25;

        return function(canvas, nodes) {
          let selection = sketch.selectAll('circle')
            .data(nodes);
          selection.enter().append('circle');
          selection.exit().remove();
          selection = sketch.selectAll('circle');
          selection
            .attr('cx', d => (0.5 + d.solution[0]) << 0)
            .attr('cy', d => (0.5 + d.solution[1]) << 0)
            .attr('r', radius)
            .attr('fill', d => d.style.fillStyle)
            .attr('fill-opacity', d => d.style.opacity);
          redraw(canvas);
        };
      };

      // Draw density
      // draw.DrawDensity = function() {
      //   function rgb2array(rgb) {
      //     rgb = rgb.substr(4, rgb.length-5).split(',').map(d => parseInt(d));
      //     return rgb;
      //   }
      //   return function(canvas, area, nearest) {
      //     let density = [];
      //     let kernalName = 'gaussian';
      //     let kernal = mathFactory.Kernal(kernalName);
      // 		let h = 10;
      //     let r = 20;
      //     let x = area.x, y = area.y;
      //     let width = area.width, height = area.height;
      //     console.time('compute density');
      //     for (let i = 0; i < height; i++) {
      //       for (let j = 0; j < width; j++) {
      // 		    let nears = nearest([x+j, y+i], r);
      //         let dx = 0;
      //         let color = {};
      // 		    if (nears.length !== 0) {
      //           for (let near of nears) {
      //             let t = near.d / h;
      //             dx += kernal(t);
      //             if (color[near.data.style.fillStyle]) color[near.data.style.fillStyle]++;
      //             else color[near.data.style.fillStyle] = 1;
      //           }
      //           // dx /= nears.length;
      //           color = Object.keys(color).map(d => [d, color[d]]);
      //           color.sort((a, b) => b[1] - a[1]);
      //           color = color[0][0];
      //         }
      //         density.push({ dx, color });
      //         // density.push(nears.length);
      //       }
      //     }
      //     console.timeEnd('compute density');
      //     let colorStrenth = mathFactory.ColorStrenth(d3.max(density, d => d.dx));
      //     let ctx = canvas.getContext('2d');
      //     let img = ctx.createImageData(width, height);
      //     let imgData = img.data;
      //     console.time('render density');
      //     for (let i = 0; i < height; i++) {
      //       for (let j = 0; j < width; j++) {
      //         let offset = i * width + j;
      //         let value = colorStrenth(density[offset].dx);
      //         let rgb = density[offset].color;
      //         offset *= 4;
      //         if (value > 0.75) {
      //           rgb = rgb2array(d3.color(rgb).brighter(0.5).toString());
      //         }
      //         else if (value > 0.5) {
      //           rgb = rgb2array(d3.color(rgb).toString());
      //         }
      //         else if (value > 0.25) {
      //           rgb = rgb2array(d3.color(rgb).darker(0.5).toString());;
      //         }
      //         else {
      //           rgb = [0, 0, 0];
      //         }
      //         imgData[offset] = rgb[0];
      //         imgData[offset+1] = rgb[1];
      //         imgData[offset+2] = rgb[2];
      //         imgData[offset+3] = 255;
      //         // ctx.fillStyle = rgb;
      //         // ctx.fillRect(i + x, j + y, 1, 1);
      //       }
      //     }
      //     ctx.putImageData(img, x, y);
      //     console.timeEnd('render density');
      //   };
      // };

      // Draw contour of a set of points
      // draw.DrawContour = function() {
      //   return function(canvas, nodes, stroke) {
      //     let ctx = canvas.getContext('2d');
      //     let points = [];
      //     for (let node of nodes) {
      //       let solution = node.solution;
      //       points.push(solution);
      //     }
      //     let hull = d3.polygonHull(points);
      //     ctx.beginPath();
      //     for (let i = 0; i < hull.length; i++) {
      //       if (i === 0)
      //         ctx.moveTo(hull[i][0], hull[i][1]);
      //       else
      //         ctx.lineTo(hull[i][0], hull[i][1]);
      //     }
      //     ctx.lineTo(hull[0][0], hull[0][1]);
      //     ctx.closePath();
      //     ctx.stroke();
      //   }
      // };

      // Draw solar system
      // draw.DrawSolar = function() {
      //   let AddCaption = function (svg, d) {
      //     svg.append('g')
      //       .classed('caption-g', true)
      //       .append('text')
      //       .datum(1)
      //       .attr('x', d.caption.p[0])
      //       .attr('y', d.caption.p[1])
      //       .attr('text-anchor', d.caption.anchor)
      //       .text(d.caption.text);
      //     let textRect = svg.select('text').node().getBoundingClientRect();
      //     let padding = 4;
      //     svg.select('.caption-g')
      //       .append('rect')
      //       .datum(0)
      //       .attr('rx', 4)
      //       .attr('ry', 4)
      //       .attr('fill', '#fff')
      //       .attr('x', () => {
      //         if (d.caption.anchor === 'start')
      //           return d.caption.p[0] - padding;
      //         return d.caption.p[0] - padding - textRect.width;
      //       })
      //       .attr('y', d.caption.p[1] - textRect.height)
      //       .attr('width', textRect.width + (padding * 2))
      //       .attr('height', textRect.height + (padding * 2));
      //     svg.select('.caption-g')
      //       .selectAll('*')
      //       .sort();
      //   };
      //   return function(svg, nodes, config) {
      // 		let solarchart = Solar();
      //     config = config || {};
      //     config.center = config.center || [0, 0];
      //     config.data = nodes;
      //     let container = svg.select('.all-container');
      //     let fixname = 'solar-fix-'+config.text;
      //     let unfixname = 'solar-'+config.text;
      // 		// no data or exist the solar
      //     if (nodes.length === 0 || svg.selectAll('.'+fixname).size() != 0) {
      //       return;
      //     }
      //     solarchart.data(nodes)
      //       .cx(config.center[0])
      //       .cy(config.center[1]);
      //     let arcs = solarchart.layout();
      //     let g = container.append('g')
      //       .classed('solar', true)
      //       .classed('solar-'+config.text, true);
      //     for (let d of arcs) {
      //       let image = new Image();
      //       image.src = ("http://10.76.2.57:8000/"+d.image.src);
      //       image.onload = function() {
      //         d.image.width = image.width;
      //         d.image.height = image.height;
      //         g.append('clipPath')
      //           .attr('id', 'collage-mask-' + config.text + '-' + d.index)
      //           .append('circle')
      //           .datum(d)
      //           .call(solarchart.clipPath);
      //         g.append('image')
      //           .datum(d)
      //           .call(solarchart.image)
      //           .attr('clip-path', (d) => {
      //             return 'url(#collage-mask-' + config.text + '-' + d.index + ')';
      //           })
      //           .on('mouseover', function (d) {
      //             solarchart.focus(d.index);
      //             update();
      //             AddCaption(g, d);
      //           })
      //           .on('mouseleave', function (d) {
      //             solarchart.relayout();
      //             update();
      //             g.selectAll('.caption-g').remove();
      //           })
      //           .on('click', function (d) {
      //             d3.event.stopPropagation();
      //             let image = d.image.d;
      //             let msg = {}
      //             msg.clickimage = true;
      //             msg.image = image;
      //             config.exportCallback(msg);
      //           });
      //       }
      //     }
      //     function update() {
      //       g.selectAll('clipPath')
      //         .select('circle')
      //         .transition()
      //         .duration(500)
      //         .call(solarchart.clipPath);
      //       g.selectAll('image')
      //         .transition()
      //         .duration(500)
      //         .call(solarchart.image);
      //     }
      //   };
      // };

      // Fix a Solar
      // draw.FixSolar = function() {
      //   return function(svg, config) {
      //     let container = svg.select('.all-container');
      //     if (config && config.text) {
      //       let fixname = 'solar-fix-'+config.text;
      //       let unfixname = 'solar-'+config.text;
      //       // Fix it
      //       if (container.selectAll('.'+unfixname).size() != 0) {
      //         container.selectAll('.'+unfixname)
      //           .classed(unfixname, false)
      //           .classed(fixname, true);
      //         console.log('Fix');
      //         return 'Fix';
      //       }
      //       // Release it
      //       else {
      //         container.selectAll('.'+fixname)
      //           .classed(fixname, false)
      //           .classed(unfixname, true);
      //         console.log('Release');
      //         return 'Release';
      //       }
      //     }
      //   };
      // };

      // Delete a Solar
      draw.DeleteSolar = function() {
        return function(svg, config) {
          let container = svg.select('.all-container');
          if (config && config.fix && config.text) {
            let classname = '.solar-fix-' + config.text;
            container.selectAll(classname).remove();
          }
          if (config && config.text) {
            let classname = '.solar-' + config.text;
            container.selectAll(classname).remove();
          } else {
            container.selectAll('.solar').remove();
          }
        }
      };

      // Draw tree
      // draw.DrawTree = function() {
      //   return function(svg, config) {
      //     let container = d3.select('#starry-tree-svg');
      //     let table = [
      //       {"name": "Eve",   "parent": ""},
      //       {"name": "Cain",  "parent": "Eve"},
      //       {"name": "Seth",  "parent": "Eve"},
      //       {"name": "Enos",  "parent": "Seth"},
      //       {"name": "Noam",  "parent": "Seth"},
      //       {"name": "Abel",  "parent": "Eve"},
      //       {"name": "Awan",  "parent": "Eve"},
      //       {"name": "Enoch", "parent": "Awan"},
      //       {"name": "Azura", "parent": "Eve"}
      //     ];
      //     table = config.table || table;
      //     let updateParent = function(name, parent) {
      //       for (let obj of table) {
      //         if (obj.name === name) {
      //           obj.parent = parent;
      //           return;
      //         }
      //       }
      //     };
      //     let width = 300, height = 500;
      //
      //     let update = function() {
      //       container.selectAll('*').remove();
      //       let root = d3.stratify()
      //         .id(function (d) { return d.name; })
      //         .parentId(function (d) { return d.parent; })
      //         (table);
      //       let g = container.append('g').classed('tree-container', true);
      //       let tree = d3.tree()
      //         .size([height - 60, width - 60]);
      //       g = g.append('g').classed('tree', true)
      //         .attr('transform', 'translate(25, 30)')
      //       var link = g.selectAll(".link")
      //         .data(tree(root).descendants().slice(1))
      //         .enter().append("path")
      //         .attr("class", "link")
      //         .attr("d", function (d) {
      //           return "M" + d.y + "," + d.x
      //             + "C" + (d.y + d.parent.y) / 2 + "," + d.x
      //             + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
      //             + " " + d.parent.y + "," + d.parent.x;
      //         });
      //
      //       var node = g.selectAll(".node")
      //         .data(root.descendants())
      //         .enter().append("g")
      //         .attr("class", function (d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
      //         .attr("transform", function (d) { return "translate(" + d.y + "," + d.x + ")"; })
      //         .on('click', function (d, i) {
      //           if (d3.event)
      //             d3.event.stopPropagation();
      //           console.log(d);
      //         });
      //
      //       node.append("circle")
      //         .attr("r", 5);
      //
      //       node.append("text")
      //         .classed('node-name', true)
      //         .attr("dy", 3)
      //         .attr("x", function (d) { return d.children ? -8 : 8; })
      //         .style("text-anchor", function (d) { return d.children ? "end" : "start"; })
      //         .text(function (d) { return d.id.substring(d.id.lastIndexOf(".") + 1); });
      //
      //       let points = [];
      //       node.each(function (d) {
      //         let current = d3.select(this);
      //         let currentMatrix = current.node().getCTM();
      //         let currentx = currentMatrix.e - 25, currenty = currentMatrix.f - 30;
      //         points.push({ node: d3.select(this), x: currentx, y: currenty, text: d.id });
      //       });
      //
      //       console.log(points);
      //
      //       let vptree = VPTree.build(points.map(d => {
      //         return [ d.x, d.y ];
      //       }), mathFactory.Euclidean_distance);
      //
      //       let visit = function (p) {
      //         console.log(p, points);
      //         let radius = 10;
      //         let result = vptree.search(p, Infinity, radius);
      //         console.log(result);
      //         result.sort((a, b) => a.dist - b.dist);
      //         for (let obj of result) {
      //           obj.data = points[obj.i];
      //         }
      //         if (result.length > 0) return result[0].data;
      //         else return;
      //       };
      //
      //       let drag = d3.drag();
      //       let start;
      //       let matrix;
      //       drag.on('start', function () {
      //         let p = [d3.event.x, d3.event.y];
      //         start = p;
      //         matrix = d3.select(this).node().getCTM();
      //       });
      //       drag.on('drag', function () {
      //         let p = [d3.event.x, d3.event.y];
      //         let offset = [p[0] - start[0], p[1] - start[1]];
      //         offset[0] += matrix.e - 25;
      //         offset[1] += matrix.f - 30;
      //         d3.select(this).attr('transform', 'translate(' + offset.join(',') + ')');
      //       });
      //       drag.on('end', function () {
      //         let p = [d3.event.x, d3.event.y];
      //         let offset = [p[0] - start[0], p[1] - start[1]];
      //         offset[0] += matrix.e - 25;
      //         offset[1] += matrix.f - 30;
      //         let parent = visit(offset);
      //         if (parent && parent.text !== d3.select(this).datum().id) {
      //           updateParent(d3.select(this).datum().id, parent.text);
      //           update();
      //           if (config.exportCallback) {
      //             config.exportCallback({ 'reconstructword': table });
      //           }
      //         }
      //         else {
      //           offset[0] = matrix.e - 25;
      //           offset[1] = matrix.f - 30;
      //           d3.select(this).attr('transform', 'translate(' + offset.join(',') + ')');
      //           // updateParent(d3.select(this).datum().id, null);
      //           // update();
      //         }
      //       });
      //       node.call(drag);
      //     };
      //
      //     update();
      //   };
      // };

      return draw;
    }]);
}(ApplicationConfiguration))

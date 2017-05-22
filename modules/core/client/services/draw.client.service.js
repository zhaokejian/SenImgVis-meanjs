(function(app) {

  'use strict';

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

  let onmouseover = function(selections, util, svg, singular) {
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

  let redraw = function(canvas, sketch) {
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
    .factory('draw', ['transition', 'singular', function(Transition, singular) {
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
          console.log("dump keyword size: " + dump.size());
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
            console.log("ADDNEWWORD when zoomByWheel");
          } else {
            current
              .attr('x', d => d.solution[0])
              .attr('y', d => d.solution[1]);
            enter.call(ADDNEWWORD, config)
              .transition().call(Transition.FadeIn);
            console.log("ADDNEWWORD in nodes");
          }
          enter.call(onclick, config.util, svg);
          enter.call(onmouseover, config.util, svg, singular);
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
            .attr('fill', '#109ff0')
            .attr('fill-opacity', '0.25');

          redraw(canvas, sketch);
          // .attr('fill', d => d.style.fillStyle)
          // .attr('fill-opacity', d => d.style.opacity);
        };
      };

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

      return draw;
    }]);
}(ApplicationConfiguration))

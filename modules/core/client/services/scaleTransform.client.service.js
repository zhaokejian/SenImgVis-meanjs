(function(app){
  'use strict';

  // Shift the scale
  let Shift = function(scale, offset) {
    scale = scale.copy();
    let range = scale.range();
    range[0] = range[0] + offset;
    range[1] = range[1] + offset;
    scale.range(range);
    return scale;
  }

  // Shift the scale according to a specify center
  let Centerize = function(scale, mid) {
    scale = scale.copy();
    let range = scale.range();
    let offset = mid - (range[0] + range[1])/2;
    range[0] = range[0] + offset;
    range[1] = range[1] + offset;
    scale.range(range);
    return scale;
  };

  // Scale the scale
  let Scale = function(scale, factor, center) {
    scale = scale.copy();
    let range = scale.range();
    if (isNaN(center)) center = (range[0] + range[1]) / 2;
    let len = range[0] - center;
    range[0] = (len * factor) + center;
    len = range[1] - center;
    range[1] = (len * factor) + center;
    scale.range(range);
    return scale;
  };

  let ScaleData = function(data, width, height) {
    let xset = data.word.map(d => d.solution[0]);
    let yset = data.word.map(d => d.solution[1]);
    xset = xset.concat(data.image.map(d => d.solution[0]));
    yset = yset.concat(data.image.map(d => d.solution[1]));
    let xdomain = d3.extent(xset);
    let ydomain = d3.extent(yset);
    let xlen = xdomain[1] - xdomain[0];
    let ylen = ydomain[1] - ydomain[0];
    let scaleFactor = Math.min(width, height) / Math.max(xlen, ylen);
    let xscale = d3.scaleLinear().domain(xdomain);
    let yscale = d3.scaleLinear().domain(ydomain);
    xscale.range([ 0, xlen*scaleFactor ]);
    yscale.range([ ylen*scaleFactor, 0 ]);
    xscale = Centerize(xscale, width/2);
    yscale = Centerize(yscale, height/2);
  	return [xscale, yscale];
  };

  angular
    .module(app.applicationModuleName)
    .factory('scaleTransform', function() {
      let scaleTransform = {};
      scaleTransform.Shift = Shift;
      scaleTransform.Centerize = Centerize;
      scaleTransform.Scale = Scale;
      scaleTransform.ScaleData = ScaleData;

      return scaleTransform;
    });
}(ApplicationConfiguration))

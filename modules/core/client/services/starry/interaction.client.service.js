(function(app){

'use strict';

angular
  .module(app.applicationModuleName)
  .factory('interaction', function(){
    let interaction = {
    	keyword: {},
    	svg: {},
    	canvas: {},
    	solarImage: {}
    };

    interaction.svg.onclick = function(selection, starry, emitter) {
    	selection.on('click', function() {
    		// if (!d3.event.defaultPrevented) return;
    		console.log('click svg');
    		let e = d3.event, p = [ e.offsetX, e.offsetY ]; // The click point
    		let radius = 20; // The brush radius
    		let util = starry.interfaces();
    		let words = util.brushWord(p, radius).map(d => d.data._data_);
    		let images = util.brushImage(p, radius).map(d => d.data);
    		let image = images.length > 0 ? images[0] : undefined;
    		if (image) {
    			emitter(images.map(d => d._data_));
    			selection.select('.all-container').selectAll('.click-image-point').remove();
    			selection.select('.all-container').append('circle')
    				.classed('click-image-point', true)
    				.attr('cx', image.solution[0])
    				.attr('cy', image.solution[1])
    				.attr('r', 3)
    				.attr('fill', '#fff');
    			// selection.append('')
    		}
    		// Show words
    		// console.log('words', words.map(d => d.word));
    		// Show images
    	});
    };

    interaction.svg.onmousewheel = function(selection, starry) {
    	selection.on('wheel', function() {
        console.log('wheel');
    		let wheelDelta = 0, e = d3.event;
        console.log(e);
    		let config = {};
    		let name = 'zoomByWheel';
    		if(e.wheelDelta){//IE/Opera/Chrome
    			wheelDelta = e.wheelDelta;
    		}else if(e.deltaY){//Firefox
    			wheelDelta = -e.deltaY;
    		}
    		if (wheelDelta === 0) return;
    		// zoom in
    		if (wheelDelta > 0) {
    			config.zoomIn = true;
    		}
    		// zoom out
    		else {
    			config.zoomOut = true;
    		}
    		starry.zoomByWheel(config);
    	});
    };

    interaction.svg.ondrag = function(selection, starry) {
      let drag = d3.drag();
      let start;
      let move = false;
      drag.on('start', function() {
    		// console.log('dragstart');
        let p = [d3.event.x, d3.event.y];
        start = p;
        move = false;
      });
      drag.on('drag', function() {
        let p = [d3.event.x, d3.event.y];
        let offset = [p[0] - start[0], p[1] - start[1]];
        if (offset[0] != 0 || offset[1] != 0)
          move = true;
        let config = {};
        config.offset = offset;
        starry.shift(config);
      });
      drag.on('end', function() {
    		// console.log('dragend');
        let p = [d3.event.x, d3.event.y];
    		let offset = [p[0] - start[0], p[1] - start[1]];
        let config = {};
        config.offset = offset;
    		config.endstatus = true;
        if (move) {
    			starry.shift(config);
    		}
      });
      selection.call(drag);
    };

    return interaction;
  });

}(ApplicationConfiguration))

(function(app) {

  'use strict';

  angular
    .module(app.applicationModuleName)
    .factory('solar', ['maths', function(mathFactory) {
      let cx, cy, radial = 150, data, arcs, origin, X;
    	let solar = {};
    	solar.cx = function(_) {
    		if (!arguments.length) return cx;
    		cx = _;
    		return solar;
    	};
    	solar.cy = function(_) {
    		if (!arguments.length) return cy;
    		cy = _;
    		return solar;
    	};
    	solar.radial = function(_) {
    		if (!arguments.length) return radial;
    		radial = _;
    		return solar;
    	};
    	solar.data = function (_) {
    		if (!arguments.length) return data;
    		data = _.slice(0, 8);
    		return solar;
    	};
    	solar.focus = function(index) {
    		if (arcs.length <= 4) return;
    		let focusangle = Math.PI / 2;
    		let angle = mathFactory.IncludedAngle(origin[index].startAngle, origin[index].endAngle);
    		let restAngle = 2 * Math.PI - focusangle;
    		arcs[index].startAngle = origin[index].startAngle - ((focusangle - angle) / 2);
    		arcs[index].endAngle = origin[index].endAngle + ((focusangle - angle) / 2);
    		let startAngle = arcs[index].endAngle;
    		let count = 0;
    		let indices = [];
    		for (let i = index + 1; i < arcs.length; i++) indices.push(i);
    		for (let i = 0; i < index; i++) indices.push(i);
    		for (let i of indices) {
    			let arc = arcs[i];
    			arc.startAngle = startAngle + count * (restAngle / (arcs.length - 1));
    			arc.endAngle = startAngle + ((count + 1) * (restAngle / (arcs.length - 1)));
    			count++;
    		}
    		for (let arc of arcs) {
    			arc.startAngle = mathFactory.NormalizeAngle(arc.startAngle);
    			arc.endAngle = mathFactory.NormalizeAngle(arc.endAngle);
    		}
    		computeLayout(arcs);
    		return arcs;
    	};
    	solar.layout = function() {
    		let pie = d3.pie();
    		if (data.length === 1)
    			pie.padAngle(Math.PI * 3 / 2);
    		else if (data.length === 2)
    			pie.padAngle(Math.PI / 2);
    		else if (data.length === 3)
    			pie.padAngle(Math.PI / 6);
    		else
    			pie.padAngle(0.1);
    		arcs = pie(data.map(d => 1));
    		origin = pie(data.map(d => 1));
    		arcs = arcs.map(d => {
    			delete (d['data']);
    			delete (d['value']);
    			return d;
    		});
    		computeLayout(arcs);
    		return arcs;
    	};
    	solar.relayout = function() {
    		for (let i = 0; i < arcs.length; i++) {
    			arcs[i].startAngle = origin[i].startAngle;
    			arcs[i].endAngle = origin[i].endAngle;
    			arcs[i].padAngle = origin[i].padAngle;
    		}
    		computeLayout(arcs);
    	};
    	solar.clipPath = function(selection) {
    		selection
    			.attr('cx', d => {
            console.log(d.image.r);
    				let aspect = d.image.width / d.image.height;
    				return aspect > 1 ? (d.image.r * aspect) : d.image.r;
    			})
    			.attr('cy', d => {
    				let aspect = d.image.width / d.image.height;
    				return aspect > 1 ? d.image.r : (d.image.r / aspect);
    			})
    			.attr('r', d => d.image.r);
    	};
    	solar.image = function(selection) {
    		selection
    			.attr('width', d => {
    				let aspect = d.image.width / d.image.height;
    				return aspect > 1 ? (d.image.r * 2 * aspect) : (d.image.r * 2);
    			})
    			.attr('height', d => {
    				let aspect = d.image.width / d.image.height;
    				return aspect > 1 ? (d.image.r * 2) : (d.image.r * 2 / aspect);
    			})
    			.attr('transform', (d) => {
    				let aspect = d.image.width / d.image.height;
    				let width = aspect > 1 ? (d.image.r * 2 * aspect) : (d.image.r * 2);
    				let height = aspect > 1 ? (d.image.r * 2) : (d.image.r * 2 / aspect);
    				let x = d.image.p[0] - (width / 2);
    				let y = d.image.p[1] - (height / 2);
    				return 'translate(' + x + ',' + y + ')';
    			})
    			.attr('xlink:href', (d) => {
    				let base = 'http://10.76.2.57:8000/';
    				return base + d.image.src;
    			});
    	};

    	function computeLayout(arcs) {
    		let caption_offset = 15; // 15px
    		for (let i = 0; i < arcs.length; i++) {
    			let arc = arcs[i];
    			let radius = mathFactory.AngleandRadialToRadius(mathFactory.IncludedAngle(arc.startAngle, arc.endAngle) - arc.padAngle, radial);
    			let midAngle = mathFactory.MidAngle(arc.startAngle, arc.endAngle);
    			let p = mathFactory.AngleToXY(midAngle, radial, cx, cy);
    			let caption_start = mathFactory.AngleToXY(midAngle, radial + radius + caption_offset, cx, cy);
    			if (!arc.image) {
    				arc.image = { p: p, r: radius, d: data[i], src: data[i].id };
    			}
    			else {
    				arc.image.p = p;
    				arc.image.r = radius;
    			}
    			arc.caption = { p: caption_start, text: arc.image.d.caption[0] };
    			arc.caption.anchor = (midAngle < Math.PI / 2 || midAngle > Math.PI * 3 / 2) ? 'start' : 'end';
    		}
    	}

    	return solar;
    }]);

}(ApplicationConfiguration))

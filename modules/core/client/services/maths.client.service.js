(function(app){

'use strict';

let Kernal = function(name='gaussian') {
	if (name === 'gaussian') {
		return function(d) { return Math.exp(-Math.pow(d, 2)); };
	}
	else if (name === 'student-t') {
		return function(d) { return 1.0 / (1.0 + Math.pow(d, 2)); };
	}
};

let Euclidean_distance = function(a, b) {
	let d = 0.0;
	for (let i = 0; i < a.length; i++) {
		d += Math.pow(a[i] - b[i], 2);
	}
	return Math.sqrt(d);
};

let ColorStrenth = function(dmax, alpha=0.55) {
  return function(dx) {
    // return dx / dmax;
    let v = 1 - Math.pow(dx / dmax, alpha);
    v = Math.pow(v, 1.0/alpha);
    v = 1 - v;
    return v;
  };
};

let AngleToXY = function(angle, r, x, y) {
	x = x || 0;
	y = y || 0;
	x += Math.cos(angle) * r;
	y += Math.sin(angle) * r;
	return [x, y];
};

let AngleandRadiusToRadial = function(angle, radius) {
	radius /= 2;
	angle /= 2;
	return radius / Math.tan(angle);
};

let AngleandRadialToRadius = function(angle, radial) {
	angle /= 2;
	let a = radial, b = a * Math.tan(angle), c = Math.sqrt((a*a) + (b*b));
	return a * b / c;
};

let IncludedAngle = function(start, end) {
	while(end < start) {
		end += Math.PI * 2;
	}
	return end - start;
};

let NormalizeAngle = function(angle) {
	while(angle < 0) {
		angle += Math.PI * 2;
	}
	while (angle >= Math.PI * 2) {
		angle -= Math.PI * 2;
	}
	return angle;
};

let MidAngle = function(start, end) {
	while(end < start) {
		end += Math.PI * 2;
	}
	let mid = (start + end) / 2;
	return NormalizeAngle(mid);
};

angular
  .module(app.applicationModuleName)
  .factory('maths', function() {
    let maths = {};
    maths.Kernal = Kernal;
    maths.Euclidean_distance = Euclidean_distance;
    maths.ColorStrenth = ColorStrenth;
    maths.AngleToXY = AngleToXY;
    maths.AngleandRadiusToRadial = AngleandRadiusToRadial;
    maths.AngleandRadialToRadius = AngleandRadialToRadius;
    maths.IncludedAngle = IncludedAngle;
    maths.NormalizeAngle = NormalizeAngle;
    maths.MidAngle = MidAngle;

    return maths;
  });

}(ApplicationConfiguration))

(function(app) {

  'use strict';

  let BBox = function(rect) {
    let bbox = {
      max: {},
      min: {}
    };
    bbox.min.x = rect.left;
    bbox.min.y = rect.top;
    bbox.max.x = bbox.min.x + rect.width;
    bbox.max.y = bbox.min.y + rect.height;
    return bbox;
  };

  let Overlap = function(a, b) {
    if (a.max.x < b.min.x) return false; // a is left of b
    if (a.min.x > b.max.x) return false; // a is right of b
    if (a.max.y < b.min.y) return false; // a is above b
    if (a.min.y > b.max.y) return false; // a is below b
    return true; // boxes overlap
  };

  angular
    .module(app.applicationModuleName)
    .factory('collision', function() {
      // fix the conflict the texts
      let collision = {};
      collision.FixConflict = function(elem) {
        let confict = false;
        let max_iter = 3;
        while (max_iter--) {
          let ilist = d3.range(elem.length),
            jlist = d3.range(elem.length);
          console.log("ilist:" + ilist);
          console.log("jlist:" + jlist);
          // ilist = d3.shuffle(ilist);
          // jlist = d3.shuffle(jlist);
          for (let i of ilist) {
            for (let j of jlist) {
              if (i === j) continue;
              let a = elem[i].dom.getBoundingClientRect();
              let b = elem[j].dom.getBoundingClientRect();
              console.log(a);
              console.log(b);
              // console.log(a, b);
              if (Overlap(BBox(a), BBox(b))) {
                confict = true;
                let xlen = a.left < b.left ? a.width - (b.left - a.left) : (a.left - b.left) - b.width;
                let ylen = a.top < b.top ? a.height - (b.top - a.top) : (a.top - b.top) - b.height;
                if (false) {
                  let x = elem[j].solution[0] + xlen;
                  elem[j].solution[0] = x;
                } else {
                  let sign = Math.random() > 0.5 ? 1 : -1;
                  if (sign) {
                    let y = elem[j].solution[1] + ylen;
                    elem[j].solution[1] = y;
                  } else {
                    let y = elem[i].solution[1] - ylen;
                    elem[i].solution[1] = y;
                  }
                }
                d3.select(elem[j].dom)
                  .attr('x', elem[j].solution[0])
                  .attr('y', elem[j].solution[1]);
              }
            }
          }
          if (!confict) break;
        }
      };
      return collision;
    });

}(ApplicationConfiguration))

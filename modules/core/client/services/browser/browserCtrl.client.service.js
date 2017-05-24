(function(app) {

  'use strict';

  angular
    .module(app.applicationModuleName)
    .factory('browserCtrl', function() {
      let Browser = {};

      Browser.show = function(container, images) {
        let img_name = images.map(d => d.id);
        let img_num = images.length;
        for (var i = 0; i < img_num; i++) {
          img_name[i] = "http://10.76.2.57:8000/" + img_name[i];
        }

        let browser_w = container.node().clientWidth;
        let browser_h = container.node().clientHeight;

        let ratio = browser_w * 1.0 / browser_h;
        let per_row = 0; // images per row
        let per_col = 0; // images per col
        // Assume put i pictures every column
        for (var i = 1; i <= img_num; i++) {
          let j = Math.round(i * ratio);
          if (i * j >= img_num) {
            per_col = i;
            per_row = j;
            break;
          }
        }

        if (per_row == 0 || per_col == 0) {
          // console.log("The per_row is zero!");
        }

        let img_width = browser_w / per_row;
        let img_height = browser_h / per_col;

        let table = container.select("#myTable").node();
        let img_flag = 0;
        let break_flag = 0;
        for (var i = 0; i < per_col; i++) {
          let row = table.insertRow(-1);
          for (var j = 0; j < per_row; j++) {
            let c = row.insertCell(-1);
            let img = document.createElement('img');
            img.id = "img" + String(img_flag);
            img.class = "small_img";
            img.src = img_name[img_flag];
            img.width = img_width;
            img.height = img_height;
            c.appendChild(img);
            img_flag += 1;
            if (img_flag >= img_num) {
              break_flag = 1;
              break;
            }
            //console.log(img_flag);
          }
          if (break_flag) break;
        }

        for (var i = 0; i < img_flag; i++) {
          let img_id = "#img" + String(i);
          let img_url = img_name[i];
          container.select(img_id)
            .on('click', function() {
              container.select("#imgBig").attr("src", img_url);
              container.select("#imgBig").attr("width", browser_w);
              container.select("#imgBig").attr("height", browser_h);
              container.select("#overlay").classed('Hidden', false);
              container.select("#overlayContent").classed('Hidden', false);
            });
        }

        container.select("#imgBig")
          .on('click', function() {
            container.select("#imgBig").attr("src", "");
            container.select("#imgBig").attr("width", 0);
            container.select("#imgBig").attr("height", 0);
            container.select("#overlay").classed('Hidden', true);
            container.select("#overlayContent").classed('Hidden', true);
          });
      }

      Browser.clear = function(container) {
        let table = container.select("#myTable");
        table.selectAll('*').remove();
      }

      return Browser;
    })

}(ApplicationConfiguration));

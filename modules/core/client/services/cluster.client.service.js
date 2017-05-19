(function(app) {

  'use strict';
  // import clustering from 'density-clustering';
  // import * as d3 from 'd3';
  // import mathFactory from './mathfactory';

  // Compute the group of data
  let ComputeGroup = function(X, radius = 0.03, n = 15) {
    // console.log(X);
    let result = {};
    // let dbscan = new clustering.DBSCAN();
    // let dbclusters = dbscan.run(X, radius, n);

    let optics = OPTICS();
    let opclusters = optics.run(X, radius, n);

    let clusters = opclusters;

    let centers = clusters.map(d => {
      let points = d.map(i => X[i]);
      let mean = [d3.mean(points.map(p => p[0])), d3.mean(points.map(p => p[1]))];
      return mean;
    });

    let SX = centers;
    let kmeans = new KMEANS();
    let centerclusters = kmeans.run(SX, 8);
    let groups = [];
    for (let g of centerclusters) {
      let tmp = [];
      for (let index of g) {
        tmp = tmp.concat(clusters[index]);
      }
      groups.push(tmp);
    }
    // let groups = clusters;
    result.groups = groups;
    // console.log(clusters)
    // result.noise = dbscan.noise;
    return result;
  };

  angular
    .module(app.applicationModuleName)
    .factory('cluster', function() {
      return ComputeGroup;
    });

}(ApplicationConfiguration))

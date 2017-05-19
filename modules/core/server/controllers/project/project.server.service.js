'use strict';

const addon = require('../../addon/build/Release/tsne.addon');
let _ = require('lodash');

let return_v = false;
let v_val;

let sign = function(x) {
  return (x == 0 ? 0 : (x < 0 ? -1.0 : 1.0));
};

let gaussRandom = function() {
  if(return_v) {
    return_v = false;
    return v_val;
  }
  var u = 2*Math.random()-1;
  var v = 2*Math.random()-1;
  var r = u*u + v*v;
  if(r == 0 || r > 1) return gaussRandom();
  var c = Math.sqrt(-2*Math.log(r)/r);
  v_val = v*c; // cache this for next function call for efficiency
  return_v = true;
  return u*c;
};

let zeroMean = function(X, N, D) {
  // Compute data mean
  let mean = [];
  for (let i = 0; i < D; i++) {
    mean.push(0.0);
  }
  for (let n = 0; n < N; n++) {
    for (let d = 0; d < D; d++) {
      mean[d] += X[n * D + d];
    }
  }
  for (let d = 0; d < D; d++) {
    mean[d] /= N;
  }

  // Subtract data mean
  for (let n = 0; n < N; n++) {
    for (let d = 0; d < D; d++) {
      X[n * D + d] -= mean[d];
    }
  }
};

let normalize = function(X, N, D) {
  let max_X = .0;
  let min_X = .0;
  for (let i = 0; i < N * D; i++) {
    if (X[i] > max_X) max_X = X[i];
    if (i == 0) min_X = X[i];
    else if (X[i] < min_X) min_X = X[i];
  }
  let factor = Math.max(Math.abs(min_X), Math.abs(max_X));
  for (let i = 0; i < N * D; i++) {
    X[i] /= factor;
  }
};

let updateGains = function(gains, dY, uY) {
  for (let i = 0; i < gains.length; i++) {
    gains[i] = (sign(dY[i]) != sign(uY[i])) ? (gains[i] + 0.2) : (gains[i] * 0.8);
  }
  for (let i = 0; i < gains.length; i++) {
    if (gains[i] < 0.01)
      gains[i] = 0.01;
  }
};

let updateGradient = function(gains, dY, uY, momentum, eta) {
  for (let i = 0; i < uY.length; i++) {
    uY[i] = momentum * uY[i] - eta * gains[i] * dY[i];
  }
};

let lieAboutPvalue = function(P, N) {
  for (let i = 0; i < P.row_P[N]; i++) {
    P.val_P[i] *= 12.0;
  }
};

let restorePvalue = function(P, N) {
  for (let i = 0; i < P.row_P[N]; i++) {
    P.val_P[i] /= 12.0;
  }
};

let getSolution = function(X, N, D, no_dims, max_iter, metric) {
  let Y = [];
  let gains = [], uY = [];
  let perplexity = 10;
  let K = perplexity * 3;
  let theta = 0.5;
  let stop_lying_iter = 250, mom_switch_iter = 250;
  let momentum = 0.5, final_momentum = 0.8;
  let eta = 200.0;
  let N_I = metric === 'cosine' ? 0 : N;
  max_iter = max_iter || 1000;
  for (let i = 0; i < N * no_dims; i++) {
    Y.push(gaussRandom());
    gains.push(1.0);
    uY.push(0.0);
  }
  zeroMean(X, N, D);
  normalize(X, N, D);
  console.time('Compute P');
  let P = addon.computeGaussianPerplexity(X, N, D, perplexity, K, N_I);
  console.timeEnd('Compute P');

  // Lie about P value
  lieAboutPvalue(P, N);

  for (let iter = 0; iter < max_iter; iter++) {
    // Update dY
    let dY = addon.computeGradient(P.row_P, P.col_P, P.val_P, Y, N, no_dims, theta).dY;
    // Update gains
    updateGains(gains, dY, uY);

    // Perform gradient update (with momentum and gains)
    updateGradient(gains, dY, uY, momentum, eta);
    for (let i = 0; i < N * no_dims; i++) {
      Y[i] = Y[i] + uY[i];
    }

    // Make solution zero-mean
    zeroMean(Y, N, no_dims);

    // Stop lying about the P-values after a while, and switch momentum
    if (iter == stop_lying_iter) {
      restorePvalue(P, N);
    }

    if (iter == mom_switch_iter) momentum = final_momentum;
    if (iter % 50 === 0 || iter === max_iter - 1) {
      let error = addon.evaluateError(P.row_P, P.col_P, P.val_P, Y, N, no_dims, theta);
      console.log('Error:', error, 'Iteration:', iter);
    }
  }
  return { Y, P, uY, gains };
};


let Xto2d = function(X_I, X_C, X_W, N_I, N_W, D, max_iter, weight=0.5) {
  X_I = _.flatten(X_I);
  X_C = _.flatten(X_C);
  X_W = _.flatten(X_W);
  let Y = [];
  let gains_CW = [], gains_I = [], gains_W = [];
  let uY_CW = [], uY_I = [], uY_W = [];
  let N = N_I + N_W;
  let no_dims = 2;
  let perplexity = 10;
  let K = perplexity * 3;
  let theta = 0.5;
  let stop_lying_iter = 250, mom_switch_iter = 250;
  let momentum = 0.5, final_momentum = 0.8;
  let eta = 200.0;
  let W_ii = 0.5, W_iw = 200, W_wi = 0, W_ww = 1;
  max_iter = max_iter || 1000;

  // Compute word first
  let w_solution = getSolution(X_W.slice(0), N_W, D, no_dims, 1500, 'cosine');
  // let i_solution = getSolution(X_I.slice(0), N_I, D, no_dims, 1500, 'euclidean');
  let Y_W = w_solution.Y, P_W = w_solution.P;
  // let Y_I = i_solution.Y, P_I = i_solution.P;
  // gains_W = w_solution.gains; uY_W = w_solution.uY;
  // gains_I = i_solution.gains; uY_I = i_solution.uY;
  // normalize(Y_W, N_W, no_dims);
  // normalize(Y_I, N_I, no_dims);

  for (let i = 0; i < N * no_dims; i++) {
    if (i < N_I * no_dims) {
      Y.push(gaussRandom());
      // Y.push(Y_I[i]);
    }
    else {
      Y.push(Y_W[i-(N_I * no_dims)]);
    }
    gains_CW.push(1.0);
    uY_CW.push(0.0);
  }
  // return Y;
  for (let i = 0; i < N_I * no_dims; i++) {
    gains_I.push(1.0);
    uY_I.push(0.0);
  }
  // for (let i = 0; i < N_W * no_dims; i++) {
  //   gains_W.push(1.0);
  //   uY_W.push(0.0);
  // }

  let X_CW = X_C.concat(X_W);

  zeroMean(X_CW, N, D);
  normalize(X_CW, N, D);
  zeroMean(X_I, N_I, D);
  normalize(X_I, N_I, D);

  console.time('Compute P');
  let P_CW = addon.computeGaussianPerplexity(X_CW, N, D, perplexity, K, N_I);
  let P_I = addon.computeGaussianPerplexity(X_I, N_I, D, perplexity, K, N_I);
  console.timeEnd('Compute P');

  // Lie about P value
  lieAboutPvalue(P_CW, N);
  lieAboutPvalue(P_I, N_I);
  lieAboutPvalue(P_W, N_W);

  for (let iter = 0; iter < max_iter; iter++) {
    // Update dY
    let dY_CW = addon.computeGradient(P_CW.row_P, P_CW.col_P, P_CW.val_P, Y, N, no_dims, theta).dY;
    let dY_I = addon.computeGradient(P_I.row_P, P_I.col_P, P_I.val_P, Y.slice(0, N_I * no_dims), N_I, no_dims, theta).dY;
    // let dY_W = addon.computeGradient(P_W.row_P, P_W.col_P, P_W.val_P, Y.slice(N_I * no_dims, N * no_dims), N_W, no_dims, theta).dY;
    // Update gains
    updateGains(gains_CW, dY_CW, uY_CW);
    updateGains(gains_I, dY_I, uY_I);
    // updateGains(gains_W, dY_W, uY_W);

    // Perform gradient update (with momentum and gains)
    updateGradient(gains_CW, dY_CW, uY_CW, momentum, eta);
    updateGradient(gains_I, dY_I, uY_I, momentum, eta);
    // updateGradient(gains_W, dY_W, uY_W, momentum, eta);

    for (let i = 0; i < N * no_dims; i++) {
      if (i < N_I * no_dims) {
        // Y[i] = Y[i] + (W_iw * uY_CW[i]) + (W_ii * uY_I[i]);
        Y[i] = Y[i] + (weight * uY_CW[i]) + (1-weight) * uY_I[i];
      }
      else {
        // Y[i] = Y[i] + (W_wi * uY_CW[i]) + (W_ww * uY_W[i - (N_I * no_dims)]);
      }
    }

    // Make solution zero-mean
    zeroMean(Y, N, no_dims);

    // Stop lying about the P-values after a while, and switch momentum
    if (iter == stop_lying_iter) {
      restorePvalue(P_CW, N);
      restorePvalue(P_I, N_I);
      // restorePvalue(P_W, N_W);
    }

    if (iter == mom_switch_iter) momentum = final_momentum;
    if (iter % 50 === 0 || iter === max_iter - 1) {
      let error_CW = addon.evaluateError(P_CW.row_P, P_CW.col_P, P_CW.val_P, Y, N, no_dims, theta);
      let error_I = addon.evaluateError(P_I.row_P, P_I.col_P, P_I.val_P, Y.slice(0, N_I * no_dims), N_I, no_dims, theta);
      // let error_W = addon.evaluateError(P_W.row_P, P_W.col_P, P_W.val_P, Y.slice(N_I * no_dims, N * no_dims), N_W, no_dims, theta);
      console.log('Error CW:', error_CW, 'Error I:', error_I, 'Iteration:', iter);
    }
  }
  return Y;
};

module.exports = Xto2d;

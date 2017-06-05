let fs = require('fs');
let _ = require('lodash');

'use strict';

let return_v = false;
let v_val;

let writeResult = function(result) {
  fs.writeFileSync('result.json', result);
};

let dotProduct = function(vec1, vec2){
  let p = 0.0;
  if(vec1.length != vec2.length) return false;
  for(let i = 0; i < vec1.length; i++){
    p = p + vec1[i] * vec2[i];
  }
  return p;
}

let cosineDistance = function(vec1, vec2){
  if(dotProduct(vec1, vec2) == 0) return 0;
  return dotProduct(vec1, vec2) / Math.sqrt((dotProduct(vec1, vec1) * dotProduct(vec2, vec2)));
}

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
  return factor;
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
  X = _.flatten(X);
  let Y = [];
  let gains = [], uY = [];
  let perplexity = 40;
  let K = Math.min(N - 1, perplexity * 3);
  let theta = 0.5;
  let stop_lying_iter = 250, mom_switch_iter = 250;
  let momentum = 0.5, final_momentum = 0.8;
  let eta = 200.0;
  let N_I = metric === 'cosine' ? 0 : N;
  max_iter = max_iter || 2000;
  for (let i = 0; i < N * no_dims; i++) {
    Y.push(gaussRandom());
    gains.push(1.0);
    uY.push(0.0);
  }
  zeroMean(X, N, D);
  normalize(X, N, D);
  let scale = 1;
  console.time('Compute P');
  let index_length = [1, 1];
  let caption_index = [0, 0];
  //console.log(X);
  let P = addon.computeGaussianPerplexity(X, N, D, perplexity, K, N_I, caption_index, index_length);
  console.timeEnd('Compute P');

  // Lie about P value
  lieAboutPvalue(P, N);

  for (let iter = 0; iter < max_iter; iter++) {
    // Update dY
    let dY = addon.computeGradient(P.row_P, P.col_P, P.val_P, Y, N, no_dims, theta, scale).dY;
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
      let error = addon.evaluateError(P.row_P, P.col_P, P.val_P, Y, N, no_dims, theta, scale);
      console.log('Error:', error, 'Iteration:', iter);
    }
  }
  zeroMean(Y, N, no_dims);
  normalize(Y, N, no_dims);
  return Y;
  //return { Y, P, uY, gains };
};

let geometricMedian = function(imageList, imagePositions, k){
  let images = imageList, points = imagePositions;
  let length = k, index = 0, maxD = 0.0;
  if(length == 0){
    return {px : 0.0, py : 0.0}
  }
  let eps = 0.0001;
  let step = 0.1;
  let px = 0.0, py = 0.0, similarities = [], sumSimilartity = 0.0;
  for(let i = 0; i < length; i++){
    let similarity = images[i].similarity;
    if(similarity < 0.0001){
      images[i].similarity = 0.0001;
      similarity = 0.0001
    }
    let index = images[i].index;
    px = px + points[index][0] * similarity;
    py = py + points[index][1] * similarity;
    similarities.push(similarity);
    sumSimilartity = sumSimilartity + similarity;
  }
  if(sumSimilartity !== 0){
    px = px / sumSimilartity;
    py = py / sumSimilartity;
  }
  let sumDis = 0.0;
  for(let i = 0; i < length; i++){
    let dx = points[images[i].index][0] - px;
    let dy = points[images[i].index][1] - py;
    sumDis = sumDis + Math.sqrt(dx * dx + dy * dy) * similarities[i];
  }
  if(length < 2){
    return {px : px, py : py, maxDIndex : 0, maxD : 0};
  }
  if(length === 2){
    let index = 0;
    if(similarities[0] > similarities[1]){
      index = 1;
    }
    return {px : px, py : py, maxDIndex : index, maxD : sumDis / 2 * similarities[index]};
  }
  while(step > eps){
    let nx = 0.0, ny = 0.0;
    for(let i = 0; i < length; i++){
      let dx = points[images[i].index][0] - px;
      let dy = points[images[i].index][1] - py;
      if(Math.sqrt(dx * dx + dy * dy) !== 0){
        nx = nx + dx / Math.sqrt(dx * dx + dy * dy) * similarities[i];
        ny = ny + dy / Math.sqrt(dx * dx + dy * dy) * similarities[i];
      }
    }
    if(Math.sqrt(nx * nx + ny * ny) === 0) break;
    px = px + step * nx / Math.sqrt(nx * nx + ny * ny);
    py = py + step * ny / Math.sqrt(nx * nx + ny * ny);
    let sumdis = 0.0;
    for(let i = 0; i < length; i++){
      let dx = points[images[i].index][0] - px;
      let dy = points[images[i].index][1] - py;
      sumdis = sumdis + Math.sqrt(dx * dx + dy * dy) * similarities[i];
    }
    if(sumdis > sumDis){step = step / 2;}
    if(sumdis === sumDis){step = step / 2;}
    sumDis = sumdis;
  }
  for(let i = 0; i < length; i++){
    let dx = points[images[i].index][0] - px;
    let dy = points[images[i].index][1] - py;
    if(Math.sqrt(dx * dx + dy * dy) > maxD){
      maxD = Math.sqrt(dx * dx + dy * dy);
      index = i;
    }
  }
  return {x : px, y : py, maxD : maxD, maxDIndex : index};
}

let FindLocalStructures = function(wordImageList, imagePositions, minD, similarity){
  let imageConstructors = [], wordPositions = [], kk = 0;
  for(let i = 0; i < imagePositions.length; i++){
    imageConstructors.push([]);
  }
  for(let i = 0; i < wordImageList.length; i++){
    kk = wordImageList[i].length;
    for(let j = 0; j < wordImageList[i].length; j++){
      if(wordImageList[i][j].similarity < similarity){
        kk = j + 1;
        break;
      }
    }
    let p = geometricMedian(wordImageList[i], imagePositions, kk);
    while(p.maxD > minD){
      wordImageList[i].splice(p.maxDIndex, 1);
      kk = kk - 1;
      p = geometricMedian(wordImageList[i], imagePositions, kk);
    }
    wordPositions.push([p.x, p.y]);
    for(let j = 0; j < kk; j++){
      let index = wordImageList[i][j].index;
      let dx = imagePositions[index][0] - p.x;
      let dy = imagePositions[index][1] - p.y;
      let dd = dx * dx + dy * dy;
      imageConstructors[index].push({index : i, similarity : wordImageList[i][j].similarity, dx : dx, dy : dy, dd : dd});
    }
    console.log(i);
  }
  for(let i = 0; i < imagePositions.length; i++){
    // for(let j < 0; j < wordPositions.length; j++){
    //   let dx = imagePositions[index][0] - p.x;
    //   let dy = imagePositions[index][1] - p.y;
    //   let dd = dx * dx + dy * dy;
    //   if(dd < minD * minD){

    //   }
    // }
    imageConstructors[i].sort((a, b)=>a.dd - b.dd);
  }
  console.log('FindLocalStructures');
  return {imageConstructors : imageConstructors, wordPositions : wordPositions};
}

let getWordLocalCorrelation = function(wordsLength, imageConstructors){
  let localFrequency = [], localInfluence = [], localConfidence = [];//Y_I.slice(0);
  for(let i = 0; i < wordsLength; i++){
    localInfluence.push(0.0);
    localFrequency.push([]);
    localConfidence.push([]);
    for(let j = 0; j < wordsLength; j++){
      localFrequency[i].push(0.0);
      localConfidence[i].push(0.0);
    }
  }
  for(let i = 0; i < imageConstructors.length; i++){
    for(let j = 0; j < imageConstructors[i].length; j++){
      let index1 = imageConstructors[i][j].index;
      localInfluence[index1] = localInfluence[index1] + 1;
      for(let k = j + 1; k < imageConstructors[i].length; k++){
        let index2 = imageConstructors[i][k].index;
        localFrequency[index1][index2] = localFrequency[index2][index1] = localFrequency[index1][index2] + 1;
      }
    }
  }
  for(let i = 0; i < localInfluence.length; i++){
    if(localInfluence[i] === 0){continue;}
    for(let j = 0; j < localInfluence.length; j++){localConfidence[i][j] = localFrequency[i][j] / localInfluence[i];}
  }
  console.log('getWordLocalCorrelation');
  return {localInfluence : localInfluence, localFrequency : localFrequency, localConfidence : localConfidence};
}

let getWordConstructors = function(wordPositions, localConfidence, minConfidence, minD){
  let wordConstructors = [], maxConfidence = minConfidence, length = wordPositions.length;
  for(let i = 0; i < length; i++){
    let constructors = [];
    for(let j = 0; j < length; j++){
      let dx = wordPositions[i][0] - wordPositions[j][0], dy = wordPositions[i][1] - wordPositions[j][1];
      if(dx * dx + dy * dy > minD * minD * 2){continue;}
      if(localConfidence[i][j] > maxConfidence && localConfidence[i][j] > localConfidence[j][i]){constructors.push({index : j, dx : dx, dy : dy, confidence : localConfidence[i][j], dd : dx * dx + dy * dy});}
    }
    constructors.sort((a, b)=>{
      let flag = -1;
      if(a.confidence < b.confidence){ flag = 1; }
      else if(a.confidence === b.confidence && a.dd > b.dd){ flag = 1; }
      return flag;
    })
    wordConstructors.push(constructors);
  }
  console.log('getWordConstructors');
  return wordConstructors;
}

let Construction = function(i, wordPositions_, wordProjections, wordConstructors){
  // console.log('constructing word', i);
  if(wordPositions_[i][0] !== undefined){return;}
  if(wordConstructors[i].length === 0){
    wordPositions_[i][0] = wordProjections[i][0];
    wordPositions_[i][1] = wordProjections[i][1];
    return;
  }
  let index = wordConstructors[i][0].index;
  Construction(index, wordPositions_, wordProjections, wordConstructors);
  wordPositions_[i][0] = wordPositions_[index][0] + wordConstructors[i][0].dx;
  wordPositions_[i][1] = wordPositions_[index][1] + wordConstructors[i][0].dy;
  return;
}

let reconstructImagePositions = function(wordPositions_, imageConstructors){
  let imagePositions_ = [];
  for(let i = 0; i < imageConstructors.length; i++){
    if(imageConstructors[i].length === 0){
      imagePositions_.push([undefined, undefined]);
      continue;
    }
    let index = imageConstructors[i][0].index;
    imagePositions_.push([wordPositions_[index][0] + imageConstructors[i][0].dx, wordPositions_[index][1] + imageConstructors[i][0].dy]);
  }
  console.log('reconstructImagePositions')
  return imagePositions_;
}

let result = {};
result.reconstructWord = function (wordConstructors, imageConstructors, wordProjections) {
  console.log('reconstructing');
  let wordPositions_ = [];
  for (let i = 0; i < wordProjections.length; i++) {
    wordPositions_.push([]);
  }
  for (let i = 0; i < wordProjections.length; i++) {
    Construction(i, wordPositions_, wordProjections, wordConstructors);
  }
  let imagePositions_ = reconstructImagePositions(wordPositions_, imageConstructors);
  return { image: imagePositions_, word: wordPositions_ };
};

result.reConstructImage = function (wordPositions_, imageConstructors) {
  console.log("reConstructImage");
  let imagePositions_ = reconstructImagePositions(wordPositions_, imageConstructors);
  return { image: imagePositions_, word: wordPositions_ };
}

module.exports = result;

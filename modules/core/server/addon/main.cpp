#include <node.h>
#include <math.h>
#include <float.h>
#include <stdlib.h>
#include <stdio.h>
#include <cstring>
#include <time.h>
#include <iostream>
#include "vptree.h"
#include "quadtree.h"

namespace demo {

using v8::Exception;
using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::Context;
using v8::Number;
using v8::Object;
using v8::Array;
using v8::String;
using v8::Value;

template <class T> void assign_array(T* X, Local<Array>& list) {
  for (int i = 0; i < list->Length(); i++){
    X[i] = list->Get(i)->NumberValue();
  }
}

// Generates a Gaussian random number
double randn() {
    double x, y, radius;
    do {
        x = 2 * (rand() / ((double) RAND_MAX + 1)) - 1;
        y = 2 * (rand() / ((double) RAND_MAX + 1)) - 1;
        radius = (x * x) + (y * y);
    } while ((radius >= 1.0) || (radius == 0.0));
    radius = sqrt(-2 * log(radius) / radius);
    x *= radius;
    y *= radius;
    return x;
}

// Makes data zero-mean
void zeroMean(double* X, int N, int D) {

    // Compute data mean
    double* mean = (double*) calloc(D, sizeof(double));
    if (mean == NULL) { printf("Memory allocation failed!\n"); exit(1); }
    for (int n = 0; n < N; n++) {
        for (int d = 0; d < D; d++) {
            mean[d] += X[n * D + d];
        }
    }
    for (int d = 0; d < D; d++) {
        mean[d] /= (double) N;
    }

    // Subtract data mean
    for (int n = 0; n < N; n++) {
        for (int d = 0; d < D; d++) {
            X[n * D + d] -= mean[d];
        }
    }
    free(mean); mean = NULL;
}

void symmetrizeMatrix(int** _row_P, int** _col_P, double** _val_P, int N) {

    // Get sparse matrix
    int* row_P = *_row_P;
    int* col_P = *_col_P;
    double* val_P = *_val_P;

    // Count number of elements and row counts of symmetric matrix
    int* row_counts = (int*) calloc(N, sizeof(int));
    if (row_counts == NULL) { printf("Memory allocation failed!\n"); exit(1); }
    for (int n = 0; n < N; n++) {
        for (int i = row_P[n]; i < row_P[n + 1]; i++) {

            // Check whether element (col_P[i], n) is present
            bool present = false;
            for (int m = row_P[col_P[i]]; m < row_P[col_P[i] + 1]; m++) {
                if (col_P[m] == n) present = true;
            }
            if (present) row_counts[n]++;
            else {
                row_counts[n]++;
                row_counts[col_P[i]]++;
            }
        }
    }
    int no_elem = 0;
    for (int n = 0; n < N; n++) no_elem += row_counts[n];

    // Allocate memory for symmetrized matrix
    int*    sym_row_P = (int*)    malloc((N + 1) * sizeof(int));
    int*    sym_col_P = (int*)    malloc(no_elem * sizeof(int));
    double* sym_val_P = (double*) malloc(no_elem * sizeof(double));
    if (sym_row_P == NULL || sym_col_P == NULL || sym_val_P == NULL) { printf("Memory allocation failed!\n"); exit(1); }

    // Construct new row indices for symmetric matrix
    sym_row_P[0] = 0;
    for (int n = 0; n < N; n++) sym_row_P[n + 1] = sym_row_P[n] + row_counts[n];

    // Fill the result matrix
    int* offset = (int*) calloc(N, sizeof(int));
    if (offset == NULL) { printf("Memory allocation failed!\n"); exit(1); }
    for (int n = 0; n < N; n++) {
        for (int i = row_P[n]; i < row_P[n + 1]; i++) {                                 // considering element(n, col_P[i])

            // Check whether element (col_P[i], n) is present
            bool present = false;
            for (int m = row_P[col_P[i]]; m < row_P[col_P[i] + 1]; m++) {
                if (col_P[m] == n) {
                    present = true;
                    if (n <= col_P[i]) {                                                // make sure we do not add elements twice
                        sym_col_P[sym_row_P[n]        + offset[n]]        = col_P[i];
                        sym_col_P[sym_row_P[col_P[i]] + offset[col_P[i]]] = n;
                        sym_val_P[sym_row_P[n]        + offset[n]]        = val_P[i] + val_P[m];
                        sym_val_P[sym_row_P[col_P[i]] + offset[col_P[i]]] = val_P[i] + val_P[m];
                    }
                }
            }

            // If (col_P[i], n) is not present, there is no addition involved
            if (!present) {
                sym_col_P[sym_row_P[n]        + offset[n]]        = col_P[i];
                sym_col_P[sym_row_P[col_P[i]] + offset[col_P[i]]] = n;
                sym_val_P[sym_row_P[n]        + offset[n]]        = val_P[i];
                sym_val_P[sym_row_P[col_P[i]] + offset[col_P[i]]] = val_P[i];
            }

            // Update offsets
            if (!present || (present && n <= col_P[i])) {
                offset[n]++;
                if (col_P[i] != n) offset[col_P[i]]++;
            }
        }
    }

    // Divide the result by two
    for (int i = 0; i < no_elem; i++) sym_val_P[i] /= 2.0;

    // Return symmetrized matrices
    free(*_row_P); *_row_P = sym_row_P;
    free(*_col_P); *_col_P = sym_col_P;
    free(*_val_P); *_val_P = sym_val_P;

    // Free up some memery
    free(offset); offset = NULL;
    free(row_counts); row_counts  = NULL;
}

// Compute input similarities with a fixed perplexity using ball trees (this function allocates memory another function should free)
// Accept X, N, D, perplexity, K, N_I
void ComputeGaussianPerplexity(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  double* X;
  Local<Array> list = Local<Array>::Cast(args[0]);
  X = (double*) malloc(list->Length() * sizeof(double));
  if (X == NULL) {
    printf("Memory allocation failed!\n");
  }
  assign_array(X, list);
  int N = args[1]->NumberValue();
  int D = args[2]->NumberValue();
  int perplexity = args[3]->NumberValue();
  int K = args[4]->NumberValue();
  int N_I = args[5]->NumberValue();
  int N_W = N - N_I;
  int* row_P = 0;
  int* col_P = 0; 
  double* val_P = 0;

  bool only_image = (N_I == N) ? true : false;
  bool caption_and_word = (N_I > 0 && N_W > 0) ? true : false;
  bool only_word = (N_W == N) ? true : false;

  // Allocate the memory we need
  row_P = (int*)    malloc((N + 1) * sizeof(int));
  col_P = (int*)    calloc(N * K, sizeof(int));
  val_P = (double*) calloc(N * K, sizeof(double));
  if (row_P == NULL || col_P == NULL || val_P == NULL) { 
    printf("Memory allocation failed!\n");
  }

  row_P[0] = 0;
  for (int i = 0; i < N; i++) {
    row_P[i + 1] = row_P[i] + K;
  }

  // Build ball tree on data set
  VpTree<DataPoint, unify_distance>* tree = new VpTree<DataPoint, unify_distance>();
  std::vector<DataPoint> obj_X(N, DataPoint(D, -1, X));
  if (only_image) {
    printf("Compute image similarities\n");
    for (int n = 0; n < N; n++) {
      obj_X[n] = DataPoint(D, n, X + n * D, image);
    }
  }
  else if (only_word) {
    printf("Compute word similarities\n");
    for (int n = 0; n < N; n++) {
      obj_X[n] = DataPoint(D, n, X + n * D, word);
    }
  }
  else if (caption_and_word) {
    printf("Compute caption and word similarities\n");
    for (int n = 0; n < N_I; n++) {
      obj_X[n] = DataPoint(D, n, X + n * D, caption_word);
    }
    for (int n = N_I; n < N; n++) {
      obj_X[n] = DataPoint(D, n, X + n * D, word_caption);
    }
  }
  else {
    printf("Wrong data\n");
    exit(1);
  }
  tree->create(obj_X);

  // Loop over all points to find nearest neighbors
  printf("Building tree...\n");

  int steps_completed = 0;
  for (int n = 0; n < N; n++)
  {
    std::vector<double> cur_P(K);
    std::vector<DataPoint> indices;
    std::vector<double> distances;

    // Find nearest neighbors
    tree->search(obj_X[n], K + 1, &indices, &distances);

    // Initialize some variables for binary search
    bool found = false;
    double beta = 1.0;
    double min_beta = -std::numeric_limits<double>::max();
    double max_beta = std::numeric_limits<double>::max();
    double tol = 1e-5;

    // Iterate until we found a good perplexity
    int iter = 0; double sum_P;
    while (!found && iter < 200) {

      // Compute Gaussian kernel row
      for (int m = 0; m < K; m++) {
        cur_P[m] = exp(-beta * distances[m + 1]);
      }

      // Compute entropy of current row
      sum_P = std::numeric_limits<double>::min();
      for (int m = 0; m < K; m++) {
        sum_P += cur_P[m];
      }
      double H = .0;
      for (int m = 0; m < K; m++) {
        H += beta * (distances[m + 1] * cur_P[m]);
      }
      H = (H / sum_P) + log(sum_P);

      // Evaluate whether the entropy is within the tolerance level
      double Hdiff = H - log(perplexity);
      if (Hdiff < tol && -Hdiff < tol) {
        found = true;
      }
      else {
        if (Hdiff > 0) {
          min_beta = beta;
          if (max_beta == std::numeric_limits<double>::max() || max_beta == -std::numeric_limits<double>::max())
            beta *= 2.0;
          else
            beta = (beta + max_beta) / 2.0;
        }
        else {
          max_beta = beta;
          if (min_beta == -std::numeric_limits<double>::max() || min_beta == std::numeric_limits<double>::max())
            beta /= 2.0;
          else
            beta = (beta + min_beta) / 2.0;
        }
      }

        // Update iteration counter
        iter++;
    }

    // Row-normalize current row of P and store in matrix
    for (int m = 0; m < K; m++) {
        cur_P[m] /= sum_P;
    }
    for (int m = 0; m < K; m++) {
        col_P[row_P[n] + m] = indices[m + 1].index();
        val_P[row_P[n] + m] = cur_P[m];
    }

    // Print progress
    ++steps_completed;

    if (steps_completed % 10000 == 0)
    {
        printf(" - point %d of %d\n", steps_completed, N);
    }
  }

  // Clean up memory
  obj_X.clear();
  delete tree;

  // Symmetrize input similarities
  symmetrizeMatrix(&row_P, &col_P, &val_P, N);
  double sum_P = .0;
  for (int i = 0; i < row_P[N]; i++) {
      sum_P += val_P[i];
  }
  for (int i = 0; i < row_P[N]; i++) {
      val_P[i] /= sum_P;
  }

  Local<Context> context = isolate->GetCurrentContext();
  Local<Object> result = Object::New(isolate);
  Local<Array> row_Plist = Array::New(isolate);
  Local<Array> col_Plist = Array::New(isolate);
  Local<Array> val_Plist = Array::New(isolate);
  for (unsigned int i = 0; i < N + 1; i++) {
    row_Plist->Set(i, Number::New(isolate, row_P[i]));
  }
  for (unsigned int i = 0; i < row_P[N]; i++) {
    col_Plist->Set(i, Number::New(isolate, col_P[i]));
    val_Plist->Set(i, Number::New(isolate, val_P[i]));
  }
  result->Set(context, String::NewFromUtf8(isolate,"row_P"), row_Plist);
  result->Set(context, String::NewFromUtf8(isolate,"col_P"), col_Plist);
  result->Set(context, String::NewFromUtf8(isolate,"val_P"), val_Plist);

  free(X); 
  free(row_P);
  free(col_P);
  free(val_P);
  X = NULL;
  row_P = NULL;
  col_P = NULL;
  val_P = NULL;

  args.GetReturnValue().Set(result);
}

// Compute gradient of the t-SNE cost function (using Barnes-Hut algorithm)
void ComputeGradient(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  int *inp_row_P, *inp_col_P;
  double *inp_val_P, *Y, *dC, theta;
  int N, D;
  Local<Array> list1 = Local<Array>::Cast(args[0]);
  Local<Array> list2 = Local<Array>::Cast(args[1]);
  Local<Array> list3 = Local<Array>::Cast(args[2]);
  Local<Array> list4 = Local<Array>::Cast(args[3]);
  inp_row_P = (int*) malloc(list1->Length() * sizeof(int));
  inp_col_P = (int*) malloc(list2->Length() * sizeof(int));
  inp_val_P = (double*) malloc(list3->Length() * sizeof(double));
  Y = (double*) malloc(list4->Length() * sizeof(double));
  assign_array(inp_row_P, list1);
  assign_array(inp_col_P, list2);
  assign_array(inp_val_P, list3);
  assign_array(Y, list4);
  N = args[4]->NumberValue();
  D = args[5]->NumberValue();
  theta = args[6]->NumberValue();
  // Allocate some memory
  dC = (double*) malloc(N * D * sizeof(double));

  // Construct quadtree on current map
  QuadTree* tree = new QuadTree(Y, N);

  // Compute all terms required for t-SNE gradient
  double sum_Q = .0;
  double* pos_f = (double*) calloc(N * D, sizeof(double));
  double* neg_f = (double*) calloc(N * D, sizeof(double));
  if (pos_f == NULL || neg_f == NULL) { 
    printf("Memory allocation failed!\n"); 
  }
  tree->computeEdgeForces(inp_row_P, inp_col_P, inp_val_P, N, pos_f);

  for (int n = 0; n < N; n++) {
    double* buff;
    buff = (double*)malloc(D * sizeof(double));
    double this_Q = .0;
    tree->computeNonEdgeForces(n, theta, neg_f + n * D, &this_Q, &buff[0]);
    sum_Q += this_Q;
    free(buff);
    buff = NULL;
  }

  // Compute final t-SNE gradient
  for (int i = 0; i < N * D; i++) {
    dC[i] = pos_f[i] - (neg_f[i] / sum_Q);
  }
  free(pos_f);
  free(neg_f);
  delete tree;

  Local<Context> context = isolate->GetCurrentContext();
  Local<Object> result = Object::New(isolate);
  Local<Array> dY = Array::New(isolate);
  for (unsigned int i = 0; i < N * D; i++) {
    dY->Set(i, Number::New(isolate, dC[i]));
  }
  result->Set(context, String::NewFromUtf8(isolate,"dY"), dY);

  free(inp_row_P);
  free(inp_col_P);
  free(inp_val_P);
  free(Y);
  free(dC);
  inp_row_P = NULL;
  inp_col_P = NULL;
  inp_val_P = NULL;
  Y = NULL;
  dC = NULL;

  args.GetReturnValue().Set(result);
}

void EvaluateError(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  int *row_P, *col_P;
  double *val_P, *Y, theta;
  int N, D;
  Local<Array> list1 = Local<Array>::Cast(args[0]);
  Local<Array> list2 = Local<Array>::Cast(args[1]);
  Local<Array> list3 = Local<Array>::Cast(args[2]);
  Local<Array> list4 = Local<Array>::Cast(args[3]);
  row_P = (int*) malloc(list1->Length() * sizeof(int));
  col_P = (int*) malloc(list2->Length() * sizeof(int));
  val_P = (double*) malloc(list3->Length() * sizeof(double));
  Y = (double*) malloc(list4->Length() * sizeof(double));
  assign_array(row_P, list1);
  assign_array(col_P, list2);
  assign_array(val_P, list3);
  assign_array(Y, list4);
  N = args[4]->NumberValue();
  D = args[5]->NumberValue();
  theta = args[6]->NumberValue();

  // Get estimate of normalization term
  const int QT_NO_DIMS = 2;
  QuadTree* tree = new QuadTree(Y, N);
  double buff[QT_NO_DIMS] = {.0, .0};
  double sum_Q = .0;
  for (int n = 0; n < N; n++) {
    double buff1[QT_NO_DIMS];
    tree->computeNonEdgeForces(n, theta, buff, &sum_Q, &buff1[0]);
  }

  // Loop over all edges to compute t-SNE error
  int ind1, ind2;
  double C = .0, Q;
  for (int n = 0; n < N; n++) {
    ind1 = n * QT_NO_DIMS;
    for (int i = row_P[n]; i < row_P[n + 1]; i++) {
      Q = .0;
      ind2 = col_P[i] * QT_NO_DIMS;
      for (int d = 0; d < QT_NO_DIMS; d++) buff[d]  = Y[ind1 + d];
      for (int d = 0; d < QT_NO_DIMS; d++) buff[d] -= Y[ind2 + d];
      for (int d = 0; d < QT_NO_DIMS; d++) Q += buff[d] * buff[d];
      Q = (1.0 / (1.0 + Q)) / sum_Q;
      C += val_P[i] * log((val_P[i] + FLT_MIN) / (Q + FLT_MIN));
    }
  }

  free(Y);
  free(row_P);
  free(col_P);
  free(val_P);
  Y = NULL;
  row_P = NULL;
  col_P = NULL;
  val_P = NULL;

  args.GetReturnValue().Set(Number::New(isolate, C));
}

void Init(Local<Object> exports) {
  NODE_SET_METHOD(exports, "computeGaussianPerplexity", ComputeGaussianPerplexity);
  NODE_SET_METHOD(exports, "computeGradient", ComputeGradient);
  NODE_SET_METHOD(exports, "evaluateError", EvaluateError);
}

NODE_MODULE(addon, Init)

}  // namespace demo
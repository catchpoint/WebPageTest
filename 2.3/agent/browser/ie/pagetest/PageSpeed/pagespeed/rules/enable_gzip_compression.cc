// Copyright 2009 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#include "pagespeed/rules/enable_gzip_compression.h"

#include <string>

#include "base/logging.h"
#include "base/string_util.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/core/resource_util.h"
#include "pagespeed/core/result_provider.h"
#include "pagespeed/proto/pagespeed_output.pb.h"
#ifdef USE_SYSTEM_ZLIB
#include "zlib.h"
#else
#include "third_party/zlib/zlib.h"
#endif

namespace {

// Minimum number of bytes before it's typically a win to apply gzip
// to a resource. Below this size, the cost of gzip overhead typically
// outweighs the benefits of gzip compression (i.e. the compressed
// resource is larger than the uncompressed resource).
const size_t kMinGzipSize = 150;

}  // namespace

namespace pagespeed {

namespace rules {

namespace {

class GzipMinifier : public Minifier {
 public:
  explicit GzipMinifier(SavingsComputer* computer) : computer_(computer) {
    CHECK(NULL != computer) << "SavingsComputer must be non-null.";
  }

  // Minifier interface:
  virtual const char* name() const;
  virtual const char* header_format() const;
  virtual const char* documentation_url() const;
  virtual const char* body_format() const;
  virtual const char* child_format() const;
  virtual const MinifierOutput* Minify(const Resource& resource) const;

 private:
  bool IsCompressed(const Resource& resource) const;
  bool IsViolation(const Resource& resource) const;

  scoped_ptr<SavingsComputer> computer_;

  DISALLOW_COPY_AND_ASSIGN(GzipMinifier);
};

const char* GzipMinifier::name() const {
  return "EnableGzipCompression";
}

const char* GzipMinifier::header_format() const {
  return "Enable compression";
}

const char* GzipMinifier::documentation_url() const {
  return "payload.html#GzipCompression";
}

const char* GzipMinifier::body_format() const {
  return ("Compressing the following resources with gzip could reduce their "
          "transfer size by $1 ($2% reduction).");
}

const char* GzipMinifier::child_format() const {
  return "Compressing $1 could save $2 ($3% reduction).";
}

const MinifierOutput* GzipMinifier::Minify(const Resource& resource) const {
  if (!IsViolation(resource)) {
    return new MinifierOutput();
  }
  Savings savings;
  if (computer_->ComputeSavings(resource, &savings)) {
    return new MinifierOutput(savings.response_bytes_saved());
  } else {
    return NULL; // error
  }
}

bool GzipMinifier::IsCompressed(const Resource& resource) const {
  const std::string& encoding = resource.GetResponseHeader("Content-Encoding");

  // HTTP allows Content-Encodings to be "stacked" in which case they
  // are comma-separated. Instead of splitting on commas and checking
  // each token, we just see if a valid known encoding appears in the
  // header, and if so, assume that encoding was applied to the
  // response.
  return encoding.find("gzip") != std::string::npos ||
      encoding.find("deflate") != std::string::npos;
}

bool GzipMinifier::IsViolation(const Resource& resource) const {
  return (!IsCompressed(resource) &&
          resource_util::IsCompressibleResource(resource) &&
          resource.GetResponseBody().size() >= kMinGzipSize);
}

class EnableCompressionScoreComputer : public CostBasedScoreComputer {
 public:
  EnableCompressionScoreComputer(const ResultVector* results,
                                 int64 max_possible_cost);
  virtual ~EnableCompressionScoreComputer();

 protected:
  virtual int64 ComputeCost();

 private:
  const ResultVector* const results_;
};

EnableCompressionScoreComputer::EnableCompressionScoreComputer(
    const ResultVector* results, int64 max_possible_cost)
    : CostBasedScoreComputer(max_possible_cost),
      results_(results) {
}

EnableCompressionScoreComputer::~EnableCompressionScoreComputer() {}

int64 EnableCompressionScoreComputer::ComputeCost() {
  int64 total_cost = 0;
  for (std::vector<const Result*>::const_iterator iter = results_->begin(),
           end = results_->end();
       iter != end;
       ++iter) {
    const Result* result = *iter;
    total_cost += result->original_response_bytes();
  }

  return total_cost;
}

}  // namespace

EnableGzipCompression::EnableGzipCompression(SavingsComputer* computer)
    : MinifyRule(new GzipMinifier(computer)) {}

int EnableGzipCompression::ComputeScore(const InputInformation& input_info,
                                        const ResultVector& results) {
  EnableCompressionScoreComputer score_computer(
      &results, resource_util::ComputeCompressibleResponseBytes(input_info));
  return score_computer.ComputeScore();
}

namespace compression_computer {

bool ZlibComputer::ComputeSavings(const pagespeed::Resource& resource,
                                  pagespeed::Savings* savings) {
  z_stream c_stream; /* compression stream */
  c_stream.zalloc = (alloc_func)0;
  c_stream.zfree = (free_func)0;
  c_stream.opaque = (voidpf)0;

  int err = deflateInit2(
      &c_stream,
      Z_DEFAULT_COMPRESSION,
      Z_DEFLATED,
      31,  // window size of 15, plus 16 for gzip
      8,   // default mem level (no zlib constant exists for this value)
      Z_DEFAULT_STRATEGY);
  if (err != Z_OK) {
    LOG(INFO) << "Failed to deflateInit2: " << err;
    return false;
  }

  c_stream.next_in = reinterpret_cast<Bytef*>(
      const_cast<char*>(resource.GetResponseBody().data()));
  c_stream.avail_in = resource.GetResponseBody().size();

  int compressed_size = 0;
  bool result = GetCompressedSize(&c_stream, &compressed_size);

  // clean up.
  err = deflateEnd(&c_stream);
  if (err != Z_OK) {
    LOG(INFO) << "Failed to deflateEnd: " << err;
    return false;
  }

  savings->set_response_bytes_saved(
      resource.GetResponseBody().size() - compressed_size);
  return result;
}

bool ZlibComputer::GetCompressedSize(z_stream* c_stream, int* compressed_size) {
  scoped_array<char> buffer(new char[kBufferSize]);

  int err = Z_OK;
  bool finished = false;

  while (!finished) {
    c_stream->next_out = reinterpret_cast<Bytef*>(buffer.get());
    c_stream->avail_out = kBufferSize;
    err = deflate(c_stream, Z_FINISH);

    switch (err) {
      case Z_OK:
        break;

      case Z_STREAM_END:
        finished = true;
        break;

      default:
        LOG(INFO) << "GetCompressedSize encountered error: " << err;
        return false;
    }

    *compressed_size += (kBufferSize - c_stream->avail_out);
  }

  const bool success = (err == Z_STREAM_END);
  if (!success) {
    LOG(INFO) << "GetCompressedSize expected Z_STREAM_END, got " << err;
  }
  return success;
}

}  // namespace compression_computer

}  // namespace rules

}  // namespace pagespeed

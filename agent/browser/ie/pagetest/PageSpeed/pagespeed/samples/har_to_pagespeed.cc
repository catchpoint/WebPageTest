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

// Command line utility that runs lint rules on the provided input set.

#include <stdio.h>

#include <fstream>

#include "base/at_exit.h"
#include "base/logging.h"
#include "base/scoped_ptr.h"
#include "base/stl_util-inl.h"
#include "base/string_util.h"
#include "google/protobuf/io/zero_copy_stream_impl_lite.h"
#include "pagespeed/core/engine.h"
#include "pagespeed/core/pagespeed_init.h"
#include "pagespeed/core/pagespeed_input.h"
#include "pagespeed/core/resource.h"
#include "pagespeed/formatters/json_formatter.h"
#include "pagespeed/formatters/proto_formatter.h"
#include "pagespeed/formatters/text_formatter.h"
#include "pagespeed/har/http_archive.h"
#include "pagespeed/image_compression/image_attributes_factory.h"
#include "pagespeed/proto/pagespeed_output.pb.h"
#include "pagespeed/rules/rule_provider.h"

namespace {

// UTF-8 byte order mark.
const char* kUtf8Bom = "\xEF\xBB\xBF";
const size_t kUtf8BomSize = strlen(kUtf8Bom);

bool ReadFileToString(const std::string &file_name, std::string *dest) {
  std::ifstream file_stream;
  file_stream.open(
      file_name.c_str(), std::ifstream::in | std::ifstream::binary);
  if (file_stream.fail()) {
    return false;
  }
  dest->assign(std::istreambuf_iterator<char>(file_stream),
               std::istreambuf_iterator<char>());
  file_stream.close();
  return true;
}

/**
 * Formatter that prints the binary ResultText protobuf output.
 */
class PrintProtoFormatter : public pagespeed::formatters::ProtoFormatter {
 public:
  PrintProtoFormatter() : ProtoFormatter(&results_) {}
  virtual ~PrintProtoFormatter() {
    STLDeleteContainerPointers(results_.begin(), results_.end());
  }

 protected:
  // Formatter interface
  virtual void DoneAddingChildren() {
    ProtoFormatter::DoneAddingChildren();

    for (std::vector<pagespeed::ResultText*>::const_iterator
             it = results_.begin(),
             end = results_.end();
         it != end;
         ++it) {
      std::string out;
      ::google::protobuf::io::StringOutputStream out_stream(&out);
      (*it)->SerializeToZeroCopyStream(&out_stream);
      std::cout << out;
    }
  }

 private:
  std::vector<pagespeed::ResultText*> results_;
};

void PrintUsage() {
  fprintf(stderr,
          "Usage: har_to_pagespeed <output_format> <input_file>\n"
          "       'output_format' can be either 'text' or 'json'.\n");
}

bool RunPagespeed(const std::string& out_format,
                  const std::string& in_format,
                  const std::string& filename) {
  std::string file_contents;
  if (!ReadFileToString(filename, &file_contents)) {
    fprintf(stderr, "Could not read input from %s\n", filename.c_str());
    PrintUsage();
    return false;
  }

  // TODO(lsong): Add support for byte order mark.
  // For now, strip byte order mark of the content if exists.
  if (file_contents.compare(0, kUtf8BomSize, kUtf8Bom) == 0) {
    file_contents.erase(0, kUtf8BomSize);
    LOG(INFO) << "Byte order mark ignored.";
  }

  scoped_ptr<pagespeed::RuleFormatter> formatter;
  if (out_format == "json") {
    formatter.reset(new pagespeed::formatters::JsonFormatter(&std::cout,
                                                             NULL));
  } else if (out_format == "proto") {
    formatter.reset(new PrintProtoFormatter);
  } else if (out_format == "text") {
    formatter.reset(new pagespeed::formatters::TextFormatter(&std::cout));
  } else {
    fprintf(stderr, "Invalid output format %s\n", out_format.c_str());
    PrintUsage();
    return false;
  }
  CHECK(formatter.get() != NULL);

  scoped_ptr<pagespeed::PagespeedInput> input;
  if (in_format == "har") {
    input.reset(pagespeed::ParseHttpArchive(file_contents));
  } else {
    fprintf(stderr, "Invalid input format %s\n", in_format.c_str());
    PrintUsage();
    return false;
  }
  CHECK(input.get() != NULL);
  if (input->primary_resource_url().empty() && input->num_resources() > 0) {
    // If no primary resource URL was specified, assume the first
    // resource is the primary resource.
    input->SetPrimaryResourceUrl(input->GetResource(0).GetRequestUrl());
  }

  input->AcquireImageAttributesFactory(
      new pagespeed::image_compression::ImageAttributesFactory());

  input->Freeze();

  std::vector<pagespeed::Rule*> rules;

  // In environments where exceptions can be thrown, use
  // STLElementDeleter to make sure we free the rules in the event
  // that they are not transferred to the Engine.
  STLElementDeleter<std::vector<pagespeed::Rule*> > rule_deleter(&rules);

  bool save_optimized_content = true;
  std::vector<std::string> incompatible_rule_names;
  pagespeed::rule_provider::AppendCompatibleRules(
      save_optimized_content,
      &rules,
      &incompatible_rule_names,
      input->EstimateCapabilities());
  if (!incompatible_rule_names.empty()) {
    std::string incompatible_rule_list =
        JoinString(incompatible_rule_names, ' ');
    LOG(INFO) << "Removing incompatible rules: " << incompatible_rule_list;
  }

  // Ownership of rules is transferred to the Engine instance.
  pagespeed::Engine engine(&rules);
  engine.Init();

  engine.ComputeAndFormatResults(*input.get(), formatter.get());
  return true;
}

}  // namespace

int main(int argc, char** argv) {
  if (argc != 3) {
    PrintUsage();
    return 1;
  }

  // Some of our code uses Singleton<>s, which require an
  // AtExitManager to schedule their destruction.
  base::AtExitManager at_exit_manager;

  pagespeed::Init();
  bool result = RunPagespeed(argv[1], "har", argv[2]);
  pagespeed::ShutDown();

  return result ? EXIT_SUCCESS : EXIT_FAILURE;
}

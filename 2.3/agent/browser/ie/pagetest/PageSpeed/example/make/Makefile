# Declare our phony targets.
.PHONY: all clean pagespeed_sdk

# Declare "all" target first so it is the default, even though we
# don't have the deps yet.
all:

#
# Rules needed to invoke the page speed SDK make build from our build
# file. We use recursive make since it's the easiest way to integrate
# with a different make project.
#

# Path to the root of the page speed build tree.
pagespeed_root_dir ?= ../..

# Specify BUILDTYPE=Debug on the command line for a debug build.
BUILDTYPE ?= Release

# Export this value since it's needed by the page speed SDK's make
# build which we invoke using recursive make (below).
export BUILDTYPE

# The following are used to specify the location of the generated
# libraries within the page speed SDK make build.
pagespeed_builddir ?= out/$(BUILDTYPE)
pagespeed_obj := $(pagespeed_builddir)/obj.target

# The page speed libraries we depend on.
PAGESPEED_LIBS := \
        base/libbase.a \
        pagespeed/core/libpagespeed_init.a \
        pagespeed/formatters/libpagespeed_formatters.a \
        pagespeed/har/libpagespeed_har.a \
        pagespeed/image_compression/libpagespeed_image_attributes_factory.a \
        pagespeed/libpagespeed_library.a \
        build/temp_gyp/libgoogleurl.a \
        third_party/instaweb/src/net/instaweb/libinstaweb_htmlparse_core.a \
        third_party/instaweb/src/net/instaweb/libinstaweb_util_core.a \
        third_party/protobuf2/libprotobuf_lite.a \
        pagespeed/core/libpagespeed_core.a \
        pagespeed/proto/libpagespeed_output_pb.a \
        third_party/modp_b64/libmodp_b64.a \
        third_party/cJSON/libcJSON.a \
        pagespeed/image_compression/libpagespeed_jpeg_reader.a \
        pagespeed/image_compression/libpagespeed_png_optimizer.a \
        third_party/optipng/libopngreduc.a \
        third_party/optipng/libpngxrgif.a \
        net/libnet_base.a \
        third_party/jsmin/libjsmin.a \
        pagespeed/cssmin/libpagespeed_cssmin.a \
        pagespeed/html/libpagespeed_html.a \
        third_party/instaweb/src/net/instaweb/libinstaweb_rewriter_html.a \
        pagespeed/image_compression/libpagespeed_jpeg_optimizer.a \
        third_party/libjpeg/libjpeg.a \
        third_party/libjpeg_trans/libjpeg_trans.a \
        third_party/libpng/libpng.a \
        third_party/zlib/libchrome_zlib.a

PAGESPEED_LIBS := $(addprefix $(pagespeed_obj)/, $(PAGESPEED_LIBS))

pagespeed_sdk:
	$(MAKE) -C $(pagespeed_root_dir) $(PAGESPEED_LIBS)

# Prepend the relative path to the pagespeed root dir, so we can
# reference their paths relative to this makefile.
PAGESPEED_DEPS := $(addprefix $(pagespeed_root_dir)/, $(PAGESPEED_LIBS))
$(PAGESPEED_DEPS) : pagespeed_sdk

#
# Next define our local build rules. Other projects may replace the
# content below with make rules to build their code.
#

# Use g++ by default.
CXX ?= g++
LINK ?= g++

DEFS_Debug := '-DGOOGLE_PROTOBUF_NO_RTTI' \
	'-DPAGESPEED_PNG_OPTIMIZER_GIF_READER' \
	'-D__STDC_FORMAT_MACROS' \
	'-DDYNAMIC_ANNOTATIONS_ENABLED=1' \
	'-D_DEBUG'

# Flags passed to both C and C++ files.
CFLAGS_Debug := -Werror \
	-pthread \
	-fno-exceptions \
	-Wall \
	-Wno-unused-parameter \
	-Wno-missing-field-initializers \
	-D_FILE_OFFSET_BITS=64 \
	-fvisibility=hidden \
	-fno-strict-aliasing \
	-O0 \
	-g

# Flags passed to only C (and not C++) files.
CFLAGS_C_Debug :=

# Flags passed to only C++ (and not C) files.
CFLAGS_CC_Debug := -fno-rtti \
	-fno-threadsafe-statics \
	-fvisibility-inlines-hidden

INCS_Debug := -I$(pagespeed_root_dir)/third_party/chromium/src \
	-I$(pagespeed_root_dir) \
	-I$(pagespeed_root_dir)/third_party/instaweb/src \
	-I$(pagespeed_root_dir)/third_party/protobuf2 \
	-I$(pagespeed_root_dir)/third_party/protobuf2/src/src

DEFS_Release := '-DGOOGLE_PROTOBUF_NO_RTTI' \
	'-DPAGESPEED_PNG_OPTIMIZER_GIF_READER' \
	'-D__STDC_FORMAT_MACROS' \
	'-DNDEBUG'

# Flags passed to both C and C++ files.
CFLAGS_Release := -Werror \
	-pthread \
	-fno-exceptions \
	-Wall \
	-Wno-unused-parameter \
	-Wno-missing-field-initializers \
	-D_FILE_OFFSET_BITS=64 \
	-fvisibility=hidden \
	-fno-strict-aliasing \
	-O2 \
	-fno-ident \
	-fdata-sections \
	-ffunction-sections \
	-fno-asynchronous-unwind-tables

# Flags passed to only C (and not C++) files.
CFLAGS_C_Release :=

# Flags passed to only C++ (and not C) files.
CFLAGS_CC_Release := -fno-rtti \
	-fno-threadsafe-statics \
	-fvisibility-inlines-hidden

INCS_Release := -I$(pagespeed_root_dir)/third_party/chromium/src \
	-I$(pagespeed_root_dir) \
	-I$(pagespeed_root_dir)/third_party/instaweb/src \
	-I$(pagespeed_root_dir)/third_party/protobuf2 \
	-I$(pagespeed_root_dir)/third_party/protobuf2/src/src

OBJS := har_to_pagespeed.o
$(OBJS): CFLAGS := $(CFLAGS_$(BUILDTYPE)) $(CFLAGS_C_$(BUILDTYPE)) $(DEFS_$(BUILDTYPE)) $(INCS_$(BUILDTYPE))
$(OBJS): CXXFLAGS := $(CFLAGS_$(BUILDTYPE)) $(CFLAGS_CC_$(BUILDTYPE)) $(DEFS_$(BUILDTYPE)) $(INCS_$(BUILDTYPE))
har_to_pagespeed.o: $(pagespeed_root_dir)/pagespeed/samples/har_to_pagespeed.cc
	$(CXX) $(CXXFLAGS) -c -o $@ $<


LDFLAGS_Debug := -pthread \
	-Wl,-z,noexecstack \
	-rdynamic

LDFLAGS_Release := -pthread \
	-Wl,-z,noexecstack \
	-Wl,--gc-sections

LIBS := -lrt \
	-lm

har_to_pagespeed: LDFLAGS := $(LDFLAGS_$(BUILDTYPE))
har_to_pagespeed: $(PAGESPEED_DEPS) har_to_pagespeed.o
	$(LINK) $(LDFLAGS) -o $@ -Wl,--start-group $(PAGESPEED_DEPS) $^ -Wl,--end-group $(LIBS)

clean:
	rm -rf har_to_pagespeed har_to_pagespeed.o $(pagespeed_root_dir)/$(pagespeed_builddir)

all: har_to_pagespeed

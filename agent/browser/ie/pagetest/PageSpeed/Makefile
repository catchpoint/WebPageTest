# The source directory tree.
srcdir := .

# The name of the builddir.
builddir_name ?= out

# We borrow heavily from the kernel build setup, though we are simpler since
# we don't have Kconfig tweaking settings on us.

# The implicit make rules have it looking for RCS files, among other things.
# We instead explicitly write all the rules we care about.
# It's even quicker (saves ~200ms) to pass -r on the command line.
MAKEFLAGS=-r

# The V=1 flag on command line makes us verbosely print command lines.
ifdef V
  quiet=
else
  quiet=quiet_
endif

# Specify BUILDTYPE=Debug on the command line for a debug build.
BUILDTYPE ?= Release

# Directory all our build output goes into.
# Note that this must be two directories beneath src/ for unit tests to pass,
# as they reach into the src/ directory for data with relative paths.
builddir ?= $(builddir_name)/$(BUILDTYPE)
abs_builddir := $(abspath $(builddir))
depsdir := $(builddir)/.deps

# Object output directory.
obj := $(builddir)/obj
abs_obj := $(abspath $(obj))

# We build up a list of every single one of the targets so we can slurp in the
# generated dependency rule Makefiles in one pass.
all_deps :=

# C++ apps need to be linked with g++.  Not sure what's appropriate.
#
# Note, the flock is used to seralize linking. Linking is a memory-intensive
# process so running parallel links can often lead to thrashing.  To disable
# the serialization, override LINK via an envrionment variable as follows:
#
#   export LINK="$(CXX)"
#
# This will allow make to invoke N linker processes as specified in -jN.
LINK ?= flock $(builddir)/linker.lock $(CXX)

# We want to use GNU ar's T option if available because it's much faster.
# We try to archive and link a file to see ar and ld support this feature.
define detect_arflags
$(shell     mkdir -p $(obj).$(1)/arflags;
    if echo 'int main(){}' > $(obj).$(1)/arflags/artest.c &&
       $(CXX.$(1)) -c $(obj).$(1)/arflags/artest.c -o $(obj).$(1)/arflags/artest.o> /dev/null 2>&1 &&
       $(AR.$(1)) crsT $(obj).$(1)/arflags/artest.a $(obj).$(1)/arflags/artest.o > /dev/null 2>&1 &&
       $(LINK.$(1)) $(obj).$(1)/arflags/artest.a -o $(obj).$(1)/arflags/artest > /dev/null 2>&1 ; then
      arflags=crsT;
    else
      arflags=crs;
    fi;
    echo ARFLAGS.$(1) := $$arflags > $(obj).$(1)/arflags/arflags.mk;
    echo $$arflags;
 )
endef

CC.target ?= $(CC)
CFLAGS.target ?= $(CFLAGS)
CXX.target ?= $(CXX)
CXXFLAGS.target ?= $(CXXFLAGS)
LINK.target ?= $(LINK)
LDFLAGS.target ?= $(LDFLAGS)
AR.target ?= $(AR)
# We detect arflags at compile-time (see detect_arflags above), but we
# don't want to run the detection multiple times. So, we
# - use $(obj).target/arflags/arflags.target.mk as the cache of the detection,
# - use := to avoid the right hand side multiple times, and
# - use ifeq instead of ?= because ?= is like ifeq and =, not ifeq and := .
-include $(obj).target/arflags/arflags.mk
# Temporarily disabling detect_arflags call due to a bug in gold with the
# detected flag.
# TODO(evan): reenable this once there is a release of gold > 2.20.1.
ARFLAGS.target := crs
ifeq ($(ARFLAGS.target),)
  ARFLAGS.target := $(call detect_arflags,target)
endif

CC.host ?= gcc
CFLAGS.host ?=
CXX.host ?= g++
CXXFLAGS.host ?=
LINK.host ?= g++
LDFLAGS.host ?=
AR.host ?= ar
# See the description for ARFLAGS.target.
-include $(obj).host/arflags/arflags.mk
# Temporarily disabled -- see ARFLAGS.target.
ARFLAGS.host := crs
ifeq ($(ARFLAGS.host),)
  ARFLAGS.host := $(call detect_arflags,host)
endif

# Flags to make gcc output dependency info.  Note that you need to be
# careful here to use the flags that ccache and distcc can understand.
# We write to a dep file on the side first and then rename at the end
# so we can't end up with a broken dep file.
depfile = $(depsdir)/$@.d
DEPFLAGS = -MMD -MF $(depfile).raw

# We have to fixup the deps output in a few ways.
# (1) the file output should mention the proper .o file.
# ccache or distcc lose the path to the target, so we convert a rule of
# the form:
#   foobar.o: DEP1 DEP2
# into
#   path/to/foobar.o: DEP1 DEP2
# (2) we want missing files not to cause us to fail to build.
# We want to rewrite
#   foobar.o: DEP1 DEP2 \
#               DEP3
# to
#   DEP1:
#   DEP2:
#   DEP3:
# so if the files are missing, they're just considered phony rules.
# We have to do some pretty insane escaping to get those backslashes
# and dollar signs past make, the shell, and sed at the same time.
define fixup_dep
# Fixup path as in (1).
sed -e "s|^$(notdir $@)|$@|" $(depfile).raw >> $(depfile)
# Add extra rules as in (2).
# We remove slashes and replace spaces with new lines;
# remove blank lines;
# delete the first line and append a colon to the remaining lines.
sed -e 's|\\||' -e 's| |\n|g' $(depfile).raw |\
  grep -v '^$$'                              |\
  sed -e 1d -e 's|$$|:|'                      \
    >> $(depfile)
rm $(depfile).raw
endef

# Command definitions:
# - cmd_foo is the actual command to run;
# - quiet_cmd_foo is the brief-output summary of the command.

quiet_cmd_cc = CC($(TOOLSET)) $@
cmd_cc = $(CC.$(TOOLSET)) $(CFLAGS.$(TOOLSET)) $(GYP_CFLAGS) $(DEPFLAGS) -c -o $@ $<

quiet_cmd_cxx = CXX($(TOOLSET)) $@
cmd_cxx = $(CXX.$(TOOLSET)) $(CXXFLAGS.$(TOOLSET)) $(GYP_CXXFLAGS) $(DEPFLAGS) -c -o $@ $<

quiet_cmd_alink = AR($(TOOLSET)) $@
cmd_alink = rm -f $@ && $(AR.$(TOOLSET)) $(ARFLAGS.$(TOOLSET)) $@ $(filter %.o,$^)

quiet_cmd_touch = TOUCH $@
cmd_touch = touch $@

quiet_cmd_copy = COPY $@
# send stderr to /dev/null to ignore messages when linking directories.
cmd_copy = ln -f $< $@ 2>/dev/null || cp -af $< $@

# Due to circular dependencies between libraries :(, we wrap the
# special "figure out circular dependencies" flags around the entire
# input list during linking.
quiet_cmd_link = LINK($(TOOLSET)) $@
cmd_link = $(LINK.$(TOOLSET)) $(LDFLAGS.$(TOOLSET)) $(GYP_LDFLAGS) -o $@ -Wl,--start-group $(filter-out FORCE_DO_CMD, $^) -Wl,--end-group $(LIBS)

# Shared-object link (for generating .so).
# Set SONAME to the library filename so our binaries don't reference the local,
# absolute paths used on the link command-line.
# TODO: perhaps this can share with the LINK command above?
quiet_cmd_solink = SOLINK($(TOOLSET)) $@
cmd_solink = $(LINK.$(TOOLSET)) -shared $(LDFLAGS.$(TOOLSET)) $(GYP_LDFLAGS) -Wl,-soname=$(@F) -o $@ -Wl,--start-group $(filter-out FORCE_DO_CMD, $^) -Wl,--end-group $(LIBS)

# Define an escape_quotes function to escape single quotes.
# This allows us to handle quotes properly as long as we always use
# use single quotes and escape_quotes.
escape_quotes = $(subst ','\'',$(1))
# This comment is here just to include a ' to unconfuse syntax highlighting.
# Define an escape_vars function to escape '$' variable syntax.
# This allows us to read/write command lines with shell variables (e.g.
# $LD_LIBRARY_PATH), without triggering make substitution.
escape_vars = $(subst $$,$$$$,$(1))
# Helper that expands to a shell command to echo a string exactly as it is in
# make. This uses printf instead of echo because printf's behaviour with respect
# to escape sequences is more portable than echo's across different shells
# (e.g., dash, bash).
exact_echo = printf '%s\n' '$(call escape_quotes,$(1))'

# Helper to compare the command we're about to run against the command
# we logged the last time we ran the command.  Produces an empty
# string (false) when the commands match.
# Tricky point: Make has no string-equality test function.
# The kernel uses the following, but it seems like it would have false
# positives, where one string reordered its arguments.
#   arg_check = $(strip $(filter-out $(cmd_$(1)), $(cmd_$@)) \
#                       $(filter-out $(cmd_$@), $(cmd_$(1))))
# We instead substitute each for the empty string into the other, and
# say they're equal if both substitutions produce the empty string.
command_changed = $(or $(subst $(cmd_$(1)),,$(cmd_$@)),\
                       $(subst $(cmd_$@),,$(cmd_$(1))))

# Helper that is non-empty when a prerequisite changes.
# Normally make does this implicitly, but we force rules to always run
# so we can check their command lines.
#   $? -- new prerequisites
#   $| -- order-only dependencies
prereq_changed = $(filter-out $|,$?)

# do_cmd: run a command via the above cmd_foo names, if necessary.
# Should always run for a given target to handle command-line changes.
# Second argument, if non-zero, makes it do C/C++ dependency munging.
define do_cmd
$(if $(or $(command_changed),$(prereq_changed)),
  @$(call exact_echo,  $($(quiet)cmd_$(1)))
  @mkdir -p $(dir $@) $(dir $(depfile))
  @$(cmd_$(1))
  @$(call exact_echo,$(call escape_vars,cmd_$@ := $(cmd_$(1)))) > $(depfile)
  @$(if $(2),$(fixup_dep))
)
endef

# Declare "all" target first so it is the default, even though we don't have the
# deps yet.
.PHONY: all clean
all:

# make looks for ways to re-generate included makefiles, but in our case, we
# don't have a direct way. Explicitly telling make that it has nothing to do
# for them makes it go faster.
%.d: ;

# Use FORCE_DO_CMD to force a target to run.  Should be coupled with
# do_cmd.
.PHONY: FORCE_DO_CMD
FORCE_DO_CMD:

TOOLSET := host
# Suffix rules, putting all outputs into $(obj).
$(obj).$(TOOLSET)/%.o: $(srcdir)/%.c FORCE_DO_CMD
	@$(call do_cmd,cc,1)
$(obj).$(TOOLSET)/%.o: $(srcdir)/%.s FORCE_DO_CMD
	@$(call do_cmd,cc)
$(obj).$(TOOLSET)/%.o: $(srcdir)/%.S FORCE_DO_CMD
	@$(call do_cmd,cc)
$(obj).$(TOOLSET)/%.o: $(srcdir)/%.cpp FORCE_DO_CMD
	@$(call do_cmd,cxx,1)
$(obj).$(TOOLSET)/%.o: $(srcdir)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)
$(obj).$(TOOLSET)/%.o: $(srcdir)/%.cxx FORCE_DO_CMD
	@$(call do_cmd,cxx,1)

# Try building from generated source, too.
$(obj).$(TOOLSET)/%.o: $(obj).$(TOOLSET)/%.c FORCE_DO_CMD
	@$(call do_cmd,cc,1)
$(obj).$(TOOLSET)/%.o: $(obj).$(TOOLSET)/%.s FORCE_DO_CMD
	@$(call do_cmd,cc)
$(obj).$(TOOLSET)/%.o: $(obj).$(TOOLSET)/%.S FORCE_DO_CMD
	@$(call do_cmd,cc)
$(obj).$(TOOLSET)/%.o: $(obj).$(TOOLSET)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)
$(obj).$(TOOLSET)/%.o: $(obj).$(TOOLSET)/%.cpp FORCE_DO_CMD
	@$(call do_cmd,cxx,1)
$(obj).$(TOOLSET)/%.o: $(obj).$(TOOLSET)/%.cxx FORCE_DO_CMD
	@$(call do_cmd,cxx,1)

$(obj).$(TOOLSET)/%.o: $(obj)/%.c FORCE_DO_CMD
	@$(call do_cmd,cc,1)
$(obj).$(TOOLSET)/%.o: $(obj)/%.s FORCE_DO_CMD
	@$(call do_cmd,cc)
$(obj).$(TOOLSET)/%.o: $(obj)/%.S FORCE_DO_CMD
	@$(call do_cmd,cc)
$(obj).$(TOOLSET)/%.o: $(obj)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)
$(obj).$(TOOLSET)/%.o: $(obj)/%.cpp FORCE_DO_CMD
	@$(call do_cmd,cxx,1)
$(obj).$(TOOLSET)/%.o: $(obj)/%.cxx FORCE_DO_CMD
	@$(call do_cmd,cxx,1)
TOOLSET := target
# Suffix rules, putting all outputs into $(obj).
$(obj).$(TOOLSET)/%.o: $(srcdir)/%.c FORCE_DO_CMD
	@$(call do_cmd,cc,1)
$(obj).$(TOOLSET)/%.o: $(srcdir)/%.s FORCE_DO_CMD
	@$(call do_cmd,cc)
$(obj).$(TOOLSET)/%.o: $(srcdir)/%.S FORCE_DO_CMD
	@$(call do_cmd,cc)
$(obj).$(TOOLSET)/%.o: $(srcdir)/%.cpp FORCE_DO_CMD
	@$(call do_cmd,cxx,1)
$(obj).$(TOOLSET)/%.o: $(srcdir)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)
$(obj).$(TOOLSET)/%.o: $(srcdir)/%.cxx FORCE_DO_CMD
	@$(call do_cmd,cxx,1)

# Try building from generated source, too.
$(obj).$(TOOLSET)/%.o: $(obj).$(TOOLSET)/%.c FORCE_DO_CMD
	@$(call do_cmd,cc,1)
$(obj).$(TOOLSET)/%.o: $(obj).$(TOOLSET)/%.s FORCE_DO_CMD
	@$(call do_cmd,cc)
$(obj).$(TOOLSET)/%.o: $(obj).$(TOOLSET)/%.S FORCE_DO_CMD
	@$(call do_cmd,cc)
$(obj).$(TOOLSET)/%.o: $(obj).$(TOOLSET)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)
$(obj).$(TOOLSET)/%.o: $(obj).$(TOOLSET)/%.cpp FORCE_DO_CMD
	@$(call do_cmd,cxx,1)
$(obj).$(TOOLSET)/%.o: $(obj).$(TOOLSET)/%.cxx FORCE_DO_CMD
	@$(call do_cmd,cxx,1)

$(obj).$(TOOLSET)/%.o: $(obj)/%.c FORCE_DO_CMD
	@$(call do_cmd,cc,1)
$(obj).$(TOOLSET)/%.o: $(obj)/%.s FORCE_DO_CMD
	@$(call do_cmd,cc)
$(obj).$(TOOLSET)/%.o: $(obj)/%.S FORCE_DO_CMD
	@$(call do_cmd,cc)
$(obj).$(TOOLSET)/%.o: $(obj)/%.cc FORCE_DO_CMD
	@$(call do_cmd,cxx,1)
$(obj).$(TOOLSET)/%.o: $(obj)/%.cpp FORCE_DO_CMD
	@$(call do_cmd,cxx,1)
$(obj).$(TOOLSET)/%.o: $(obj)/%.cxx FORCE_DO_CMD
	@$(call do_cmd,cxx,1)

include base/base.target.mk
include build/All.target.mk
include build/temp_gyp/googleurl.target.mk
include net/net_base.target.mk
include pagespeed/samples/minify_html_bin.target.mk
include pagespeed/samples/optimize_image_bin.target.mk
include pagespeed/samples/har_to_pagespeed.target.mk
include pagespeed/core/pagespeed_core.target.mk
include pagespeed/core/pagespeed_init.target.mk
include pagespeed/cssmin/pagespeed_cssmin.target.mk
include pagespeed/filters/pagespeed_filters.target.mk
include pagespeed/formatters/pagespeed_formatters.target.mk
include pagespeed/har/pagespeed_har.target.mk
include pagespeed/html/pagespeed_html.target.mk
include pagespeed/image_compression/pagespeed_image_attributes_factory.target.mk
include pagespeed/image_compression/pagespeed_jpeg_optimizer.target.mk
include pagespeed/image_compression/pagespeed_jpeg_reader.target.mk
include pagespeed/image_compression/pagespeed_png_optimizer.target.mk
include pagespeed/pagespeed_library.target.mk
include pagespeed/proto/pagespeed_output_pb.target.mk
include pagespeed/util/pagespeed_util.target.mk
include third_party/adblockrules/adblockrules.target.mk
include third_party/cJSON/cJSON.target.mk
include third_party/instaweb/src/net/instaweb/instaweb_htmlparse_core.target.mk
include third_party/instaweb/src/net/instaweb/instaweb_rewriter_html.target.mk
include third_party/instaweb/src/net/instaweb/instaweb_util_core.target.mk
include third_party/jsmin/jsmin.target.mk
include third_party/jsmin/jsmin_bin.target.mk
include third_party/libjpeg/libjpeg.target.mk
include third_party/libjpeg_trans/libjpeg_trans.target.mk
include third_party/libpng/libpng.target.mk
include third_party/modp_b64/modp_b64.target.mk
include third_party/optipng/opngreduc.target.mk
include third_party/optipng/pngxrgif.target.mk
include third_party/protobuf2/protobuf_lite.target.mk
include third_party/zlib/zlib.target.mk

# "all" is a concatenation of the "all" targets from all the included
# sub-makefiles. This is just here to clarify.
all:

clean:
	rm -rf $(abs_builddir)

# Add in dependency-tracking rules.  $(all_deps) is the list of every single
# target in our tree.  First, only consider targets that already have been
# built, as unbuilt targets will be built regardless of dependency info:
all_deps := $(wildcard $(sort $(all_deps)))
# Of those, only consider the ones with .d (dependency) info:
d_files := $(wildcard $(foreach f,$(all_deps),$(depsdir)/$(f).d))
ifneq ($(d_files),)
  include $(d_files)
endif

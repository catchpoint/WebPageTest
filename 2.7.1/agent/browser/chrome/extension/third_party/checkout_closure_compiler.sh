#
# Closure compiler can use extern definitions to aid type checking.
# These definition s are checked in to closure compiler's svn
# repository.  This script checks out those definitions, along with
# license/readme files.
#
# Author: Sam Kerner (skenrer at google dot com)
#

CHECKOUT_DIR='./closure-compiler/'
CLOSURE_COMPILER_SVN_BASE_URL='http://closure-compiler.googlecode.com/svn/trunk'

mkdir -p ${CHECKOUT_DIR}

# Check out files at the base of the repository, including the licence
# in COPYING, and subproject licences in README.
svn checkout  --depth=files \
    ${CLOSURE_COMPILER_SVN_BASE_URL}/ \
    ${CHECKOUT_DIR}

# Check out the extern definitions we need to enable closure
# compiler to type check our Javascript sources.
svn checkout ${CLOSURE_COMPILER_SVN_BASE_URL}/contrib/externs \
             ${CHECKOUT_DIR}/contrib/externs

svn checkout ${CLOSURE_COMPILER_SVN_BASE_URL}/externs \
             ${CHECKOUT_DIR}/externs

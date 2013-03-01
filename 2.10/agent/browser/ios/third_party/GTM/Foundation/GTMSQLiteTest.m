//
//  GTMSQLiteTest.m
//
//  Copyright 2006-2008 Google Inc.
//
//  Licensed under the Apache License, Version 2.0 (the "License"); you may not
//  use this file except in compliance with the License.  You may obtain a copy
//  of the License at
//
//  http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
//  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
//  License for the specific language governing permissions and limitations under
//  the License.
//


#import "GTMSQLite.h"
#import "GTMSenTestCase.h"
#import "GTMUnitTestDevLog.h"
#import "GTMGarbageCollection.h"

@interface GTMSQLiteTest : GTMTestCase
@end

// This variable is used by a custom upper function that we set in a
// SQLite database to indicate that the custom function was
// successfully called.  It has to be a global rather than instance
// variable because the custom upper function is not an instance function
static BOOL customUpperFunctionCalled =  NO;

@interface GTMSQLiteStatementTest : GTMTestCase
@end

// Prototype for LIKE/GLOB test helper
static NSArray* LikeGlobTestHelper(GTMSQLiteDatabase *db, NSString *sql);

@implementation GTMSQLiteTest

// Test cases for change counting
- (void)testTransactionAPI {
  int err;
  GTMSQLiteDatabase *db =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];

  err = [db executeSQL:@"CREATE TABLE foo (bar TEXT COLLATE NOCASE_NONLITERAL);"];
  STAssertEquals(err, SQLITE_OK, @"Failed to create table");

  int changeCount = [db lastChangeCount];
  STAssertEquals(changeCount, 0,
                 @"Change count was not 0 after creating database/table!");

  err = [db executeSQL:@"insert into foo (bar) values ('blah!');"];
  STAssertEquals(err, SQLITE_OK, @"Failed to execute SQL");

  changeCount = [db lastChangeCount];
  STAssertEquals(changeCount, 1, @"Change count was not 1!");

  // Test last row id!
  unsigned long long lastRowId;
  lastRowId = [db lastInsertRowID];
  STAssertEquals(lastRowId, (unsigned long long)1L,
                 @"First row in database was not 1?");

  // Test setting busy and retrieving it!
  int busyTimeout = 10000;
  err = [db setBusyTimeoutMS:busyTimeout];
  STAssertEquals(err, SQLITE_OK, @"Error setting busy timeout");

  int retrievedBusyTimeout;
  retrievedBusyTimeout = [db busyTimeoutMS];
  STAssertEquals(retrievedBusyTimeout, busyTimeout,
                 @"Retrieved busy time out was not equal to what we set it"
                 @" to!");

  BOOL xactOpSucceeded;

  xactOpSucceeded = [db beginDeferredTransaction];
  STAssertTrue(xactOpSucceeded, @"beginDeferredTransaction failed!");

  err = [db executeSQL:@"insert into foo (bar) values ('blah!');"];
  STAssertEquals(err, SQLITE_OK, @"Failed to execute SQL");
  changeCount = [db lastChangeCount];
  STAssertEquals(changeCount, 1,
                 @"Change count didn't stay the same"
                 @"when inserting during transaction");

  xactOpSucceeded = [db rollback];
  STAssertTrue(xactOpSucceeded, @"could not rollback!");

  changeCount = [db lastChangeCount];
  STAssertEquals(changeCount, 1, @"Change count isn't 1 after rollback :-(");

  xactOpSucceeded = [db beginDeferredTransaction];
  STAssertTrue(xactOpSucceeded, @"beginDeferredTransaction failed!");

  for (unsigned int i = 0; i < 100; i++) {
    err = [db executeSQL:@"insert into foo (bar) values ('blah!');"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute SQL");
  }

  xactOpSucceeded = [db commit];
  STAssertTrue(xactOpSucceeded, @"could not commit!");

  changeCount = [db totalChangeCount];
  STAssertEquals(changeCount, 102, @"Change count isn't 102 after commit :-(");
}

- (void)testSQLiteWithoutCFAdditions {
  int err;
  GTMSQLiteDatabase *dbNoCFAdditions =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:NO
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];

  STAssertNotNil(dbNoCFAdditions, @"Failed to create DB");
  STAssertEquals(err, SQLITE_OK, @"Failed to create DB");

  err = [dbNoCFAdditions executeSQL:nil];
  STAssertEquals(err, SQLITE_MISUSE, @"Nil SQL did not return error");

  err = [dbNoCFAdditions executeSQL:@"SELECT UPPER('Fred');"];
  STAssertEquals(err, SQLITE_OK, @"Nil SQL did not return error");
}

- (void)testSynchronousAPI {
  int err;
  GTMSQLiteDatabase *db =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];
  [db synchronousMode:YES];
  [db synchronousMode:NO];
}

- (void)testEmptyStringsCollation {
  int err;
  GTMSQLiteDatabase *db8 =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];

  STAssertNotNil(db8, @"Failed to create DB");
  STAssertEquals(err, SQLITE_OK, @"Failed to create DB");

  GTMSQLiteDatabase *db16 =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:NO
                                                  errorCode:&err]
      autorelease];

  STAssertNotNil(db16, @"Failed to create DB");
  STAssertEquals(err, SQLITE_OK, @"Failed to create DB");

  NSArray *databases = [NSArray arrayWithObjects:db8, db16, nil];
  GTMSQLiteDatabase *db;
  GTM_FOREACH_OBJECT(db, databases) {
    err = [db executeSQL:
                @"CREATE TABLE foo (bar TEXT COLLATE NOCASE_NONLITERAL,"
                @"                  barrev text collate reverse);"];

    STAssertEquals(err, SQLITE_OK,
                   @"Failed to create table for collation test");
    // Create blank rows to test matching inside collation functions
    err = [db executeSQL:@"insert into foo (bar, barrev) values ('','');"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute SQL");

    // Insert one row we want to match
    err = [db executeSQL:
                @"INSERT INTO foo (bar, barrev) VALUES "
                @"('teststring','teststring');"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute SQL");

    NSString *matchString = @"foobar";
    GTMSQLiteStatement *statement =
        [GTMSQLiteStatement statementWithSQL:[NSString stringWithFormat:
        @"SELECT bar FROM foo WHERE bar == '%@';", matchString]
                               inDatabase:db
                                errorCode:&err];
    STAssertNotNil(statement, @"Failed to create statement");
    STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
    [statement stepRow];
    [statement finalizeStatement];
    
    statement =
        [GTMSQLiteStatement statementWithSQL:[NSString stringWithFormat:
        @"SELECT bar FROM foo WHERE barrev == '%@' order by barrev;", matchString]
                               inDatabase:db
                                errorCode:&err];
    STAssertNotNil(statement, @"Failed to create statement");
    STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
    [statement stepRow];

    [statement finalizeStatement];
    
    statement =
        [GTMSQLiteStatement statementWithSQL:[NSString stringWithFormat:
        @"SELECT bar FROM foo WHERE bar == '';"]
                               inDatabase:db
                                errorCode:&err];
    STAssertNotNil(statement, @"Failed to create statement");
    STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
    [statement stepRow];
    [statement finalizeStatement];

    statement =
        [GTMSQLiteStatement statementWithSQL:[NSString stringWithFormat:
        @"SELECT bar FROM foo WHERE barrev == '' order by barrev;"]
                               inDatabase:db
                                errorCode:&err];
    STAssertNotNil(statement, @"Failed to create statement");
    STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
    [statement stepRow];
    [statement finalizeStatement];
  }
}

- (void)testUTF16Database {
  int err;
  GTMSQLiteDatabase *db =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:NO
                                                  errorCode:&err]
      autorelease];

  STAssertNotNil(db, @"Failed to create DB");
  STAssertEquals(err, SQLITE_OK, @"Failed to create DB");

  err = [db executeSQL:@"CREATE TABLE foo (bar TEXT COLLATE NOCASE_NONLITERAL);"];
  STAssertEquals(err, SQLITE_OK, @"Failed to create table for collation test");

  // Insert one row we want to match
  err = [db executeSQL:[NSString stringWithFormat:
                                   @"INSERT INTO foo (bar) VALUES ('%@');",
    [NSString stringWithCString:"Frédéric" encoding:NSUTF8StringEncoding]]];
  STAssertEquals(err, SQLITE_OK, @"Failed to execute SQL");

  // Create blank rows to test matching inside collation functions
  err = [db executeSQL:@"insert into foo (bar) values ('');"];
  STAssertEquals(err, SQLITE_OK, @"Failed to execute SQL");

  err = [db executeSQL:@"insert into foo (bar) values ('');"];
  STAssertEquals(err, SQLITE_OK, @"Failed to execute SQL");

  // Loop over a few things all of which should match
  NSArray *testArray = [NSArray arrayWithObjects:
                         [NSString stringWithCString:"Frédéric"
                                            encoding:NSUTF8StringEncoding],
                         [NSString stringWithCString:"frédéric"
                                            encoding:NSUTF8StringEncoding],
                         [NSString stringWithCString:"FRÉDÉRIC"
                                            encoding:NSUTF8StringEncoding],
                         nil];
  NSString *testString = nil;
  GTM_FOREACH_OBJECT(testString, testArray) {
    GTMSQLiteStatement *statement =
      [GTMSQLiteStatement statementWithSQL:[NSString stringWithFormat:
        @"SELECT bar FROM foo WHERE bar == '%@';", testString]
                               inDatabase:db
                                errorCode:&err];
    STAssertNotNil(statement, @"Failed to create statement");
    STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
    int count = 0;
    while ([statement stepRow] == SQLITE_ROW) {
      count++;
    }
    STAssertEquals(count, 1, @"Wrong number of collated rows for \"%@\"",
                   testString);
    [statement finalizeStatement];
  }

  GTMSQLiteStatement *statement =
    [GTMSQLiteStatement statementWithSQL:@"select * from foo;"
                        inDatabase:db
                        errorCode:&err];

  STAssertNotNil(statement, @"Failed to create statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create statement");

  while ([statement stepRow] == SQLITE_ROW) ;
  [statement finalizeStatement];

}

- (void)testUpperLower {

  // Test our custom UPPER/LOWER implementation, need a database and statement
  // to do it.
  int err;
  GTMSQLiteDatabase *db =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];
  STAssertNotNil(db, @"Failed to create DB");
  STAssertEquals(err, SQLITE_OK, @"Failed to create DB");
  GTMSQLiteStatement *statement = nil;

  // Test simple ASCII
  statement = [GTMSQLiteStatement statementWithSQL:@"SELECT LOWER('Fred');"
                                       inDatabase:db
                                        errorCode:&err];
  STAssertNotNil(statement, @"Failed to create statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
  err = [statement stepRow];
  STAssertEquals(err, SQLITE_ROW, @"Failed to step row");
  STAssertEqualObjects([statement resultStringAtPosition:0],
                       @"fred",
                       @"LOWER failed for ASCII string");
  [statement finalizeStatement];

  statement = [GTMSQLiteStatement statementWithSQL:@"SELECT UPPER('Fred');"
                                       inDatabase:db
                                        errorCode:&err];
  STAssertNotNil(statement, @"Failed to create statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
  err = [statement stepRow];
  STAssertEquals(err, SQLITE_ROW, @"Failed to step row");
  STAssertEqualObjects([statement resultStringAtPosition:0],
                       @"FRED",
                       @"UPPER failed for ASCII string");

  [statement finalizeStatement];
  // Test UTF-8, have to do some dancing to make the compiler take
  // UTF8 literals
  NSString *utfNormalString =
    [NSString stringWithCString:"Frédéric"
                       encoding:NSUTF8StringEncoding];
  NSString *utfLowerString =
    [NSString stringWithCString:"frédéric"
                       encoding:NSUTF8StringEncoding];
  NSString *utfUpperString =
    [NSString stringWithCString:"FRÉDÉRIC" encoding:NSUTF8StringEncoding];

  statement =
    [GTMSQLiteStatement statementWithSQL:
              [NSString stringWithFormat:@"SELECT LOWER('%@');", utfNormalString]
                              inDatabase:db
                               errorCode:&err];
  STAssertNotNil(statement, @"Failed to create statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
  err = [statement stepRow];
  STAssertEquals(err, SQLITE_ROW, @"Failed to step row");
  STAssertEqualObjects([statement resultStringAtPosition:0],
                       utfLowerString,
                       @"UPPER failed for UTF8 string");
  [statement finalizeStatement];

  statement =
    [GTMSQLiteStatement statementWithSQL:
              [NSString stringWithFormat:@"SELECT UPPER('%@');", utfNormalString]
                              inDatabase:db
                               errorCode:&err];
  STAssertNotNil(statement, @"Failed to create statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
  err = [statement stepRow];
  STAssertEquals(err, SQLITE_ROW, @"Failed to step row");
  STAssertEqualObjects([statement resultStringAtPosition:0],
                       utfUpperString,
                       @"UPPER failed for UTF8 string");
  err = [statement stepRow];
  STAssertEquals(err, SQLITE_DONE, @"Should be done");
  [statement finalizeStatement];
}

- (void)testUpperLower16 {

  // Test our custom UPPER/LOWER implementation, need a database and
  // statement to do it.
  int err;
  GTMSQLiteDatabase *db =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:NO
                                                  errorCode:&err]
      autorelease];
  STAssertNotNil(db, @"Failed to create DB");
  STAssertEquals(err, SQLITE_OK, @"Failed to create DB");
  GTMSQLiteStatement *statement = nil;

  // Test simple ASCII
  statement = [GTMSQLiteStatement statementWithSQL:@"SELECT LOWER('Fred');"
                                       inDatabase:db
                                        errorCode:&err];
  STAssertNotNil(statement, @"Failed to create statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
  err = [statement stepRow];
  STAssertEquals(err, SQLITE_ROW, @"Failed to step row");
  STAssertEqualObjects([statement resultStringAtPosition:0],
                       @"fred",
                       @"LOWER failed for ASCII string");
  [statement finalizeStatement];

  statement = [GTMSQLiteStatement statementWithSQL:@"SELECT UPPER('Fred');"
                                       inDatabase:db
                                        errorCode:&err];
  STAssertNotNil(statement, @"Failed to create statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
  err = [statement stepRow];
  STAssertEquals(err, SQLITE_ROW, @"Failed to step row");
  STAssertEqualObjects([statement resultStringAtPosition:0],
                       @"FRED",
                       @"UPPER failed for ASCII string");
  [statement finalizeStatement];
}

typedef struct {
  BOOL upperCase;
  int  textRep;
} UpperLowerUserArgs;

static void TestUpperLower16Impl(sqlite3_context *context,
                                 int argc, sqlite3_value **argv);

- (void)testUTF16DatabasesAreReallyUTF16 {
  int err;
  GTMSQLiteDatabase *db =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:NO
                                                  errorCode:&err]
      autorelease];

  const struct {
    const char           *sqlName;
    UpperLowerUserArgs   userArgs;
    void                 *function;
  } customUpperLower[] = {
    { "upper", { YES, SQLITE_UTF16 }, &TestUpperLower16Impl },
    { "upper", { YES, SQLITE_UTF16BE }, &TestUpperLower16Impl },
    { "upper", { YES, SQLITE_UTF16LE }, &TestUpperLower16Impl }
  };


  sqlite3 *sqldb = [db sqlite3DB];
  int rc;
  for (size_t i = 0;
       i < (sizeof(customUpperLower) / sizeof(customUpperLower[0]));
       i++) {
    rc = sqlite3_create_function(sqldb,
                                 customUpperLower[i].sqlName,
                                 1,
                                 customUpperLower[i].userArgs.textRep,
                                 (void *)&customUpperLower[i].userArgs,
                                 customUpperLower[i].function,
                                 NULL,
                                 NULL);
    STAssertEquals(rc, SQLITE_OK,
                   @"Failed to register upper function"
                   @"with SQLite db");
  }

  customUpperFunctionCalled = NO;
  GTMSQLiteStatement *statement = [GTMSQLiteStatement statementWithSQL:@"SELECT UPPER('Fred');"
                                                            inDatabase:db
                                                             errorCode:&err];
  STAssertNotNil(statement, @"Failed to create statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
  err = [statement stepRow];
  STAssertEquals(err, SQLITE_ROW, @"Failed to step row");
  STAssertTrue(customUpperFunctionCalled,
               @"Custom upper function was not called!");
  [statement finalizeStatement];
}

- (void)testLikeComparisonOptions {
  int err;

  GTMSQLiteDatabase *db8 =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err] autorelease];

  GTMSQLiteDatabase *db16 =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:NO
                                                  errorCode:&err] autorelease];

  NSArray *databases = [NSArray arrayWithObjects:db8, db16, nil];
  GTMSQLiteDatabase *db;
  GTM_FOREACH_OBJECT(db, databases) {
    CFOptionFlags c = 0, oldFlags;

    oldFlags = [db likeComparisonOptions];

    // We'll do a case sensitivity test by making comparison options
    // case insensitive
    [db setLikeComparisonOptions:c];

    STAssertTrue([db likeComparisonOptions] == 0,
                 @"LIKE Comparison options setter/getter does not work!");

    NSString *createString = nil;
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
    createString = @"CREATE TABLE foo (bar NODIACRITIC_WIDTHINSENSITIVE TEXT);";
#else
    createString = @"CREATE TABLE foo (bar TEXT);";
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

    err = [db executeSQL:createString];
    STAssertEquals(err, SQLITE_OK,
                   @"Failed to create table for like comparison options test");

    err = [db executeSQL:@"insert into foo values('test like test');"];
    STAssertEquals(err, SQLITE_OK,
                   @"Failed to create row for like comparison options test");

    GTMSQLiteStatement *statement =
      [GTMSQLiteStatement statementWithSQL:@"select * from foo where bar like '%LIKE%'"
                                inDatabase:db
                                 errorCode:&err];

    STAssertNotNil(statement, @"failed to create statement");
    STAssertEquals(err, SQLITE_OK, @"failed to create statement");
    err = [statement stepRow];
    STAssertEquals(err, SQLITE_DONE, @"failed to retrieve row!");

    // Now change it back to case insensitive and rerun the same query
    c |= kCFCompareCaseInsensitive;
    [db setLikeComparisonOptions:c];
    err = [statement reset];
    STAssertEquals(err, SQLITE_OK, @"failed to reset select statement");

    err = [statement stepRow];
    STAssertEquals(err, SQLITE_ROW, @"failed to retrieve row!");

#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
    // Now try adding in 10.5 only flags
    c |= (kCFCompareDiacriticInsensitive | kCFCompareWidthInsensitive);
    [db setLikeComparisonOptions:c];
    // Make a new statement
    [statement finalizeStatement];
    statement =
      [GTMSQLiteStatement statementWithSQL:@"select * from foo where bar like '%LIKE%'"
                                inDatabase:db
                                 errorCode:&err];
    
    STAssertNotNil(statement, @"failed to create statement");
    STAssertEquals(err, SQLITE_OK, @"failed to create statement");
    
    err = [statement stepRow];
    STAssertEquals(err, SQLITE_ROW, @"failed to retrieve row!");
#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
    
    // Now reset comparison options
    [db setLikeComparisonOptions:oldFlags];

    [statement finalizeStatement];
  }
}

- (void)testGlobComparisonOptions {
  int err;
  GTMSQLiteDatabase *db = [[[GTMSQLiteDatabase alloc]
                             initInMemoryWithCFAdditions:YES
                                                    utf8:YES
                                               errorCode:&err] autorelease];

  CFOptionFlags c = 0, oldFlags;

  oldFlags = [db globComparisonOptions];

  [db setGlobComparisonOptions:c];

  STAssertTrue([db globComparisonOptions] == 0,
               @"GLOB Comparison options setter/getter does not work!");

  err = [db executeSQL:@"CREATE TABLE foo (bar TEXT);"];
  STAssertEquals(err, SQLITE_OK,
                 @"Failed to create table for glob comparison options test");

  err = [db executeSQL:@"insert into foo values('test like test');"];
  STAssertEquals(err, SQLITE_OK,
                 @"Failed to create row for glob comparison options test");

  GTMSQLiteStatement *statement =
    [GTMSQLiteStatement statementWithSQL:@"select * from foo where bar GLOB 'TEST*'"
                              inDatabase:db
                               errorCode:&err];

  STAssertNotNil(statement, @"failed to create statement");
  STAssertEquals(err, SQLITE_OK, @"failed to create statement");
  err = [statement stepRow];
  STAssertEquals(err, SQLITE_DONE, @"failed to retrieve row!");

  // Now change it back to case insensitive and rerun the same query
  c |= kCFCompareCaseInsensitive;
  [db setGlobComparisonOptions:c];
  err = [statement reset];
  STAssertEquals(err, SQLITE_OK, @"failed to reset select statement");

  err = [statement stepRow];
  STAssertEquals(err, SQLITE_ROW, @"failed to retrieve row!");

  [statement finalizeStatement];

  // Now reset comparison options
  [db setGlobComparisonOptions:oldFlags];
}

- (void)testCFStringReverseCollation {
  int err;
  GTMSQLiteDatabase *db =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err] autorelease];

  err = [db executeSQL:@"CREATE table foo_reverse (bar TEXT COLLATE REVERSE);"];
  STAssertEquals(err, SQLITE_OK,
                 @"Failed to create table for reverse collation test");

  err = [db executeSQL:@"insert into foo_reverse values('a2');"];
  STAssertEquals(err, SQLITE_OK, @"Failed to execute SQL");

  err = [db executeSQL:@"insert into foo_reverse values('b1');"];
  STAssertEquals(err, SQLITE_OK, @"Failed to execute SQL");

  GTMSQLiteStatement *statement =
    [GTMSQLiteStatement statementWithSQL:@"SELECT bar from foo_reverse order by bar"
                              inDatabase:db
                               errorCode:&err];

  STAssertNotNil(statement, @"failed to create statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
  err = [statement stepRow];
  STAssertEquals(err, SQLITE_ROW, @"failed to advance row");
  NSString *oneRow = [statement resultStringAtPosition:0];

  STAssertEqualStrings(oneRow, @"b1", @"b did not come first!");
  err = [statement stepRow];
  STAssertEquals(err, SQLITE_ROW, @"failed to advance row!");

  STAssertEquals(err, [db lastErrorCode],
                 @"lastErrorCode API did not match what last API returned!");
  // Calling lastErrorCode resets API error, so the next string will not indicate any error
  STAssertEqualStrings(@"not an error", [db lastErrorString],
                       @"lastErrorString API did not match expected string!");

  oneRow = [statement resultStringAtPosition:0];
  STAssertEqualStrings(oneRow, @"a2", @"a did not come second!");

  [statement finalizeStatement];
}

- (void)testCFStringNumericCollation {
  int err;
  GTMSQLiteDatabase *db = [[[GTMSQLiteDatabase alloc]
                             initInMemoryWithCFAdditions:YES
                                                    utf8:YES
                                               errorCode:&err] autorelease];

  err = [db executeSQL:
              @"CREATE table numeric_test_table "
              @"(numeric_sort TEXT COLLATE NUMERIC, lexographic_sort TEXT);"];
  STAssertEquals(err, SQLITE_OK,
                 @"Failed to create table for numeric collation test");

  err = [db executeSQL:@"insert into numeric_test_table values('4','17');"];
  STAssertEquals(err, SQLITE_OK, @"Failed to execute SQL");

  err = [db executeSQL:@"insert into numeric_test_table values('17','4');"];
  STAssertEquals(err, SQLITE_OK, @"Failed to execute SQL");

  GTMSQLiteStatement *statement =
    [GTMSQLiteStatement statementWithSQL:@"SELECT numeric_sort from numeric_test_table order by numeric_sort"
                              inDatabase:db
                               errorCode:&err];

  STAssertNotNil(statement, @"failed to create statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
  err = [statement stepRow];
  STAssertEquals(err, SQLITE_ROW, @"failed to advance row");
  NSString *oneRow = [statement resultStringAtPosition:0];

  STAssertEqualStrings(oneRow, @"4", @"4 did not come first!");
  err = [statement stepRow];
  STAssertEquals(err, SQLITE_ROW, @"failed to advance row!");

  oneRow = [statement resultStringAtPosition:0];
  STAssertEqualStrings(oneRow, @"17", @"17 did not come second!");

  [statement finalizeStatement];

  statement =
    [GTMSQLiteStatement statementWithSQL:
                          @"SELECT lexographic_sort from numeric_test_table "
                          @"order by lexographic_sort"
                              inDatabase:db
                               errorCode:&err];

  STAssertNotNil(statement, @"failed to create statement for lexographic sort");
  STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
  err = [statement stepRow];
  STAssertEquals(err, SQLITE_ROW, @"failed to advance row");
  oneRow = [statement resultStringAtPosition:0];

  STAssertEqualStrings(oneRow, @"17", @"17 did not come first!");
  err = [statement stepRow];
  STAssertEquals(err, SQLITE_ROW, @"failed to advance row!");

  oneRow = [statement resultStringAtPosition:0];
  STAssertEqualStrings(oneRow, @"4", @"4 did not come second!");

  [statement finalizeStatement];
}

- (void)testCFStringCollation {

  // Test just one case of the collations, they all exercise largely the
  // same code
  int err;
  GTMSQLiteDatabase *db =
    [[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                      utf8:YES
                                                 errorCode:&err];
  STAssertNotNil(db, @"Failed to create DB");
  STAssertEquals(err, SQLITE_OK, @"Failed to create DB");

  err = [db executeSQL:
              @"CREATE TABLE foo (bar TEXT COLLATE NOCASE_NONLITERAL_LOCALIZED);"];
  STAssertEquals(err, SQLITE_OK, @"Failed to create table for collation test");

  // Insert one row we want to match
  err = [db executeSQL:[NSString stringWithFormat:
                                   @"INSERT INTO foo (bar) VALUES ('%@');",
    [NSString stringWithCString:"Frédéric" encoding:NSUTF8StringEncoding]]];
  STAssertEquals(err, SQLITE_OK, @"Failed to execute SQL");

  // Loop over a few things all of which should match
  NSArray *testArray = [NSArray arrayWithObjects:
                         [NSString stringWithCString:"Frédéric"
                                            encoding:NSUTF8StringEncoding],
                         [NSString stringWithCString:"frédéric"
                                            encoding:NSUTF8StringEncoding],
                         [NSString stringWithCString:"FRÉDÉRIC"
                                            encoding:NSUTF8StringEncoding],
                         nil];

  NSString *testString = nil;
  GTM_FOREACH_OBJECT(testString, testArray) {
    GTMSQLiteStatement *statement =
      [GTMSQLiteStatement statementWithSQL:[NSString stringWithFormat:
        @"SELECT bar FROM foo WHERE bar == '%@';", testString]
                               inDatabase:db
                                errorCode:&err];
    STAssertNotNil(statement, @"Failed to create statement");
    STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
    int count = 0;
    while ([statement stepRow] == SQLITE_ROW) {
      count++;
    }
    STAssertEquals(count, 1, @"Wrong number of collated rows for \"%@\"",
                   testString);
    [statement finalizeStatement];
  }

  // Force a release to test the statement cleanup
  [db release];

}

- (void)testDiacriticAndWidthInsensitiveCollations {
  // Diacritic & width insensitive collations are not supported
  // on Tiger, so most of the test is Leopard or later
#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
  int err;
  GTMSQLiteDatabase *db =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err] autorelease];
  STAssertNotNil(db, @"Failed to create DB");
  STAssertEquals(err, SQLITE_OK, @"Failed to create DB");

  NSString *tableSQL =
    @"CREATE TABLE FOOBAR (collated TEXT COLLATE NODIACRITIC_WIDTHINSENSITIVE, "
    @"                     noncollated TEXT);";

  err = [db executeSQL:tableSQL];
  STAssertEquals(err, SQLITE_OK, @"error creating table");

  NSString *testStringValue = [NSString stringWithCString:"Frédéric"
                                                 encoding:NSUTF8StringEncoding];
  // Insert one row we want to match
  err = [db executeSQL:[NSString stringWithFormat:
                                   @"INSERT INTO FOOBAR (collated, noncollated) "
                                   @"VALUES ('%@','%@');",
                                 testStringValue, testStringValue]];

  GTMSQLiteStatement *statement =
    [GTMSQLiteStatement statementWithSQL:
              [NSString stringWithFormat:@"SELECT noncollated FROM foobar"
                                         @" WHERE noncollated == 'Frederic';"]
                              inDatabase:db
                               errorCode:&err];
  STAssertNotNil(statement, @"Failed to create statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
  // Make sure the comparison query didn't return a row because
  // we're doing a comparison on the row without the collation
  STAssertEquals([statement stepRow], SQLITE_DONE,
                 @"Comparison with diacritics did not succeed");

  [statement finalizeStatement];

  statement =
    [GTMSQLiteStatement statementWithSQL:
              [NSString stringWithFormat:@"SELECT collated FROM foobar"
                                         @" WHERE collated == 'Frederic';"]
                              inDatabase:db
                               errorCode:&err];
  STAssertNotNil(statement, @"Failed to create statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
  STAssertEquals([statement stepRow], SQLITE_ROW,
                 @"Comparison ignoring diacritics did not succeed");
  [statement finalizeStatement];
#else
  // On Tiger just make sure it causes the dev log.
  int err;
  GTMSQLiteDatabase *db =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err] autorelease];
  STAssertNotNil(db, @"Failed to create DB");
  STAssertEquals(err, SQLITE_OK, @"Failed to create DB");
  
  NSString *tableSQL =
    @"CREATE TABLE FOOBAR (collated TEXT"
    @"                     COLLATE NODIACRITIC_WIDTHINSENSITIVE_NOCASE,"
    @"                     noncollated TEXT);";

  // Expect one log for each unsupported flag
  [GTMUnitTestDevLog expect:2
              casesOfString:@"GTMSQLiteDatabase 10.5 collating not available "
                            @"on 10.4 or earlier"];
  err = [db executeSQL:tableSQL];
  STAssertEquals(err, SQLITE_OK, @"error creating table");

#endif // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5
}

- (void)testCFStringLikeGlob {

  // Test cases drawn from SQLite test case source
  int err;
  GTMSQLiteDatabase *db8 =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];

  STAssertNotNil(db8, @"Failed to create database");
  STAssertEquals(err, SQLITE_OK, @"Failed to create database");

  GTMSQLiteDatabase *db16 =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:NO
                                                  errorCode:&err]
      autorelease];

  STAssertNotNil(db16, @"Failed to create database");
  STAssertEquals(err, SQLITE_OK, @"Failed to create database");

  NSArray *databases = [NSArray arrayWithObjects:db8, db16, nil];
  GTMSQLiteDatabase *db;
  GTM_FOREACH_OBJECT(db, databases) {
    err = [db executeSQL:@"CREATE TABLE t1 (x TEXT);"];
    STAssertEquals(err, SQLITE_OK,
                   @"Failed to create table for LIKE/GLOB test");

    // Insert data set
    err = [db executeSQL:@"INSERT INTO t1 VALUES ('a');"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");
    err = [db executeSQL:@"INSERT INTO t1 VALUES ('ab');"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");
    err = [db executeSQL:@"INSERT INTO t1 VALUES ('abc');"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");
    err = [db executeSQL:@"INSERT INTO t1 VALUES ('abcd');"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");
    err = [db executeSQL:@"INSERT INTO t1 VALUES ('acd');"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");
    err = [db executeSQL:@"INSERT INTO t1 VALUES ('abd');"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");
    err = [db executeSQL:@"INSERT INTO t1 VALUES ('bc');"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");
    err = [db executeSQL:@"INSERT INTO t1 VALUES ('bcd');"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");
    err = [db executeSQL:@"INSERT INTO t1 VALUES ('xyz');"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");
    err = [db executeSQL:@"INSERT INTO t1 VALUES ('ABC');"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");
    err = [db executeSQL:@"INSERT INTO t1 VALUES ('CDE');"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");
    err = [db executeSQL:@"INSERT INTO t1 VALUES ('ABC abc xyz');"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");

    // Section 1, case tests
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x LIKE 'abc' ORDER BY 1;"),
                         ([NSArray arrayWithObjects:@"ABC", @"abc", nil]),
                         @"Fail on LIKE test 1.1");
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x GLOB 'abc' ORDER BY 1;"),
                         ([NSArray arrayWithObjects:@"abc", nil]),
                         @"Fail on LIKE test 1.2");
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x LIKE 'ABC' ORDER BY 1;"),
                         ([NSArray arrayWithObjects:@"ABC", @"abc", nil]),
                         @"Fail on LIKE test 1.3");
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x LIKE 'abc%' ORDER BY 1;"),
                         ([NSArray arrayWithObjects:@"ABC", @"ABC abc xyz", @"abc", @"abcd", nil]),
                         @"Fail on LIKE test 3.1");
    [db setLikeComparisonOptions:(kCFCompareNonliteral)];
    err = [db executeSQL:@"CREATE INDEX i1 ON t1(x);"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x LIKE 'abc%' ORDER BY 1;"),
                         ([NSArray arrayWithObjects:@"abc", @"abcd", nil]),
                         @"Fail on LIKE test 3.3");
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x LIKE 'a_c' ORDER BY 1;"),
                         ([NSArray arrayWithObjects:@"abc", nil]),
                         @"Fail on LIKE test 3.5");
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x LIKE 'ab%d' ORDER BY 1;"),
                         ([NSArray arrayWithObjects:@"abcd", @"abd", nil]),
                         @"Fail on LIKE test 3.7");
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x LIKE 'a_c%' ORDER BY 1;"),
                         ([NSArray arrayWithObjects:@"abc", @"abcd", nil]),
                         @"Fail on LIKE test 3.9");
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x LIKE '%bcd' ORDER BY 1;"),
                         ([NSArray arrayWithObjects:@"abcd", @"bcd", nil]),
                         @"Fail on LIKE test 3.11");
    [db setLikeComparisonOptions:(kCFCompareNonliteral | kCFCompareCaseInsensitive)];
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x LIKE 'abc%' ORDER BY 1;"),
                         ([NSArray arrayWithObjects:@"ABC", @"ABC abc xyz", @"abc", @"abcd", nil]),
                         @"Fail on LIKE test 3.13");
    [db setLikeComparisonOptions:(kCFCompareNonliteral)];
    err = [db executeSQL:@"DROP INDEX i1;"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x LIKE 'abc%' ORDER BY 1;"),
                         ([NSArray arrayWithObjects:@"abc", @"abcd", nil]),
                         @"Fail on LIKE test 3.15");
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x GLOB 'abc*' ORDER BY 1;"),
                         ([NSArray arrayWithObjects:@"abc", @"abcd", nil]),
                         @"Fail on LIKE test 3.17");
    err = [db executeSQL:@"CREATE INDEX i1 ON t1(x);"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x GLOB 'abc*' ORDER BY 1;"),
                         ([NSArray arrayWithObjects:@"abc", @"abcd", nil]),
                         @"Fail on LIKE test 3.19");
    [db setLikeComparisonOptions:(kCFCompareNonliteral)];
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x GLOB 'abc*' ORDER BY 1;"),
                         ([NSArray arrayWithObjects:@"abc", @"abcd", nil]),
                         @"Fail on LIKE test 3.21");
    [db setLikeComparisonOptions:(kCFCompareNonliteral |
                                  kCFCompareCaseInsensitive)];
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x GLOB 'a[bc]d' ORDER BY 1;"),
                         ([NSArray arrayWithObjects:@"abd", @"acd", nil]),
                         @"Fail on LIKE test 3.23");

    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x from t1 where x GLOB 'a[^xyz]d' ORDER BY 1;"),
                         ([NSArray arrayWithObjects:@"abd", @"acd", nil]),
                         @"Fail on glob inverted character set test 3.24");

    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x from t1 where x GLOB 'a[^' ORDER BY 1;"),
      ([NSArray array]),
      @"Fail on glob inverted character set test 3.25");

    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x from t1 where x GLOB 'a['"),
      ([NSArray array]),
      @"Unclosed glob character set did not return empty result set 3.26");

    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x from t1 where x GLOB 'a[^]'"),
      ([NSArray array]),
      @"Unclosed glob inverted character set did not return empty "
      @"result set 3.27");

    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x from t1 where x GLOB 'a[^]c]d'"),
      ([NSArray arrayWithObjects:@"abd", nil]),
      @"Glob character set with inverted set not matching ] did not "
      @"return right rows 3.28");

    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x from t1 where x GLOB 'a[bcdefg'"),
      ([NSArray array]),
      @"Unclosed glob character set did not return empty result set 3.29");

    // Section 4
    [db setLikeComparisonOptions:(kCFCompareNonliteral)];
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x LIKE 'abc%' ORDER BY 1;"),
      ([NSArray arrayWithObjects:@"abc", @"abcd", nil]),
      @"Fail on LIKE test 4.1");
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE +x LIKE 'abc%' ORDER BY 1;"),
      ([NSArray arrayWithObjects:@"abc", @"abcd", nil]),
      @"Fail on LIKE test 4.2");
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x LIKE ('ab' || 'c%') ORDER BY 1;"),
      ([NSArray arrayWithObjects:@"abc", @"abcd", nil]),
      @"Fail on LIKE test 4.3");

    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x from t1 where x LIKE 'a[xyz]\%' ESCAPE ''"),
      ([NSArray array]),
      @"0-Character escape clause did not return empty set 4.4");

    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x from t1 where x LIKE "
                         @"'a[xyz]\%' ESCAPE NULL"),
      ([NSArray array]),
      @"Null escape did not return empty set 4.5");

    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x from t1 where x LIKE 'a[xyz]\\%' "
                         @"ESCAPE '\\'"),
      ([NSArray array]),
      @"Literal percent match using ESCAPE clause did not return empty result "
      @"set 4.6");


    // Section 5
    [db setLikeComparisonOptions:(kCFCompareNonliteral | kCFCompareCaseInsensitive)];
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x LIKE 'abc%' ORDER BY 1;"),
      ([NSArray arrayWithObjects:@"ABC", @"ABC abc xyz", @"abc", @"abcd", nil]),
      @"Fail on LIKE test 5.1");

    err = [db executeSQL:@"CREATE TABLE t2(x COLLATE NOCASE);"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");

    err = [db executeSQL:@"INSERT INTO t2 SELECT * FROM t1;"];
    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");

    err = [db executeSQL:@"CREATE INDEX i2 ON t2(x COLLATE NOCASE);"];

    STAssertEquals(err, SQLITE_OK, @"Failed to execute sql");
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t2 WHERE x LIKE 'abc%' ORDER BY 1;"),
      ([NSArray arrayWithObjects:@"abc", @"ABC", @"ABC abc xyz", @"abcd", nil]),
      @"Fail on LIKE test 5.3");

    [db setLikeComparisonOptions:(kCFCompareNonliteral)];

    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t2 WHERE x LIKE 'abc%' ORDER BY 1;"),
      ([NSArray arrayWithObjects:@"abc", @"abcd", nil]),
      @"Fail on LIKE test 5.5");

    [db setLikeComparisonOptions:(kCFCompareNonliteral | kCFCompareCaseInsensitive)];

    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t2 WHERE x GLOB 'abc*' ORDER BY 1;"),
      ([NSArray arrayWithObjects:@"abc", @"abcd", nil]),
      @"Fail on LIKE test 5.5");

    // Non standard tests not from the SQLite source
    STAssertEqualObjects(
      LikeGlobTestHelper(db,
                         @"SELECT x FROM t1 WHERE x GLOB 'a[b-d]d' ORDER BY 1;"),
      ([NSArray arrayWithObjects:@"abd", @"acd", nil]),
      @"Fail on GLOB with character range");
  }
}

- (void)testDescription {
  int err;
  GTMSQLiteDatabase *db8 =
  [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                     utf8:YES
                                                errorCode:&err]
   autorelease];
  
  STAssertNotNil(db8, @"Failed to create database");
  STAssertEquals(err, SQLITE_OK, @"Failed to create database");
  STAssertNotNil([db8 description], nil);
}

// // From GTMSQLite.m
// CFStringEncoding SqliteTextEncodingToCFStringEncoding(int enc);

// - (void)testEncodingMappingIsCorrect {
//   STAssertTrue(SqliteTextEncodingToCFStringEncoding(SQLITE_UTF8) ==
//                kCFStringEncodingUTF8,
//                @"helper method didn't return right encoding for "
//                @"kCFStringEncodingUTF8");

//   STAssertTrue(SqliteTextEncodingToCFStringEncoding(SQLITE_UTF16BE)
//                == kCFStringEncodingUTF16BE,
//                @"helper method didn't return right encoding for "
//                @"kCFStringEncodingUTF16BE");

//   STAssertTrue(SqliteTextEncodingToCFStringEncoding(SQLITE_UTF16LE)
//                == kCFStringEncodingUTF16LE,
//                @"helper method didn't return right encoding for "
//                @"kCFStringEncodingUTF16LE");

//   STAssertTrue(SqliteTextEncodingToCFStringEncoding(9999)
//                == kCFStringEncodingUTF8, @"helper method didn't "
//                @"return default encoding for invalid input");
// }

@end


//  Helper function for LIKE/GLOB testing
static NSArray* LikeGlobTestHelper(GTMSQLiteDatabase *db, NSString *sql) {

  int err;
  NSMutableArray *resultArray = [NSMutableArray array];
  GTMSQLiteStatement *statement = [GTMSQLiteStatement statementWithSQL:sql
                                                          inDatabase:db
                                                           errorCode:&err];
  if (!statement || err != SQLITE_OK) return nil;
  while ([statement stepRow] == SQLITE_ROW) {
    id result = [statement resultFoundationObjectAtPosition:0];
    if (result) [resultArray addObject:result];
  }
  if (err != SQLITE_DONE && err != SQLITE_OK) resultArray = nil;
  [statement finalizeStatement];

  return resultArray;
}

// =============================================================================

@implementation GTMSQLiteStatementTest

#pragma mark Parameters/binding tests

- (void)testInitAPI {
  int err;
  GTMSQLiteStatement *statement = [GTMSQLiteStatement statementWithSQL:nil
                                                            inDatabase:nil
                                                             errorCode:&err];
  STAssertNil(statement, @"Create statement succeeded with nil SQL string");
  STAssertEquals(err, SQLITE_MISUSE, @"Err was not SQLITE_MISUSE on nil "
                 @"SQL string");

  GTMSQLiteDatabase *db =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];

  statement = [GTMSQLiteStatement statementWithSQL:@"select * from blah"
                                       inDatabase:db
                                        errorCode:&err];

  STAssertNil(statement, @"Select statement succeeded with invalid table");
  STAssertNotEquals(err, SQLITE_OK,
                    @"Err was not SQLITE_MISUSE on invalid table");

  [statement finalizeStatement];
}

- (void)testParameterCountAPI {
  int err;
  GTMSQLiteDatabase *db =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];

  NSString *tableCreateSQL =
    @"CREATE TABLE foo (tc TEXT,"
    @"ic integer,"
    @"rc real,"
    @"bc blob);";

  err = [db executeSQL:tableCreateSQL];

  STAssertEquals(err, SQLITE_OK,
                 @"Failed to create table for collation test");
  NSString *insert =
    @"insert into foo (tc, ic, rc, bc) values (:tc, :ic, :rc, :bc);";

  GTMSQLiteStatement *statement = [GTMSQLiteStatement statementWithSQL:insert
                                                            inDatabase:db
                                                             errorCode:&err];
  STAssertNotNil(statement, @"Failed to create statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create statement");
  STAssertEquals([statement parameterCount], 4,
                 @"Bound parameter count was not 4");

  [statement sqlite3Statement];
  [statement finalizeStatement];
}

- (void)testPositionOfNamedParameterAPI {
  int err;

  GTMSQLiteDatabase *dbWithCF =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];

  GTMSQLiteDatabase *dbWithoutCF =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:NO
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];

  NSArray *databases = [NSArray arrayWithObjects:dbWithCF, dbWithoutCF, nil];
  GTMSQLiteDatabase *db;
  GTM_FOREACH_OBJECT(db, databases) {
    NSString *tableCreateSQL =
      @"CREATE TABLE foo (tc TEXT,"
      @"ic integer,"
      @"rc real,"
      @"bc blob);";
    err = [db executeSQL:tableCreateSQL];

    STAssertEquals(err, SQLITE_OK,
                   @"Failed to create table for collation test");
    NSString *insert =
      @"insert into foo (tc, ic, rc, bc) "
      @"values (:tc, :ic, :rc, :bc);";

    GTMSQLiteStatement *statement = [GTMSQLiteStatement statementWithSQL:insert
                                                              inDatabase:db
                                                               errorCode:&err];
    STAssertNotNil(statement, @"Failed to create statement");
    STAssertEquals(err, SQLITE_OK, @"Failed to create statement");

    NSArray *parameterNames = [NSArray arrayWithObjects:@":tc",
                                                        @":ic",
                                                        @":rc",
                                                        @":bc", nil];

    for (unsigned int i = 1; i <= [parameterNames count]; i++) {
      NSString *paramName = [parameterNames objectAtIndex:i-1];
      // Cast to signed int to avoid type errors from STAssertEquals
      STAssertEquals((int)i,
                     [statement positionOfParameterNamed:paramName],
                     @"positionOfParameterNamed API did not return correct "
                     @"results");
      STAssertEqualStrings(paramName,
                           [statement nameOfParameterAtPosition:i],
                           @"nameOfParameterAtPosition API did not return "
                           @"correct name");
    }
    [statement finalizeStatement];
  }
}

- (void)testBindingBlob {
  int err;
  const int BLOB_COLUMN = 0;
  GTMSQLiteDatabase *dbWithCF =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];

  GTMSQLiteDatabase *dbWithoutCF =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:NO
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];

  NSArray *databases = [NSArray arrayWithObjects:dbWithCF, dbWithoutCF, nil];
  GTMSQLiteDatabase *db;
  GTM_FOREACH_OBJECT(db, databases) {
    // Test strategy is to create a table with 3 columns
    // Insert some values, and use the result collection APIs
    // to make sure we get the same values back
    err = [db executeSQL:
                @"CREATE TABLE blobby (bc blob);"];

    STAssertEquals(err, SQLITE_OK,
                   @"Failed to create table for BLOB binding test");
    NSString *insert = @"insert into blobby (bc) values (:bc);";
    GTMSQLiteStatement *statement = [GTMSQLiteStatement statementWithSQL:insert
                                                              inDatabase:db
                                                               errorCode:&err];
    STAssertNotNil(statement, @"Failed to create insert statement");
    STAssertEquals(err, SQLITE_OK, @"Failed to create insert statement");

    char bytes[] = "DEADBEEF";
    NSUInteger bytesLen = strlen(bytes);
    NSData *originalBytes = [NSData dataWithBytes:bytes length:bytesLen];

    err = [statement bindBlobAtPosition:1 data:originalBytes];

    STAssertEquals(err, SQLITE_OK, @"error binding BLOB at position 1");

    err = [statement stepRow];
    STAssertEquals(err, SQLITE_DONE, @"failed to insert BLOB for BLOB test");

    [statement finalizeStatement];

    NSString *selectSQL = @"select * from blobby;";
    statement = [GTMSQLiteStatement statementWithSQL:selectSQL
                                          inDatabase:db
                                           errorCode:&err];
    STAssertNotNil(statement, @"Failed to create select statement");
    STAssertEquals(err, SQLITE_OK, @"Failed to create select statement");

    err = [statement stepRow];
    // Check that we got at least one row back
    STAssertEquals(err, SQLITE_ROW, @"did not retrieve a row from db :-(");
    STAssertEquals([statement resultColumnCount], 1,
                   @"result had more columns than the table had?");

    STAssertEqualStrings([statement resultColumnNameAtPosition:BLOB_COLUMN],
                         @"bc",
                         @"column name dictionary was not correct");

    STAssertEquals([statement rowDataCount],
                   1,
                   @"More than one column returned?");

    STAssertEquals([statement resultColumnTypeAtPosition:BLOB_COLUMN],
                   SQLITE_BLOB,
                   @"Query for column 1 of test table was not BLOB!");

    NSData *returnedbytes = [statement resultBlobDataAtPosition:BLOB_COLUMN];
    STAssertTrue([originalBytes isEqualToData:returnedbytes],
                 @"Queried data was not equal :-(");
    [statement finalizeStatement];
  }
}

- (void)testBindingNull {
  int err;
  GTMSQLiteDatabase *db =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];

  err = [db executeSQL:
              @"CREATE TABLE foo (tc TEXT);"];

  STAssertEquals(err, SQLITE_OK,
                 @"Failed to create table for NULL binding test");
  NSString *insert = @"insert into foo (tc) values (:tc);";

  GTMSQLiteStatement *statement = [GTMSQLiteStatement statementWithSQL:insert
                                                            inDatabase:db
                                                             errorCode:&err];
  STAssertNotNil(statement, @"Failed to create insert statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create insert statement");

  err = [statement bindSQLNullAtPosition:1];

  STAssertEquals(err, SQLITE_OK, @"error binding NULL at position 1");

  err = [statement stepRow];
  STAssertEquals(err, SQLITE_DONE, @"failed to insert NULL for Null Binding test");

  [statement finalizeStatement];

  NSString *selectSQL = @"select 1 from foo where tc is NULL;";
  statement = [GTMSQLiteStatement statementWithSQL:selectSQL
                                        inDatabase:db
                                         errorCode:&err];
  STAssertNotNil(statement, @"Failed to create select statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create select statement");

  err = [statement stepRow];
  // Check that we got at least one row back
  STAssertEquals(err, SQLITE_ROW, @"did not retrieve a row from db :-(");
  [statement finalizeStatement];
}

- (void)testBindingDoubles {
  int err;
  GTMSQLiteDatabase *db =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];

  // Test strategy is to create a table with 2 real columns.
  // For the first one, we'll use bindDoubleAtPosition
  // For the second one, we'll use bindNumberAsDoubleAtPosition
  // Then, for verification, we'll use a query that returns
  // all rows where the columns are equal
  double testVal = 42.42;
  NSNumber *doubleValue = [NSNumber numberWithDouble:testVal];

  err = [db executeSQL:
              @"CREATE TABLE realTable (rc1 REAL, rc2 REAL);"];

  STAssertEquals(err, SQLITE_OK,
                 @"Failed to create table for double binding test");
  NSString *insert = @"insert into realTable (rc1, rc2) values (:rc1, :rc2);";

  GTMSQLiteStatement *statement = [GTMSQLiteStatement statementWithSQL:insert
                                                            inDatabase:db
                                                             errorCode:&err];
  STAssertNotNil(statement, @"Failed to create insert statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create insert statement");

  err = [statement bindDoubleAtPosition:1 value:testVal];
  STAssertEquals(err, SQLITE_OK, @"error binding double at position 1");

  err = [statement bindNumberAsDoubleAtPosition:2 number:doubleValue];
  STAssertEquals(err, SQLITE_OK,
                 @"error binding number as double at "
                 @"position 2");

  err = [statement stepRow];
  STAssertEquals(err, SQLITE_DONE,
                 @"failed to insert doubles for double "
                 @"binding test");

  [statement finalizeStatement];

  NSString *selectSQL = @"select rc1, rc2 from realTable where rc1 = rc2;";
  statement = [GTMSQLiteStatement statementWithSQL:selectSQL
                                        inDatabase:db
                                         errorCode:&err];
  STAssertNotNil(statement, @"Failed to create select statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create select statement");

  err = [statement stepRow];
  // Check that we got at least one row back
  STAssertEquals(err, SQLITE_ROW, @"did not retrieve a row from db :-(");
  double retrievedValue = [statement resultDoubleAtPosition:0];
  STAssertEquals(retrievedValue, testVal,
                 @"Retrieved double did not equal "
                 @"original");

  NSNumber *retrievedNumber = [statement resultNumberAtPosition:1];
  STAssertEqualObjects(retrievedNumber, doubleValue,
               @"Retrieved NSNumber object did not equal");

  [statement finalizeStatement];
}

- (void) testResultCollectionAPI {
  int err;
  GTMSQLiteDatabase *dbWithCF =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];

  GTMSQLiteDatabase *dbWithoutCF =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:NO
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];

  NSArray *databases = [NSArray arrayWithObjects:dbWithCF, dbWithoutCF, nil];
  GTMSQLiteDatabase *db;
  GTM_FOREACH_OBJECT(db, databases) {
    // Test strategy is to create a table with 3 columns
    // Insert some values, and use the result collection APIs
    // to make sure we get the same values back
    err = [db executeSQL:
                @"CREATE TABLE test (a integer, b text, c blob, d text);"];

    STAssertEquals(err, SQLITE_OK,
                   @"Failed to create table for result collection test");

    NSString *insert =
      @"insert into test (a, b, c, d) "
      @"values (42, 'text text', :bc, null);";

    GTMSQLiteStatement *statement = [GTMSQLiteStatement statementWithSQL:insert
                                                              inDatabase:db
                                                               errorCode:&err];
    STAssertNotNil(statement, @"Failed to create insert statement");
    STAssertEquals(err, SQLITE_OK, @"Failed to create insert statement");


    char blobChars[] = "DEADBEEF";
    NSUInteger blobLength = strlen(blobChars);
    NSData *blobData = [NSData dataWithBytes:blobChars length:blobLength];

    err = [statement bindBlobAtPosition:1 data:blobData];
    STAssertEquals(err, SQLITE_OK, @"error binding BLOB at position 1");

    err = [statement stepRow];
    STAssertEquals(err, SQLITE_DONE,
                   @"failed to insert doubles for double "
                   @"binding test");

    NSString *selectSQL = @"select * from test;";

    [statement finalizeStatement];

    statement = [GTMSQLiteStatement statementWithSQL:selectSQL
                                          inDatabase:db
                                           errorCode:&err];
    STAssertNotNil(statement, @"Failed to create select statement");
    STAssertEquals(err, SQLITE_OK, @"Failed to create select statement");

    err = [statement stepRow];
    // Check that we got at least one row back
    STAssertEquals(err, SQLITE_ROW, @"did not retrieve a row from db :-(");
    STAssertNotNil([statement resultRowArray],
                   @"Failed to retrieve result array");
    STAssertNotNil([statement resultRowDictionary],
                   @"Failed to retrieve result dictionary");
    [statement finalizeStatement];
  }
}

- (void) testBindingIntegers {
  int err;
  GTMSQLiteDatabase *db =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];

  // Test strategy is to create a table with 2 real columns.
  // For the first one, we'll use bindIntegerAtPosition
  // For the second one, we'll use bindNumberAsIntegerAtPosition
  // Then, for verification, we'll use a query that returns
  // all rows where the columns are equal
  int testVal = 42;
  NSNumber *intValue = [NSNumber numberWithInt:testVal];

  err = [db executeSQL:
              @"CREATE TABLE integerTable (ic1 integer, ic2 integer);"];

  STAssertEquals(err, SQLITE_OK,
                 @"Failed to create table for integer binding test");
  NSString *insert =
    @"insert into integerTable (ic1, ic2) values (:ic1, :ic2);";

  GTMSQLiteStatement *statement = [GTMSQLiteStatement statementWithSQL:insert
                                                            inDatabase:db
                                                             errorCode:&err];
  STAssertNotNil(statement, @"Failed to create insert statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create insert statement");

  err = [statement bindInt32AtPosition:1 value:testVal];
  STAssertEquals(err, SQLITE_OK, @"error binding integer at position 1");

  err = [statement bindNumberAsInt32AtPosition:2 number:intValue];
  STAssertEquals(err, SQLITE_OK,
                 @"error binding number as integer at "
                 @"position 2");

  err = [statement stepRow];
  STAssertEquals(err, SQLITE_DONE,
                 @"failed to insert integers for integer "
                 @"binding test");

  [statement finalizeStatement];

  NSString *selectSQL = @"select ic1, ic2 from integerTable where ic1 = ic2;";
  statement = [GTMSQLiteStatement statementWithSQL:selectSQL
                                        inDatabase:db
                                         errorCode:&err];
  STAssertNotNil(statement, @"Failed to create select statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create select statement");

  err = [statement stepRow];
  // Check that we got at least one row back
  STAssertEquals(err, SQLITE_ROW, @"did not retrieve a row from db :-(");
  int retrievedValue = [statement resultInt32AtPosition:0];
  STAssertEquals(retrievedValue, testVal,
                 @"Retrieved integer did not equal "
                 @"original");

  NSNumber *retrievedNumber = [statement resultNumberAtPosition:1];
  STAssertEqualObjects(retrievedNumber, intValue,
               @"Retrieved NSNumber object did not equal");

  [statement finalizeStatement];
}

- (void) testBindingLongLongs {
  int err;
  GTMSQLiteDatabase *db =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];

  // Test strategy is to create a table with 2 long long columns.
  // For the first one, we'll use bindLongLongAtPosition
  // For the second one, we'll use bindNumberAsLongLongAtPosition
  // Then, for verification, we'll use a query that returns
  // all rows where the columns are equal
  long long testVal = LLONG_MAX;
  NSNumber *longlongValue = [NSNumber numberWithLongLong:testVal];

  err = [db executeSQL:
              @"CREATE TABLE longlongTable (llc1 integer, llc2 integer);"];

  STAssertEquals(err, SQLITE_OK,
                 @"Failed to create table for long long binding test");
  NSString *insert =
    @"insert into longlongTable (llc1, llc2) "
    @"values (:llc1, :llc2);";

  GTMSQLiteStatement *statement = [GTMSQLiteStatement statementWithSQL:insert
                                                            inDatabase:db
                                                             errorCode:&err];
  STAssertNotNil(statement, @"Failed to create insert statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create insert statement");

  err = [statement bindLongLongAtPosition:1 value:testVal];
  STAssertEquals(err, SQLITE_OK, @"error binding long long at position 1");

  err = [statement bindNumberAsLongLongAtPosition:2 number:longlongValue];
  STAssertEquals(err, SQLITE_OK,
                 @"error binding number as long long at "
                 @"position 2");

  err = [statement stepRow];
  STAssertEquals(err, SQLITE_DONE,
                 @"failed to insert long longs for long long "
                 @"binding test");

  [statement finalizeStatement];

  NSString *selectSQL = @"select llc1, llc2 from longlongTable where llc1 = llc2;";

  statement = [GTMSQLiteStatement statementWithSQL:selectSQL
                                        inDatabase:db
                                         errorCode:&err];
  STAssertNotNil(statement, @"Failed to create select statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create select statement");

  err = [statement stepRow];
  // Check that we got at least one row back
  STAssertEquals(err, SQLITE_ROW, @"did not retrieve a row from db :-(");
  long long retrievedValue = [statement resultLongLongAtPosition:0];
  STAssertEquals(retrievedValue, testVal,
                 @"Retrieved long long did not equal "
                 @"original");

  NSNumber *retrievedNumber = [statement resultNumberAtPosition:1];
  STAssertEqualObjects(retrievedNumber, longlongValue,
               @"Retrieved NSNumber object did not equal");

  [statement finalizeStatement];
}

- (void) testBindingString {
  int err;
  GTMSQLiteDatabase *db =
    [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                       utf8:YES
                                                  errorCode:&err]
      autorelease];

  // Test strategy is to create a table with 1 string column
  // Then, for verification, we'll use a query that returns
  // all rows where the strings are equal
  err = [db executeSQL:
              @"CREATE TABLE stringTable (sc1 text);"];

  STAssertEquals(err, SQLITE_OK,
                 @"Failed to create table for string binding test");

  NSString *insert =
    @"insert into stringTable (sc1) "
    @"values (:sc1);";

  GTMSQLiteStatement *statement = [GTMSQLiteStatement statementWithSQL:insert
                                                            inDatabase:db
                                                             errorCode:&err];
  STAssertNotNil(statement, @"Failed to create insert statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create insert statement");

  NSString *testVal = @"this is a test string";
  err = [statement bindStringAtPosition:1 string:testVal];
  STAssertEquals(err, SQLITE_OK, @"error binding string at position 1");

  err = [statement stepRow];
  STAssertEquals(err, SQLITE_DONE,
                 @"failed to insert string for string binding test");

  [statement finalizeStatement];

  NSString *selectSQL =
    [NSString stringWithFormat:@"select 1 from stringtable where sc1 = '%@';",
              testVal];

  statement = [GTMSQLiteStatement statementWithSQL:selectSQL
                                        inDatabase:db
                                         errorCode:&err];
  STAssertNotNil(statement, @"Failed to create select statement");
  STAssertEquals(err, SQLITE_OK, @"Failed to create select statement");

  err = [statement stepRow];
  // Check that we got at least one row back
  STAssertEquals(err, SQLITE_ROW, @"did not retrieve a row from db :-(");
  err = [statement stepRow];
  STAssertEquals(err, SQLITE_DONE, @"retrieved more than 1 row from db :-(");
  [statement finalizeStatement];
}

- (void)testThatNotFinalizingStatementsThrowsAssertion {
  // The run-time check is discouraged, but we're using it because the
  // same test binary is used for both GC & Non-GC runs
  if (!GTMIsGarbageCollectionEnabled())  {
      NSAutoreleasePool *localPool = [[NSAutoreleasePool alloc] init];

    int err;
    GTMSQLiteDatabase *db =
      [[[GTMSQLiteDatabase alloc] initInMemoryWithCFAdditions:YES
                                                         utf8:YES
                                                    errorCode:&err]
        autorelease];

    STAssertNotNil(db, @"Failed to create database");

    sqlite3 *sqlite3DB = [db sqlite3DB];
    
    NSString *selectSQL = @"select 1";
    GTMSQLiteStatement *statement;
    statement = [GTMSQLiteStatement statementWithSQL:selectSQL
                                          inDatabase:db
                                           errorCode:&err];
    STAssertNotNil(statement, @"Failed to create select statement");
    STAssertEquals(err, SQLITE_OK, @"Failed to create select statement");

    sqlite3_stmt *sqlite3Statment = [statement sqlite3Statement];

    err = [statement stepRow];
    STAssertEquals(err, SQLITE_ROW,
                   @"failed to step row for finalize test");

    NSString *expectedLog = 
      @"-[GTMSQLiteStatement finalizeStatement] must be called "
      @"when statement is no longer needed";

    [GTMUnitTestDevLog expectString:@"%@", expectedLog];
    [GTMUnitTestDevLog expectPattern:@"Unable to close .*"];
    [localPool drain];
    
    // Clean up leaks. Since we hadn't finalized the statement above we
    // were unable to clean up the sqlite databases. Since the pool is drained
    // all of our objective-c objects are gone, so we have to call the
    // sqlite3 api directly.
    STAssertEquals(sqlite3_finalize(sqlite3Statment), SQLITE_OK, nil);
    STAssertEquals(sqlite3_close(sqlite3DB), SQLITE_OK, nil);
  }
}

- (void)testCompleteSQLString {
  NSString *str = @"CREATE TABLE longlongTable (llc1 integer, llc2 integer);";
  BOOL isComplete = [GTMSQLiteStatement isCompleteStatement:str];
  STAssertTrue(isComplete, nil);
  isComplete = [GTMSQLiteStatement isCompleteStatement:@""];
  STAssertTrue(isComplete, nil);
  isComplete = [GTMSQLiteStatement isCompleteStatement:@"CR"];
  STAssertFalse(isComplete, nil);
}

- (void)testQuotingSQLString {
  NSString *str = @"This is wild! It's fun!";
  NSString *str2 = [GTMSQLiteStatement quoteAndEscapeString:str];
  STAssertEqualObjects(str2, @"'This is wild! It''s fun!'", nil);
  str2 = [GTMSQLiteStatement quoteAndEscapeString:@""];
  STAssertEqualObjects(str2, @"''", nil);
}

- (void)testVersion {
  STAssertGreaterThan([GTMSQLiteDatabase sqliteVersionNumber], 0, nil);
  STAssertNotNil([GTMSQLiteDatabase sqliteVersionString], nil);
}

@end

static void TestUpperLower16Impl(sqlite3_context *context,
                                 int argc, sqlite3_value **argv) {

  customUpperFunctionCalled = YES;
}

/* Copyright (c) 2010 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#import "GTMURITemplate.h"

#import "GTMGarbageCollection.h"

#if MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

// Key constants for handling variables.
static NSString *const kVariable = @"variable"; // NSString
static NSString *const kExplode = @"explode"; // NSString
static NSString *const kPartial = @"partial"; // NSString
static NSString *const kPartialValue = @"partialValue"; // NSNumber

// Help for passing the Expansion info in one shot.
struct ExpansionInfo {
  // Constant for the whole expansion.
  unichar expressionOperator;
  NSString *joiner;
  BOOL allowReservedInEscape;

  // Update for each variable.
  NSString *explode;
};

// Helper just to shorten the lines when needed.
static NSString *UnescapeString(NSString *str) {
  return [str stringByReplacingPercentEscapesUsingEncoding:NSUTF8StringEncoding];
}

static NSString *EscapeString(NSString *str, BOOL allowReserved) {
  static CFStringRef kReservedChars = CFSTR(":/?#[]@!$&'()*+,;=");
  CFStringRef allowedChars = allowReserved ? kReservedChars : NULL;

  // NSURL's stringByAddingPercentEscapesUsingEncoding: does not escape
  // some characters that should be escaped in URL parameters, like / and ?;
  // we'll use CFURL to force the encoding of those
  //
  // Reference: http://www.ietf.org/rfc/rfc3986.txt
  static CFStringRef kCharsToForceEscape = CFSTR("!*'();:@&=+$,/?%#[]");
  static CFStringRef kCharsToForceEscapeSansReserved = CFSTR("%");
  CFStringRef forceEscapedChars =
    allowReserved ? kCharsToForceEscapeSansReserved : kCharsToForceEscape;

  NSString *resultStr = str;
  CFStringRef escapedStr =
    CFURLCreateStringByAddingPercentEscapes(kCFAllocatorDefault,
                                            (CFStringRef)str,
                                            allowedChars,
                                            forceEscapedChars,
                                            kCFStringEncodingUTF8);
  if (escapedStr) {
    resultStr = GTMCFAutorelease(escapedStr);
  }
  return resultStr;
}

@interface GTMURITemplate ()
+ (BOOL)parseExpression:(NSString *)expression
     expressionOperator:(unichar*)outExpressionOperator
              variables:(NSMutableArray **)outVariables
          defaultValues:(NSMutableDictionary **)outDefaultValues;

+ (NSString *)expandVariables:(NSArray *)variables
           expressionOperator:(unichar)expressionOperator
                       values:(id)valueProvider
                defaultValues:(NSMutableDictionary *)defaultValues;

+ (NSString *)expandString:(NSString *)valueStr
              variableName:(NSString *)variableName
             expansionInfo:(struct ExpansionInfo *)expansionInfo;
+ (NSString *)expandArray:(NSArray *)valueArray
             variableName:(NSString *)variableName
            expansionInfo:(struct ExpansionInfo *)expansionInfo;
+ (NSString *)expandDictionary:(NSDictionary *)valueDict
                  variableName:(NSString *)variableName
                 expansionInfo:(struct ExpansionInfo *)expansionInfo;
@end

@implementation GTMURITemplate

#pragma mark Internal Helpers

+ (BOOL)parseExpression:(NSString *)expression
     expressionOperator:(unichar*)outExpressionOperator
              variables:(NSMutableArray **)outVariables
          defaultValues:(NSMutableDictionary **)outDefaultValues {

  // Please see the spec for full details, but here are the basics:
  //
  //    URI-Template  =  *( literals / expression )
  //    expression    =  "{" [ operator ] variable-list "}"
  //    variable-list =  varspec *( "," varspec )
  //    varspec       =  varname [ modifier ] [ "=" default ]
  //    varname       =  varchar *( varchar / "." )
  //    modifier      =  explode / partial
  //    explode       =  ( "*" / "+" )
  //    partial       =  ( substring / remainder ) offset
  //
  // Examples:
  //  http://www.example.com/foo{?query,number}
  //  http://maps.com/mapper{?address*}
  //  http://directions.org/directions{?from+,to+}
  //  http://search.org/query{?terms+=none}
  //

  // http://tools.ietf.org/html/draft-gregorio-uritemplate-04#section-2.2
  // Operator and op-reserve characters
  static NSCharacterSet *operatorSet = nil;
  // http://tools.ietf.org/html/draft-gregorio-uritemplate-04#section-2.4.1
  // Explode characters
  static NSCharacterSet *explodeSet = nil;
  // http://tools.ietf.org/html/draft-gregorio-uritemplate-04#section-2.4.2
  // Partial (prefix/subset) characters
  static NSCharacterSet *partialSet = nil;

  @synchronized(self) {
    if (operatorSet == nil) {
      operatorSet = [[NSCharacterSet characterSetWithCharactersInString:@"+./;?|!@"] retain];
    }
    if (explodeSet == nil) {
      explodeSet = [[NSCharacterSet characterSetWithCharactersInString:@"*+"] retain];
    }
    if (partialSet == nil) {
      partialSet = [[NSCharacterSet characterSetWithCharactersInString:@":^"] retain];
    }
  }

  // http://tools.ietf.org/html/draft-gregorio-uritemplate-04#section-3.3
  // Empty expression inlines the expression.
  if ([expression length] == 0) return NO;

  // Pull off any operator.
  *outExpressionOperator = 0;
  unichar firstChar = [expression characterAtIndex:0];
  if ([operatorSet characterIsMember:firstChar]) {
    *outExpressionOperator = firstChar;
    expression = [expression substringFromIndex:1];
  }

  if ([expression length] == 0) return NO;

  // Need to find at least one varspec for the expresssion to be considered
  // valid.
  BOOL gotAVarspec = NO;

  // Split the variable list.
  NSArray *varspecs = [expression componentsSeparatedByString:@","];

  // Extract the defaults, explodes and modifiers from the varspecs.
  *outVariables = [NSMutableArray arrayWithCapacity:[varspecs count]];
  for (NSString *varspec in varspecs) {
    NSString *defaultValue = nil;

    if ([varspec length] == 0) continue;

    NSMutableDictionary *varInfo =
      [NSMutableDictionary dictionaryWithCapacity:4];

    // Check for a default (foo=bar).
    NSRange range = [varspec rangeOfString:@"="];
    if (range.location != NSNotFound) {
      defaultValue =
        UnescapeString([varspec substringFromIndex:range.location + 1]);
      varspec = [varspec substringToIndex:range.location];

      if ([varspec length] == 0) continue;
    }

    // Check for explode (foo*).
    NSUInteger lenLessOne = [varspec length] - 1;
    if ([explodeSet characterIsMember:[varspec characterAtIndex:lenLessOne]]) {
      [varInfo setObject:[varspec substringFromIndex:lenLessOne] forKey:kExplode];
      varspec = [varspec substringToIndex:lenLessOne];
      if ([varspec length] == 0) continue;
    } else {
      // Check for partial (prefix/suffix) (foo:12).
      range = [varspec rangeOfCharacterFromSet:partialSet];
      if (range.location != NSNotFound) {
        NSString *partialMode = [varspec substringWithRange:range];
        NSString *valueStr = [varspec substringFromIndex:range.location + 1];
        // If there wasn't a value for the partial, ignore it.
        if ([valueStr length] > 0) {
          [varInfo setObject:partialMode forKey:kPartial];
          // TODO: Should validate valueStr is just a number...
          [varInfo setObject:[NSNumber numberWithInteger:[valueStr integerValue]]
                      forKey:kPartialValue];
        }
        varspec = [varspec substringToIndex:range.location];
        if ([varspec length] == 0) continue;
      }
    }

    // Spec allows percent escaping in names, so undo that.
    varspec = UnescapeString(varspec);

    // Save off the cleaned up variable name.
    [varInfo setObject:varspec forKey:kVariable];
    [*outVariables addObject:varInfo];
    gotAVarspec = YES;

    // Now that the variable has been cleaned up, store its default.
    if (defaultValue) {
      if (*outDefaultValues == nil) {
        *outDefaultValues = [NSMutableDictionary dictionary];
      }
      [*outDefaultValues setObject:defaultValue forKey:varspec];
    }
  }
  // All done.
  return gotAVarspec;
}

+ (NSString *)expandVariables:(NSArray *)variables
           expressionOperator:(unichar)expressionOperator
                       values:(id)valueProvider
                defaultValues:(NSMutableDictionary *)defaultValues {
  NSString *prefix = nil;
  struct ExpansionInfo expansionInfo;
  expansionInfo.expressionOperator = expressionOperator;
  expansionInfo.joiner = nil;
  expansionInfo.allowReservedInEscape = NO;
  switch (expressionOperator) {
    case 0:
      expansionInfo.joiner = @",";
      prefix = @"";
      break;
    case '+':
      expansionInfo.joiner = @",";
      prefix = @"";
      // The reserved character are safe from escaping.
      expansionInfo.allowReservedInEscape = YES;
      break;
    case '.':
      expansionInfo.joiner = @".";
      prefix = @".";
      break;
    case '/':
      expansionInfo.joiner = @"/";
      prefix = @"/";
      break;
    case ';':
      expansionInfo.joiner = @";";
      prefix = @";";
      break;
    case '?':
      expansionInfo.joiner = @"&";
      prefix = @"?";
      break;
    default:
      [NSException raise:@"GTMURITemplateUnsupported"
                  format:@"Unknown expression operator '%C'", expressionOperator];
      break;
  }

  NSMutableArray *results = [NSMutableArray arrayWithCapacity:[variables count]];

  for (NSDictionary *varInfo in variables) {
    NSString *variable = [varInfo objectForKey:kVariable];

    expansionInfo.explode = [varInfo objectForKey:kExplode];
    // Look up the variable value.
    id rawValue = [valueProvider objectForKey:variable];

    // If the value is an empty array or dictionary, the default is still used.
    if (([rawValue isKindOfClass:[NSArray class]]
         || [rawValue isKindOfClass:[NSDictionary class]])
        && [rawValue count] == 0) {
      rawValue = nil;
    }

    // Got nothing?  Check defaults.
    if (rawValue == nil) {
      rawValue = [defaultValues objectForKey:variable];
    }

    // If we didn't get any value, on to the next thing.
    if (!rawValue) {
      continue;
    }

    // Time do to the work...
    NSString *result = nil;
    if ([rawValue isKindOfClass:[NSString class]]) {
      result = [self expandString:rawValue
                     variableName:variable
                    expansionInfo:&expansionInfo];
    } else if ([rawValue isKindOfClass:[NSNumber class]]) {
      // Turn the number into a string and send it on its way.
      result = [self expandString:[rawValue stringValue]
                     variableName:variable
                    expansionInfo:&expansionInfo];
    } else if ([rawValue isKindOfClass:[NSArray class]]) {
      result = [self expandArray:rawValue
                    variableName:variable
                   expansionInfo:&expansionInfo];
    } else if ([rawValue isKindOfClass:[NSDictionary class]]) {
      result = [self expandDictionary:rawValue
                         variableName:variable
                        expansionInfo:&expansionInfo];
    } else {
      [NSException raise:@"GTMURITemplateUnsupported"
                  format:@"Variable returned unsupported type (%@)",
                         NSStringFromClass([rawValue class])];
    }

    // Did it generate anything?
    if (!result)
      continue;

    // Apply partial.
    // Defaults should get partial applied?
    // ( http://tools.ietf.org/html/draft-gregorio-uritemplate-04#section-2.5 )
    NSString *partial = [varInfo objectForKey:kPartial];
    if ([partial length] > 0) {
      [NSException raise:@"GTMURITemplateUnsupported"
                  format:@"Unsupported partial on expansion %@", partial];
    }

    // Add the result
    [results addObject:result];
  }

  // Join and add any needed prefix.
  NSString *joinedResults =
    [results componentsJoinedByString:expansionInfo.joiner];
  if (([prefix length] > 0) && ([joinedResults length] > 0)) {
    return [prefix stringByAppendingString:joinedResults];
  }
  return joinedResults;
}

+ (NSString *)expandString:(NSString *)valueStr
              variableName:(NSString *)variableName
             expansionInfo:(struct ExpansionInfo *)expansionInfo {
  NSString *escapedValue =
    EscapeString(valueStr, expansionInfo->allowReservedInEscape);
  switch (expansionInfo->expressionOperator) {
    case ';':
    case '?':
      if ([valueStr length] > 0) {
        return [NSString stringWithFormat:@"%@=%@", variableName, escapedValue];
      }
      return variableName;
    default:
      return escapedValue;
  }
}

+ (NSString *)expandArray:(NSArray *)valueArray
             variableName:(NSString *)variableName
            expansionInfo:(struct ExpansionInfo *)expansionInfo {
  NSMutableArray *results = [NSMutableArray arrayWithCapacity:[valueArray count]];
  // When joining variable with value, use "var.val" except for 'path' and
  // 'form' style expression, use 'var=val' then.
  char variableValueJoiner = '.';
  char expressionOperator = expansionInfo->expressionOperator;
  if ((expressionOperator == ';') || (expressionOperator == '?')) {
    variableValueJoiner = '=';
  }
  // Loop over the values.
  for (NSString *value in valueArray) {
    // Escape it.
    value = EscapeString(value, expansionInfo->allowReservedInEscape);
    // Should variable names be used?
    if ([expansionInfo->explode isEqual:@"+"]) {
      value = [NSString stringWithFormat:@"%@%c%@",
               variableName, variableValueJoiner, value];
    }
    [results addObject:value];
  }
  if ([results count] > 0) {
    // Use the default joiner unless there was no explode request, then a list
    // always gets comma seperated.
    NSString *joiner = expansionInfo->joiner;
    if (expansionInfo->explode == nil) {
      joiner = @",";
    }
    // Join the values.
    NSString *joined = [results componentsJoinedByString:joiner];
    // 'form' style without an explode gets the variable name set to the
    // joined list of values.
    if ((expressionOperator == '?') && (expansionInfo->explode == nil)) {
      return [NSString stringWithFormat:@"%@=%@", variableName, joined];
    }
    return joined;
  }
  return nil;
}

+ (NSString *)expandDictionary:(NSDictionary *)valueDict
                  variableName:(NSString *)variableName
                 expansionInfo:(struct ExpansionInfo *)expansionInfo {
  NSMutableArray *results = [NSMutableArray arrayWithCapacity:[valueDict count]];
  // When joining variable with value:
  // - Default to the joiner...
  // - No explode, always comma...
  // - For 'path' and 'form' style expression, use 'var=val'.
  NSString *keyValueJoiner = expansionInfo->joiner;
  char expressionOperator = expansionInfo->expressionOperator;
  if (!expansionInfo->explode) {
    keyValueJoiner = @",";
  } else if ((expressionOperator == ';') || (expressionOperator == '?')) {
    keyValueJoiner = @"=";
  }
  // Loop over the sorted keys.
  NSArray *sortedKeys =
    [[valueDict allKeys] sortedArrayUsingSelector:@selector(compare:)];
  for (NSString *key in sortedKeys) {
    NSString *value = [valueDict objectForKey:key];
    // Escape them.
    key = EscapeString(key, expansionInfo->allowReservedInEscape);
    value = EscapeString(value, expansionInfo->allowReservedInEscape);
    // Should variable names be used?
    if ([expansionInfo->explode isEqual:@"+"]) {
      key = [NSString stringWithFormat:@"%@.%@", variableName, key];
    }
    if ((expressionOperator == '?' || expressionOperator == ';')
        && ([value length] == 0)) {
      [results addObject:key];
    } else {
      NSString *pair = [NSString stringWithFormat:@"%@%@%@",
                        key, keyValueJoiner, value];
      [results addObject:pair];
    }
  }
  if ([results count]) {
    // Use the default joiner unless there was no explode request, then a list
    // always gets comma seperated.
    NSString *joiner = expansionInfo->joiner;
    if (!expansionInfo->explode) {
      joiner = @",";
    }
    // Join the values.
    NSString *joined = [results componentsJoinedByString:joiner];
    // 'form' style without an explode gets the variable name set to the
    // joined list of values.
    if ((expressionOperator == '?') && (expansionInfo->explode == nil)) {
      return [NSString stringWithFormat:@"%@=%@", variableName, joined];
    }
    return joined;
  }
  return nil;
}

#pragma mark Public API

+ (NSString *)expandTemplate:(NSString *)uriTemplate values:(id)valueProvider {
  NSMutableString *result =
    [NSMutableString stringWithCapacity:[uriTemplate length]];

  NSScanner *scanner = [NSScanner scannerWithString:uriTemplate];
  [scanner setCharactersToBeSkipped:nil];

  // Defaults have to live through the full evaluation, so if any are encoured
  // they are reused throughout the expansion calls.
  NSMutableDictionary *defaultValues = nil;

  // Pull out the expressions for processing.
  while (![scanner isAtEnd]) {
    NSString *skipped = nil;
    // Find the next '{'.
    if ([scanner scanUpToString:@"{" intoString:&skipped]) {
      // Add anything before it to the result.
      [result appendString:skipped];
    }
    // Advance over the '{'.
    [scanner scanString:@"{" intoString:nil];
    // Collect the expression.
    NSString *expression = nil;
    if ([scanner scanUpToString:@"}" intoString:&expression]) {
      // Collect the trailing '}' on the expression.
      BOOL hasTrailingBrace = [scanner scanString:@"}" intoString:nil];

      // Parse the expression.
      NSMutableArray *variables = nil;
      unichar expressionOperator = 0;
      if ([self parseExpression:expression
             expressionOperator:&expressionOperator
                      variables:&variables
                  defaultValues:&defaultValues]) {
        // Do the expansion.
        NSString *substitution = [self expandVariables:variables
                                  expressionOperator:expressionOperator
                                              values:valueProvider
                                       defaultValues:defaultValues];
        if (substitution) {
          [result appendString:substitution];
        }
      } else {
        // Failed to parse, add the raw expression to the output.
        if (hasTrailingBrace) {
          [result appendFormat:@"{%@}", expression];
        } else {
          [result appendFormat:@"{%@", expression];
        }
      }
    } else if (![scanner isAtEnd]) {
      // Empty expression ('{}').  Copy over the opening brace and the trailing
      // one will be copied by the next cycle of the loop.
      [result appendString:@"{"];
    }
  }

  return result;
}

@end

#endif  // MAC_OS_X_VERSION_MIN_REQUIRED >= MAC_OS_X_VERSION_10_5

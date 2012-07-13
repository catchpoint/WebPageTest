//
//  GTMXcodeCorrectWhiteSpace.m
//
//  Copyright 2009 Google Inc.
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

#import <Cocoa/Cocoa.h>
#import "GTMObjC2Runtime.h"
#import "GTMXcodePlugin.h"
#import "GTMXcodePreferences.h"

@interface GTMXcodeCorrectWhiteSpace : NSObject
- (BOOL)gdt_writeToFile:(NSString *)fileName ofType:(NSString *)type;
@end

@implementation GTMXcodeCorrectWhiteSpace
// Register our class to perform the swizzle once the plugin has finished
// loading.
+ (void)load {
  NSAutoreleasePool *pool = [[NSAutoreleasePool alloc] init];
  [GTMXcodePlugin registerSwizzleClass:self];
  [pool release];
}

// Default initializer. Swizzles [PBXTextFileDocument writeToFile:ofType:]
// with our [gdt_writeToFile:ofType:].
- (id)init {
  if ((self = [super init])) {
    SEL ourSelector = @selector(gdt_writeToFile:ofType:);
    Method ourMethod = class_getInstanceMethod([self class], ourSelector);
    Class pbxClass = NSClassFromString(@"PBXTextFileDocument");
    if (class_addMethod(pbxClass,
                        ourSelector,
                        method_getImplementation(ourMethod),
                        method_getTypeEncoding(ourMethod))) {
      ourMethod = class_getInstanceMethod(pbxClass, ourSelector);
      Method theirMethod
        = class_getInstanceMethod(pbxClass, @selector(writeToFile:ofType:));
      method_exchangeImplementations(ourMethod, theirMethod);
    }
  }
  return self;
}

// Perform a "subtraction of ranges". A - B. Not transitive.
static NSRange SubtractRange(NSRange a, NSRange b) {
  NSRange newRange;
  NSUInteger maxRangeA = NSMaxRange(a);
  NSUInteger maxRangeB = NSMaxRange(b);
  if (b.location == NSNotFound) {
    // B is bogus
    newRange = a;
  } else if (maxRangeB <= a.location) {
    // B is completely before A
    newRange = NSMakeRange(a.location - b.length, a.length);
  } else if (maxRangeA <= b.location) {
    // B is completely after A
    newRange = a;
  } else if (b.location <= a.location && maxRangeB >= maxRangeA) {
    // B subsumes A
    newRange = NSMakeRange(b.location, 0);
  } else if (a.location <= b.location && maxRangeA >= maxRangeB) {
    // A subsumes B
    newRange = NSMakeRange(a.location, a.length - b.length);
  } else if (b.location <= a.location && maxRangeB <= maxRangeA) {
    // B overlaps front edge of A
    NSUInteger diff = maxRangeB - a.location;
    newRange = NSMakeRange(a.location + diff, a.length - diff);
  } else if (b.location <= maxRangeA && maxRangeB >= maxRangeA) {
    // B overlaps back edge of A
    NSUInteger diff = maxRangeA - b.location;
    newRange = NSMakeRange(a.location, a.length - diff);
  }
  return newRange;
}

+ (BOOL)gdt_writeToFile:(NSString *)fileName
                 ofType:(NSString *)type
                 object:(id)object {
  NSTextStorage *storage = [(id)object textStorage];
  id delegate = [storage delegate];

  // Need to keep track of all the current selections so that we can replace
  // them after stripping off the whitespace. A single source file can have
  // multiple views, so we store one selection per view.
  NSArray *windowControllers = [delegate windowControllers];
  size_t size = sizeof(NSRange) * [windowControllers count];
  NSRange *ranges = [[NSMutableData dataWithLength:size] mutableBytes];
  NSUInteger rangeCount = 0;
  for (id controller in windowControllers) {
    if ([controller respondsToSelector:@selector(textView)]) {
      NSTextView *textView = [controller textView];
      ranges[rangeCount] = [textView selectedRange];
      rangeCount++;
    }
  }

  NSMutableString *text = [[[storage string] mutableCopy] autorelease];
  NSRange oldRange = NSMakeRange(0, [text length]);

  // Figure out the newlines in our file.
  NSString *newlineString = @"\n";
  if ([text rangeOfString:@"\r\n"].length > 0) {
    newlineString = @"\r\n";
  } else if ([text rangeOfString:@"\r"].length > 0) {
    newlineString = @"\r";
  }
  NSUInteger newlineStringLength = [newlineString length];
  NSCharacterSet *whiteSpace
    = [NSCharacterSet characterSetWithCharactersInString:@" \t"];
  NSMutableCharacterSet *nonWhiteSpace = [[whiteSpace mutableCopy] autorelease];
  [nonWhiteSpace invert];

  // If the file is missing a newline at the end, add it now.
  if (![text hasSuffix:newlineString]) {
    [text appendString:newlineString];
  }

  NSRange textRange = NSMakeRange(0, [text length] - 1);
  while (textRange.length > 0) {
    NSRange lineRange = [text rangeOfString:newlineString
                                    options:NSBackwardsSearch
                                      range:textRange];
    if (lineRange.location == NSNotFound) {
      lineRange.location = 0;
    } else {
      lineRange.location += newlineStringLength;
    }
    lineRange.length = textRange.length - lineRange.location;
    textRange.length = lineRange.location;
    if (textRange.length != 0) {
      textRange.length -= newlineStringLength;
    }

    NSRange whiteRange = [text rangeOfCharacterFromSet:whiteSpace
                                               options:NSBackwardsSearch
                                                 range:lineRange];
    if (NSMaxRange(whiteRange) == NSMaxRange(lineRange)) {
      NSRange nonWhiteRange = [text rangeOfCharacterFromSet:nonWhiteSpace
                                                    options:NSBackwardsSearch
                                                      range:lineRange];
      NSRange deleteRange;
      if (nonWhiteRange.location == NSNotFound) {
        deleteRange.location = lineRange.location;
      } else {
        deleteRange.location = NSMaxRange(nonWhiteRange);
      }
      deleteRange.length = NSMaxRange(whiteRange) - deleteRange.location;
      [text deleteCharactersInRange:deleteRange];

      // Update all the selections appropriately.
      for (NSUInteger i = 0; i < rangeCount; ++i) {
        NSRange baseRange = ranges[i];
        NSRange newRange = SubtractRange(baseRange, deleteRange);
        ranges[i] = newRange;
      }
    }
  }

  // Replace the text with the new stripped version.
  [storage beginEditing];
  [storage replaceCharactersInRange:oldRange withString:text];
  [storage endEditing];

  // Fix up selections
  NSUInteger count = 0;
  for (id controller in windowControllers) {
    if ([controller respondsToSelector:@selector(textView)]) {
      NSRange newRange = ranges[count];
      if (newRange.location != NSNotFound) {
        NSTextView *textView = [controller textView];
        [textView setSelectedRange:ranges[count]];
      }
      count++;
    }
  }

  // Finish the save.
  return [object gdt_writeToFile:fileName ofType:type];
}

- (BOOL)gdt_writeToFile:(NSString *)fileName ofType:(NSString *)type {
  BOOL isGood;
  // Check our defaults to see if we want to strip whitespace.
  NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
  if ([defaults boolForKey:GTMXcodeCorrectWhiteSpaceOnSave]) {
    isGood = [GTMXcodeCorrectWhiteSpace gdt_writeToFile:fileName
                                                ofType:type
                                                object:self];
  } else {
    isGood = [self gdt_writeToFile:fileName ofType:type];
  }
  return isGood;
}

@end

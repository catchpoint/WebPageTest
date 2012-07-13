/******************************************************************************
 Copyright (c) 2012, Google Inc.
 All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 * Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice,
 this list of conditions and the following disclaimer in the documentation
 and/or other materials provided with the distribution.
 * Neither the name of Google Inc. nor the names of its contributors
 may be used to endorse or promote products derived from this software
 without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

 Created by Sam Kerner on 1/5/2012.

 ******************************************************************************/

#import "VideoFrameGrabber.h"

#import "GTMDefines.h"

@implementation VideoFrameRecord

@synthesize frame = frame_;
@synthesize timestamp = timestamp_;

-(id)initWithFrame:(UIImage*)frame timestamp:(NSTimeInterval)timestamp {
  if (nil == (self = [super init]))
    return nil;

  frame_ = [frame retain];
  timestamp_ = timestamp;

  return self;
}

- (void)dealloc {
  [frame_ release];
  [super dealloc];
}

@end

@interface VideoFrameGrabber(private)

// Called periodically by the timer to grab frames.
- (void)captureVideoFrame;

@end

@implementation VideoFrameGrabber

@synthesize videoFrames = videoFrames_;

- (id)initWithFrameDelay:(NSTimeInterval)frameDelay
      imageCaptureTarget:(NSObject *)imageCaptureTarget
                selector:(SEL)selector {
  if (nil == (self = [super init]))
    return nil;

  capturingFramesNow_ = NO;
  frameDelay_ = frameDelay;
  imageCaptureTarget_ = imageCaptureTarget;
  imageCaptureSelector_ = selector;

  _GTMDevAssert([imageCaptureTarget respondsToSelector:selector],
                @"Target object does not respond to selector.");

  return self;
}

- (void)dealloc {
  [videoStartTime_ release];
  [videoFrameTimer_ release];
  [videoFrames_ release];

  [super dealloc];
}

- (void)startFrameCapture {
  _GTMDevAssert([NSThread isMainThread],
                @"startFrameCapture must be called on the main thread.");

  _GTMDevAssert(!capturingFramesNow_, @"Video capture already running.");
  capturingFramesNow_ = YES;

  videoFrames_ = [[NSMutableArray alloc] init];
  videoStartTime_ = [[NSDate alloc] init];

  videoFrameTimer_ =
      [NSTimer scheduledTimerWithTimeInterval:frameDelay_
                                       target:self
                                     selector:@selector(captureVideoFrame)
                                     userInfo:nil
                                      repeats:YES];
  // The first frame should be taken at time 0, but the timer will wait
  // one interval before firing.  Capture the first video frame now.
  [videoFrameTimer_ fire];
}

- (void)stopFrameCapture {
  _GTMDevAssert(capturingFramesNow_, @"Video capture not running.");
  capturingFramesNow_ = NO;

  [videoFrameTimer_ invalidate];

  // Once started, timers are owned by the run loop they file on.
  // Once invalidated, the run loop releases them, so at this point
  // |videoFrameTimer_| points to a released object.
  videoFrameTimer_ = nil;
}

- (void)captureVideoFrame {
  UIImage *videoFrame =
      [imageCaptureTarget_ performSelector:imageCaptureSelector_];

  // TODO(skerner): Other webpagetest agents scale video frames to 1/2 width
  // and 1/2 height.  Add a scale factor.

  // TODO(skerner): The video frames are large bitmaps.  A device could run
  // out of memory if a page takes a while to load.  If this happens, there
  // are several things we could do:
  //  * drop frames when memory is low
  //  * write frames to /tmp
  //  * compress frames (encode them as JPEGs)
  // Need to test that any processing we do on frames does not slow down
  // the page load on real hardware.

  if (!videoFrame) {
    NSLog(@"Failed to get video frame.  Low memory is one possible cause.");
  } else {
    NSTimeInterval timestamp = -[videoStartTime_ timeIntervalSinceNow];
    VideoFrameRecord *frameRecord =
    [[[VideoFrameRecord alloc] initWithFrame:videoFrame
                                   timestamp:timestamp] autorelease];
    [videoFrames_ addObject:frameRecord];
  }
}

@end

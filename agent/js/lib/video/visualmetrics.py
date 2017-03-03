#!/usr/bin/env python
"""
Copyright (c) 2014, Google Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice,
      this list of conditions and the following disclaimer in the documentation
      and/or other materials provided with the distribution.
    * Neither the name of the company nor the names of its contributors may be
      used to endorse or promote products derived from this software without
      specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE."""
import gc
import glob
import gzip
import json
import logging
import math
import os
import platform
import re
import shutil
import subprocess
import tempfile

# Globals
options = None
client_viewport = None


# #######################################################################################################################
# Frame Extraction and de-duplication
# #######################################################################################################################

def video_to_frames(video, directory, force, orange_file, white_file, multiple, find_viewport, viewport_time,
                    full_resolution, timeline_file, trim_end):
  global options
  global client_viewport
  first_frame = os.path.join(directory, 'ms_000000')
  if (not os.path.isfile(first_frame + '.png') and not os.path.isfile(first_frame + '.jpg')) or force:
    if os.path.isfile(video):
      video = os.path.realpath(video)
      logging.info("Processing frames from video " + video + " to " + directory)
      if os.path.isdir(directory):
        shutil.rmtree(directory, True)
      if not os.path.isdir(directory):
        os.mkdir(directory, 0755)
      if os.path.isdir(directory):
        directory = os.path.realpath(directory)
        viewport = find_video_viewport(video, directory, find_viewport, viewport_time)
        gc.collect()
        if extract_frames(video, directory, full_resolution, viewport):
          client_viewport = None
          if find_viewport and options.notification:
            client_viewport = find_image_viewport(os.path.join(directory, 'video-000000.png'))
          if multiple and orange_file is not None:
            directories = split_videos(directory, orange_file)
          else:
            directories = [directory]
          for dir in directories:
            trim_video_end(dir, trim_end)
            if orange_file is not None:
              remove_frames_before_orange(dir, orange_file)
              remove_orange_frames(dir, orange_file)
            find_first_frame(dir, white_file)
            find_render_start(dir)
            find_last_frame(dir, white_file)
            adjust_frame_times(dir)
            if timeline_file is not None and not multiple:
              synchronize_to_timeline(dir, timeline_file)
            eliminate_duplicate_frames(dir)
            eliminate_similar_frames(dir)
            blank_first_frame(dir)
            # See if we are limiting the number of frames to keep (before processing them to save processing time)
            if options.maxframes > 0:
              cap_frame_count(dir, options.maxframes)
            crop_viewport(dir)
            gc.collect()
        else:
          logging.critical("Error extracting the video frames from " + video)
      else:
        logging.critical("Error creating output directory: " + directory)
    else:
      logging.critical("Input video file " + video + " does not exist")
  else:
    logging.info("Extracted video already exists in " + directory)


def extract_frames(video, directory, full_resolution, viewport):
  ok = False
  logging.info("Extracting frames from " + video + " to " + directory)
  decimate = get_decimate_filter()
  if decimate is not None:
    crop = ''
    if viewport is not None:
      crop = 'crop={0}:{1}:{2}:{3},'.format(viewport['width'], viewport['height'], viewport['x'], viewport['y'])
    scale = 'scale=iw*min(400/iw\,400/ih):ih*min(400/iw\,400/ih),'
    if full_resolution:
      scale = ''
    command = ['ffmpeg', '-v', 'debug', '-i', video, '-vsync', '0',
               '-vf', crop + scale + decimate + '=0:64:640:0.001',
               os.path.join(directory, 'img-%d.png')]
    logging.debug(' '.join(command))
    lines = []
    p = subprocess.Popen(command, stderr=subprocess.PIPE)
    while p.poll() is None:
      lines.extend(iter(p.stderr.readline, ""))

    match = re.compile('keep pts:[0-9]+ pts_time:(?P<timecode>[0-9\.]+)')
    frame_count = 0
    for line in lines:
      m = re.search(match, line)
      if m:
        frame_count += 1
        frame_time = int(math.ceil(float(m.groupdict().get('timecode')) * 1000))
        src = os.path.join(directory, 'img-{0:d}.png'.format(frame_count))
        dest = os.path.join(directory, 'video-{0:06d}.png'.format(frame_time))
        logging.debug('Renaming ' + src + ' to ' + dest)
        os.rename(src, dest)
        ok = True

  return ok


def split_videos(directory, orange_file):
  logging.debug("Splitting video on orange frames (this may take a while)...")
  directories = []
  current = 0
  found_orange = False
  video_dir = None
  frames = sorted(glob.glob(os.path.join(directory, 'video-*.png')))
  if len(frames):
    for frame in frames:
      if is_orange_frame(frame, orange_file):
        if not found_orange:
          found_orange = True
          # Make a copy of the orange frame for the end of the current video
          if video_dir is not None:
            dest = os.path.join(video_dir, os.path.basename(frame))
            shutil.copyfile(frame, dest)
          current += 1
          video_dir = os.path.join(directory, str(current))
          logging.debug("Orange frame found: " + frame + ", starting video directory: " + video_dir)
          if not os.path.isdir(video_dir):
            os.mkdir(video_dir, 0755)
          if os.path.isdir(video_dir):
            video_dir = os.path.realpath(video_dir)
            clean_directory(video_dir)
            directories.append(video_dir)
          else:
            video_dir = None
      else:
        found_orange = False
      if video_dir is not None:
        dest = os.path.join(video_dir, os.path.basename(frame))
        os.rename(frame, dest)
      else:
        logging.debug("Removing spurious frame " + frame + " at the beginning")
        os.remove(frame)
  return directories


def remove_frames_before_orange(directory, orange_file):
  frames = sorted(glob.glob(os.path.join(directory, 'video-*.png')))
  if len(frames):
    # go through the first 20 frames and remove any that come before the first orange frame.
    # iOS video capture starts with a blank white frame and then flips to orange before starting.
    logging.debug("Scanning for non-orange frames...")
    found_orange = False
    remove_frames = []
    frame_count = 0
    for frame in frames:
      frame_count += 1
      if is_orange_frame(frame, orange_file):
        found_orange = True
        break
      if frame_count > 20:
        break
      remove_frames.append(frame)

    if found_orange and len(remove_frames):
      for frame in remove_frames:
        logging.debug("Removing pre-orange frame {0}".format(frame ))
        os.remove(frame)

def remove_orange_frames(directory, orange_file):
  frames = sorted(glob.glob(os.path.join(directory, 'video-*.png')))
  if len(frames):
    # go through the first 20 frames and remove any orange ones. Unfortunately
    # sometimes the video blinks from orange to white and back to orange as Chrome flips in
    # an old render surface. Orange frames from the middle need to be dropped silently.
    logging.debug("Scanning for orange frames...")
    frame_count = 0
    for frame in frames:
      frame_count += 1
      if is_orange_frame(frame, orange_file):
        logging.debug("Removing Orange frame: " + frame)
        os.remove(frame)
      if frame_count > 20:
        break
    for frame in reversed(frames):
      if is_orange_frame(frame, orange_file):
        logging.debug("Removing orange frame " + frame + " from the end")
        os.remove(frame)
      else:
        break


def find_image_viewport(file):
  try:
    from PIL import Image
    im = Image.open(file)
    width, height = im.size
    x = int(math.floor(width / 2))
    y = int(math.floor(height / 2))
    pixels = im.load()
    background = pixels[x, y]

    # Find the left edge
    left = None
    while left is None and x >= 0:
      if not colors_are_similar(background, pixels[x, y]):
        left = x + 1
      else:
        x -= 1
    if left is None:
      left = 0
    logging.debug('Viewport left edge is {0:d}'.format(left))

    # Find the right edge
    x = int(math.floor(width / 2))
    right = None
    while right is None and x < width:
      if not colors_are_similar(background, pixels[x, y]):
        right = x - 1
      else:
        x += 1
    if right is None:
      right = width
    logging.debug('Viewport right edge is {0:d}'.format(right))

    # Find the top edge
    x = int(math.floor(width / 2))
    top = None
    while top is None and y >= 0:
      if not colors_are_similar(background, pixels[x, y]):
        top = y + 1
      else:
        y -= 1
    if top is None:
      top = 0
    logging.debug('Viewport top edge is {0:d}'.format(top))

    # Find the bottom edge
    y = int(math.floor(height / 2))
    bottom = None
    while bottom is None and y < height:
      if not colors_are_similar(background, pixels[x, y]):
        bottom = y - 1
      else:
        y += 1
    if bottom is None:
      bottom = height
    logging.debug('Viewport bottom edge is {0:d}'.format(bottom))

    viewport = {'x': left, 'y': top, 'width': (right - left), 'height': (bottom - top)}

  except Exception as e:
    viewport = None

  return viewport


def find_video_viewport(video, directory, find_viewport, viewport_time):
  global options
  viewport = None
  try:
    from PIL import Image

    frame = os.path.join(directory, 'viewport.png')
    if os.path.isfile(frame):
      os.remove(frame)
    command = ['ffmpeg', '-i', video]
    if (viewport_time):
      command.extend(['-ss', viewport_time])
    command.extend(['-frames:v', '1', frame])
    subprocess.check_output(command)
    if os.path.isfile(frame):
      with Image.open(frame) as im:
        width, height = im.size
        logging.debug('{0} is {1:d}x{2:d}'.format(frame, width, height))
      if options.notification:
        im = Image.open(frame)
        pixels = im.load()
        middle = int(math.floor(height / 2))
        # Find the top edge (at ~40% in to deal with browsers that color the notification area)
        x = int(width * 0.4)
        y = 0
        background = pixels[x, y]
        top = None
        while top is None and y < middle:
          if not colors_are_similar(background, pixels[x, y]):
            top = y
          else:
            y += 1
        if top is None:
          top = 0
        logging.debug('Window top edge is {0:d}'.format(top))

        # Find the bottom edge
        x = 0
        y = height - 1
        bottom = None
        while bottom is None and y > middle:
          if not colors_are_similar(background, pixels[x, y]):
            bottom = y
          else:
            y -= 1
        if bottom is None:
          bottom = height - 1
        logging.debug('Window bottom edge is {0:d}'.format(bottom))

        viewport = {'x': 0, 'y': top, 'width': width, 'height': (bottom - top)}

      elif find_viewport:
        viewport = find_image_viewport(frame)
      else:
        viewport = {'x': 0, 'y': 0, 'width': width, 'height': height}
      os.remove(frame)

  except Exception as e:
    viewport = None

  return viewport


def trim_video_end(directory, trim_time):
  if trim_time > 0:
    logging.debug("Trimming " + str(trim_time) + "ms from the end of the video in " + directory)
    frames = sorted(glob.glob(os.path.join(directory, 'video-*.png')))
    if len(frames):
      match = re.compile('video-(?P<ms>[0-9]+)\.png')
      m = re.search(match, frames[-1])
      if m is not None:
        frame_time = int(m.groupdict().get('ms'))
        end_time = frame_time - trim_time
        logging.debug("Trimming frames before " + str(end_time) + "ms")
        for frame in frames:
          m = re.search(match, frame)
          if m is not None:
            frame_time = int(m.groupdict().get('ms'))
            if frame_time > end_time:
              logging.debug("Trimming frame " + frame)
              os.remove(frame)


def adjust_frame_times(directory):
  offset = None
  frames = sorted(glob.glob(os.path.join(directory, 'video-*.png')))
  if len(frames):
    match = re.compile('video-(?P<ms>[0-9]+)\.png')
    for frame in frames:
      m = re.search(match, frame)
      if m is not None:
        frame_time = int(m.groupdict().get('ms'))
        if offset is None:
          offset = frame_time
        new_time = frame_time - offset
        dest = os.path.join(directory, 'ms_{0:06d}.png'.format(new_time))
        os.rename(frame, dest)


def find_first_frame(directory, white_file):
  global options
  try:
    if options.startwhite:
      files = sorted(glob.glob(os.path.join(directory, 'video-*.png')))
      count = len(files)
      if count > 1:
        from PIL import Image
        for i in xrange(count):
          if is_white_frame(files[i], white_file):
            break
          else:
            logging.debug('Removing non-white frame {0} from the beginning'.format(files[i]))
            os.remove(files[i])
    elif options.findstart > 0 and options.findstart <= 100:
      files = sorted(glob.glob(os.path.join(directory, 'video-*.png')))
      count = len(files)
      if count > 1:
        from PIL import Image
        blank = files[0]
        with Image.open(blank) as im:
          width, height = im.size
        match_height = int(math.ceil(height * options.findstart / 100.0))
        crop = '{0:d}x{1:d}+{2:d}+{3:d}'.format(width, match_height, 0, 0)
        found_first_change = False
        found_white_frame = False
        found_non_white_frame = False
        first_frame = None
        if white_file is None:
          found_white_frame = True
        for i in xrange(count):
          if not found_first_change:
            different = not frames_match(files[i], files[i + 1], 5, 100, crop, None)
            logging.debug('Removing early frame {0} from the beginning'.format(files[i]))
            os.remove(files[i])
            if different:
              first_frame = files[i + 1]
              found_first_change = True
          elif not found_white_frame:
            if files[i] != first_frame:
              if found_non_white_frame:
                found_white_frame = is_white_frame(files[i], white_file)
                if not found_white_frame:
                  logging.debug('Removing early non-white frame {0} from the beginning'.format(files[i]))
                  os.remove(files[i])
              else:
                found_non_white_frame = not is_white_frame(files[i], white_file)
                logging.debug('Removing early pre-non-white frame {0} from the beginning'.format(files[i]))
                os.remove(files[i])
          if found_first_change and found_white_frame:
            break
  except:
    logging.exception('Error finding first frame')


def find_last_frame(directory, white_file):
  global options
  try:
    if options.endwhite:
      files = sorted(glob.glob(os.path.join(directory, 'video-*.png')))
      count = len(files)
      if count > 2:
        found_end = False
        from PIL import Image
        for i in xrange(2, count):
          if found_end:
            logging.debug('Removing frame {0} from the end'.format(files[i]))
            os.remove(files[i])
          if is_white_frame(files[i], white_file):
            found_end = True
            logging.debug('Removing ending white frame {0}'.format(files[i]))
            os.remove(files[i])
  except:
    logging.exception('Error finding last frame')


def find_render_start(directory):
  global options
  global client_viewport
  try:
    if client_viewport is not None or options.viewport is not None or (options.renderignore > 0 and options.renderignore <= 100):
      files = sorted(glob.glob(os.path.join(directory, 'video-*.png')))
      count = len(files)
      if count > 1:
        from PIL import Image
        first = files[0]
        with Image.open(first) as im:
          width, height = im.size
        if options.renderignore > 0 and options.renderignore <= 100:
          mask = {}
          mask['width'] = int(math.floor(width * options.renderignore / 100))
          mask['height'] = int(math.floor(height * options.renderignore / 100))
          mask['x'] = int(math.floor(width / 2 - mask['width'] / 2))
          mask['y'] = int(math.floor(height / 2 - mask['height'] / 2))
        else:
          mask = None
        top = 10
        right_margin = 10
        bottom_margin = 10
        if height > 400 or width > 400:
          top = int(math.ceil(float(height) * 0.03))
          right_margin = int(math.ceil(float(width) * 0.04))
          bottom_margin = int(math.ceil(float(width) * 0.04))
        height = max(height - top - bottom_margin, 1)
        left = 0
        width = max(width - right_margin, 1)
        if client_viewport is not None:
          height = max(client_viewport['height'] - top - bottom_margin, 1)
          width = max(client_viewport['width'] - right_margin, 1)
          left += client_viewport['x']
          top += client_viewport['y']
        crop = '{0:d}x{1:d}+{2:d}+{3:d}'.format(width, height, left, top)
        for i in xrange(1, count):
          if frames_match(first, files[i], 10, 500, crop, mask):
            logging.debug('Removing pre-render frame {0}'.format(files[i]))
            os.remove(files[i])
          else:
            break
  except:
    logging.exception('Error getting render start')


def eliminate_duplicate_frames(directory):
  global options
  global client_viewport

  try:
    files = sorted(glob.glob(os.path.join(directory, 'ms_*.png')))
    if len(files) > 1:
      from PIL import Image
      blank = files[0]
      with Image.open(blank) as im:
        width, height = im.size
      if options.viewport and options.notification:
        if client_viewport['width'] == width and client_viewport['height'] == height:
          client_viewport = None

      # Figure out the region of the image that we care about
      top = 6
      right_margin = 6
      bottom_margin = 6
      if height > 400 or width > 400:
        top = int(math.ceil(float(height) * 0.03))
        right_margin = int(math.ceil(float(width) * 0.03))
        bottom_margin = int(math.ceil(float(width) * 0.03))
      height = max(height - top - bottom_margin, 1)
      left = 0
      width = max(width - right_margin, 1)

      if client_viewport is not None:
        height = max(client_viewport['height'] - top - bottom_margin, 1)
        width = max(client_viewport['width'] - right_margin, 1)
        left += client_viewport['x']
        top += client_viewport['y']

      crop = '{0:d}x{1:d}+{2:d}+{3:d}'.format(width, height, left, top)
      logging.debug('Viewport cropping set to ' + crop)

      # Do a pass looking for the first non-blank frame with an allowance
      # for up to a 10% per-pixel difference for noise in the white field.
      count = len(files)
      for i in xrange(1, count):
        if frames_match(blank, files[i], 10, 0, crop, None):
          logging.debug('Removing duplicate frame {0} from the beginning'.format(files[i]))
          os.remove(files[i])
        else:
          break

      # Do another pass looking for the last frame but with an allowance for up
      # to a 10% difference in individual pixels to deal with noise around text.
      files = sorted(glob.glob(os.path.join(directory, 'ms_*.png')))
      count = len(files)
      duplicates = []
      if count > 2:
        files.reverse()
        baseline = files[0]
        previous_frame = baseline
        for i in xrange(1, count):
          if frames_match(baseline, files[i], 10, 0, crop, None):
            if previous_frame is baseline:
              duplicates.append(previous_frame)
            else:
              logging.debug('Removing duplicate frame {0} from the end'.format(previous_frame))
              os.remove(previous_frame)
            previous_frame = files[i]
          else:
            break
      for duplicate in duplicates:
        logging.debug('Removing duplicate frame {0} from the end'.format(duplicate))
        os.remove(duplicate)

  except:
    logging.exception('Error processing frames for duplicates')


def eliminate_similar_frames(directory):
  global client_viewport
  global options
  try:
    # only do this when decimate couldn't be used to eliminate similar frames
    if options.notification:
      files = sorted(glob.glob(os.path.join(directory, 'ms_*.png')))
      count = len(files)
      if count > 3:
        crop = None
        if client_viewport is not None:
          crop = '{0:d}x{1:d}+{2:d}+{3:d}'.format(client_viewport['width'], client_viewport['height'],
                                                  client_viewport['x'], client_viewport['y'])
        baseline = files[1]
        for i in xrange(2, count - 1):
          if frames_match(baseline, files[i], 1, 0, crop, None):
            logging.debug('Removing similar frame {0}'.format(files[i]))
            os.remove(files[i])
          else:
            baseline = files[i]
  except:
    logging.exception('Error removing similar frames')


def blank_first_frame(directory):
  global options
  try:
    if options.forceblank:
      files = sorted(glob.glob(os.path.join(directory, 'ms_*.png')))
      count = len(files)
      if count > 1:
        from PIL import Image
        with Image.open(files[0]) as im:
          width, height = im.size
        command = 'convert -size {0}x{1} xc:white PNG24:"{2}"'.format(width, height, files[0])
        subprocess.call(command, shell=True)
  except:
    logging.exception('Error blanking first frame')


def crop_viewport(directory):
  global client_viewport
  if client_viewport is not None:
    try:
      files = sorted(glob.glob(os.path.join(directory, 'ms_*.png')))
      count = len(files)
      if count > 0:
        crop = '{0:d}x{1:d}+{2:d}+{3:d}'.format(client_viewport['width'], client_viewport['height'],
                                                client_viewport['x'], client_viewport['y'])
        for i in xrange(count):
          command = 'convert "{0}" -crop {1} "{0}"'.format(files[i], crop)
          subprocess.call(command, shell=True)

    except:
      logging.exception('Error cropping to viewport')


def get_decimate_filter():
  decimate = None
  try:
    filters = subprocess.check_output(['ffmpeg', '-filters'], stderr=subprocess.STDOUT)
    lines = filters.split("\n")
    match = re.compile('(?P<filter>[\w]*decimate).*V->V.*Remove near-duplicate frames')
    for line in lines:
      m = re.search(match, line)
      if m is not None:
        decimate = m.groupdict().get('filter')
        break
  except:
    logging.critical('Error checking ffmpeg filters for decimate')
    decimate = None
  return decimate


def clean_directory(directory):
  files = glob.glob(os.path.join(directory, '*.png'))
  for file in files:
    os.remove(file)
  files = glob.glob(os.path.join(directory, '*.jpg'))
  for file in files:
    os.remove(file)
  files = glob.glob(os.path.join(directory, '*.json'))
  for file in files:
    os.remove(file)


def is_orange_frame(file, orange_file):
  orange = False
  if os.path.isfile(orange_file):
    command = ('convert "{0}" "(" "{1}" -gravity Center -crop 50%x33%+0+0 -resize 200x200! ")" miff:- | '
               'compare -metric AE - -fuzz 10% null:').format(orange_file, file)
    compare = subprocess.Popen(command, stderr=subprocess.PIPE, shell=True)
    out, err = compare.communicate()
    if re.match('^[0-9]+$', err):
      different_pixels = int(err)
      if different_pixels < 100:
        orange = True

  return orange


def is_white_frame(file, white_file):
  global client_viewport
  global options
  white = False
  if os.path.isfile(white_file):
    if options.viewport:
      command = ('convert "{0}" "(" "{1}" -resize 200x200! ")" miff:- | '
                 'compare -metric AE - -fuzz 10% null:').format(white_file, file)
    else:
      command = ('convert "{0}" "(" "{1}" -gravity Center -crop 50%x33%+0+0 -resize 200x200! ")" miff:- | '
                 'compare -metric AE - -fuzz 10% null:').format(white_file, file)
    if client_viewport is not None:
      crop = '{0:d}x{1:d}+{2:d}+{3:d}'.format(client_viewport['width'], client_viewport['height'], client_viewport['x'], client_viewport['y'])
      command = ('convert "{0}" "(" "{1}" -crop {2} -resize 200x200! ")" miff:- | '
                 'compare -metric AE - -fuzz 10% null:').format(white_file, file, crop)
    compare = subprocess.Popen(command, stderr=subprocess.PIPE, shell=True)
    out, err = compare.communicate()
    if re.match('^[0-9]+$', err):
      different_pixels = int(err)
      if different_pixels < 500:
        white = True

  return white


def colors_are_similar(a, b, threshold = 15):
  similar = True
  sum = 0
  for x in xrange(3):
    delta = abs(a[x] - b[x])
    sum += delta
    if delta > threshold:
      similar = False
  if sum > threshold:
    similar = False

  return similar


def frames_match(image1, image2, fuzz_percent, max_differences, crop_region, mask_rect):
  match = False
  fuzz = ''
  if fuzz_percent > 0:
    fuzz = '-fuzz {0:d}% '.format(fuzz_percent)
  crop = ''
  if crop_region is not None:
    crop = '-crop {0} '.format(crop_region)
  if mask_rect is None:
    img1 = '"{0}"'.format(image1)
    img2 = '"{0}"'.format(image2)
  else:
    img1 = '( "{0}" -size {1}x{2} xc:white -geometry +{3}+{4} -compose over -composite )'.format(
      image1, mask_rect['width'], mask_rect['height'], mask_rect['x'], mask_rect['y'])
    img2 = '( "{0}" -size {1}x{2} xc:white -geometry +{3}+{4} -compose over -composite )'.format(
      image2, mask_rect['width'], mask_rect['height'], mask_rect['x'], mask_rect['y'])
  command = 'convert {0} {1} {2}miff:- | compare -metric AE - {3}null:'.format(img1, img2, crop, fuzz)
  if platform.system() != 'Windows':
    command = command.replace('(', '\\(').replace(')', '\\)')
  compare = subprocess.Popen(command, stderr=subprocess.PIPE, shell=True)
  out, err = compare.communicate()
  if re.match('^[0-9]+$', err):
    different_pixels = int(err)
    if different_pixels <= max_differences:
      match = True
  else:
    logging.debug('Unexpected compare result: out: "{0}", err: "{1}"'.format(out, err))

  return match


def generate_orange_png(orange_file):
  try:
    from PIL import Image, ImageDraw

    im = Image.new('RGB', (200, 200))
    draw = ImageDraw.Draw(im)
    draw.rectangle([0, 0, 200, 200], fill=(222, 100, 13))
    del draw
    im.save(orange_file, 'PNG')
  except:
    logging.exception('Error generating orange png ' + orange_file)


def generate_white_png(white_file):
  try:
    from PIL import Image, ImageDraw

    im = Image.new('RGB', (200, 200))
    draw = ImageDraw.Draw(im)
    draw.rectangle([0, 0, 200, 200], fill=(255, 255, 255))
    del draw
    im.save(white_file, 'PNG')
  except:
    logging.exception('Error generating white png ' + white_file)


def synchronize_to_timeline(directory, timeline_file):
  offset = get_timeline_offset(timeline_file)
  if offset > 0:
    frames = sorted(glob.glob(os.path.join(directory, 'ms_*.png')))
    match = re.compile('ms_(?P<ms>[0-9]+)\.png')
    for frame in frames:
      m = re.search(match, frame)
      if m is not None:
        frame_time = int(m.groupdict().get('ms'))
        new_time = max(frame_time - offset, 0)
        dest = os.path.join(directory, 'ms_{0:06d}.png'.format(new_time))
        if frame != dest:
          if os.path.isfile(dest):
            os.remove(dest)
          os.rename(frame, dest)


def get_timeline_offset(timeline_file):
  offset = 0
  try:
    file_name, ext = os.path.splitext(timeline_file)
    if ext.lower() == '.gz':
      f = gzip.open(timeline_file, 'rb')
    else:
      f = open(timeline_file, 'r')
    timeline = json.load(f)
    f.close()
    last_paint = None
    first_navigate = None

    # In the case of a trace instead of a timeline we want the list of events
    if 'traceEvents' in timeline:
      timeline = timeline['traceEvents']

    for timeline_event in timeline:
      paint_time = get_timeline_event_paint_time(timeline_event)
      if paint_time is not None:
        last_paint = paint_time
      first_navigate = get_timeline_event_navigate_time(timeline_event)
      if first_navigate is not None:
        break

    if last_paint is not None and first_navigate is not None and first_navigate > last_paint:
      offset = int(round(first_navigate - last_paint))
      logging.info(
        "Trimming {0:d}ms from the start of the video based on timeline synchronization".format(offset))
  except:
    logging.critical("Error processing timeline file " + timeline_file)

  return offset


def get_timeline_event_paint_time(timeline_event):
  paint_time = None
  if 'cat' in timeline_event:
    if (timeline_event['cat'].find('devtools.timeline') >= 0 and
            'ts' in timeline_event and
            'name' in timeline_event and (timeline_event['name'].find('Paint') >= 0 or
                                              timeline_event['name'].find('CompositeLayers') >= 0)):
      paint_time = float(timeline_event['ts']) / 1000.0
      if 'dur' in timeline_event:
        paint_time += float(timeline_event['dur']) / 1000.0
  elif 'method' in timeline_event:
    if (timeline_event['method'] == 'Timeline.eventRecorded' and
            'params' in timeline_event and 'record' in timeline_event['params']):
      paint_time = get_timeline_event_paint_time(timeline_event['params']['record'])
  else:
    if ('type' in timeline_event and
          (timeline_event['type'] == 'Rasterize' or
               timeline_event['type'] == 'CompositeLayers' or
               timeline_event['type'] == 'Paint')):
      if 'endTime' in timeline_event:
        paint_time = timeline_event['endTime']
      elif 'startTime' in timeline_event:
        paint_time = timeline_event['startTime']

    # Check for any child paint events
    if 'children' in timeline_event:
      for child in timeline_event['children']:
        child_paint_time = get_timeline_event_paint_time(child)
        if child_paint_time is not None and (paint_time is None or child_paint_time > paint_time):
          paint_time = child_paint_time

  return paint_time


def get_timeline_event_navigate_time(timeline_event):
  navigate_time = None
  if 'cat' in timeline_event:
    if (timeline_event['cat'].find('devtools.timeline') >= 0 and
            'ts' in timeline_event and
            'name' in timeline_event and timeline_event['name'] == 'ResourceSendRequest'):
      navigate_time = float(timeline_event['ts']) / 1000.0
  elif 'method' in timeline_event:
    if (timeline_event['method'] == 'Timeline.eventRecorded' and
            'params' in timeline_event and 'record' in timeline_event['params']):
      navigate_time = get_timeline_event_navigate_time(timeline_event['params']['record'])
  else:
    if ('type' in timeline_event and
            timeline_event['type'] == 'ResourceSendRequest' and
            'startTime' in timeline_event):
      navigate_time = timeline_event['startTime']

    # Check for any child paint events
    if 'children' in timeline_event:
      for child in timeline_event['children']:
        child_navigate_time = get_timeline_event_navigate_time(child)
        if child_navigate_time is not None and (navigate_time is None or child_navigate_time < navigate_time):
          navigate_time = child_navigate_time

  return navigate_time


########################################################################################################################
#   Histogram calculations
########################################################################################################################


def calculate_histograms(directory, histograms_file, force):
  if not os.path.isfile(histograms_file) or force:
    try:
      extension = None
      directory = os.path.realpath(directory)
      first_frame = os.path.join(directory, 'ms_000000')
      if os.path.isfile(first_frame + '.png'):
        extension = '.png'
      elif os.path.isfile(first_frame + '.jpg'):
        extension = '.jpg'
      if extension is not None:
        histograms = []
        frames = sorted(glob.glob(os.path.join(directory, 'ms_*' + extension)))
        match = re.compile('ms_(?P<ms>[0-9]+)\.')
        for frame in frames:
          m = re.search(match, frame)
          if m is not None:
            frame_time = int(m.groupdict().get('ms'))
            histogram = calculate_image_histogram(frame)
            gc.collect()
            if histogram is not None:
              histograms.append({'time': frame_time, 'histogram': histogram})
        if os.path.isfile(histograms_file):
          os.remove(histograms_file)
        f = gzip.open(histograms_file, 'wb')
        json.dump(histograms, f)
        f.close()
      else:
        logging.critical('No video frames found in ' + directory)
    except:
      logging.exception('Error calculating histograms')
  else:
    logging.debug('Histograms file {0} already exists'.format(histograms_file))


def calculate_image_histogram(file):
  logging.debug('Calculating histogram for ' + file)
  try:
    from PIL import Image

    im = Image.open(file)
    width, height = im.size
    pixels = im.load()
    histogram = {'r': [0 for i in xrange(256)],
                 'g': [0 for i in xrange(256)],
                 'b': [0 for i in xrange(256)]}
    for y in xrange(height):
      for x in xrange(width):
        try:
          pixel = pixels[x, y]
          # Don't include White pixels (with a tiny bit of slop for compression artifacts)
          if pixel[0] < 250 or pixel[1] < 250 or pixel[2] < 250:
            histogram['r'][pixel[0]] += 1
            histogram['g'][pixel[1]] += 1
            histogram['b'][pixel[2]] += 1
        except:
          pass
  except:
    histogram = None
    logging.exception('Error calculating histogram for ' + file)
  return histogram


########################################################################################################################
#   Screen Shots
########################################################################################################################


def save_screenshot(directory, dest, quality):
  directory = os.path.realpath(directory)
  files = sorted(glob.glob(os.path.join(directory, 'ms_*.png')))
  if files is not None and len(files) >= 1:
    src = files[-1]
    if dest[-4:] == '.jpg':
      command = 'convert "{0}" -set colorspace sRGB -quality {1:d} "{2}"'.format(src, quality, dest)
      subprocess.call(command, shell=True)
    else:
      shutil.copy(src, dest)


########################################################################################################################
#   JPEG conversion
########################################################################################################################


def convert_to_jpeg(directory, quality):
  directory = os.path.realpath(directory)
  files = sorted(glob.glob(os.path.join(directory, 'ms_*.png')))
  match = re.compile('(?P<base>ms_[0-9]+\.)')
  for file in files:
    m = re.search(match, file)
    if m is not None:
      dest = os.path.join(directory, m.groupdict().get('base') + 'jpg')
      if os.path.isfile(dest):
        os.remove(dest)
      command = 'convert "{0}" -set colorspace sRGB -quality {1:d} "{2}"'.format(file, quality, dest)
      subprocess.call(command, shell=True)
      if os.path.isfile(dest):
        os.remove(file)


########################################################################################################################
#   Reduce the number of saved video frames if necessary
########################################################################################################################
def cap_frame_count(directory, maxframes):
  directory = os.path.realpath(directory)
  frames = sorted(glob.glob(os.path.join(directory, 'ms_*.png')))
  frame_count = len(frames)
  if frame_count > maxframes:
    # First pass, sample all video frames at 10fps instead of 60fps, keeping the first 20% of the target
    logging.debug('Sampling 10fps: Reducing {0:d} frames to target of {1:d}...'.format(frame_count, maxframes))
    skip_frames = int(maxframes * 0.2)
    sample_frames(frames, 100, 0, skip_frames)

    frames = sorted(glob.glob(os.path.join(directory, 'ms_*.png')))
    frame_count = len(frames)
    if frame_count > maxframes:
      # Second pass, sample all video frames after the first 5 seconds at 2fps, keeping the first 40% of the target
      logging.debug('Sampling 2fps: Reducing {0:d} frames to target of {1:d}...'.format(frame_count, maxframes))
      skip_frames = int(maxframes * 0.4)
      sample_frames(frames, 500, 5000, skip_frames)

      frames = sorted(glob.glob(os.path.join(directory, 'ms_*.png')))
      frame_count = len(frames)
      if frame_count > maxframes:
        # Third pass, sample all video frames after the first 10 seconds at 1fps, keeping the first 60% of the target
        logging.debug('Sampling 1fps: Reducing {0:d} frames to target of {1:d}...'.format(frame_count, maxframes))
        skip_frames = int(maxframes * 0.6)
        sample_frames(frames, 1000, 10000, skip_frames)

  logging.debug('{0:d} frames final count with a target max of {1:d} frames...'.format(frame_count, maxframes))


def sample_frames(frames, interval, start_ms, skip_frames):
  frame_count = len(frames)
  if frame_count > 3:
    # Always keep the first and last frames, only sample in the middle
    first_frame = frames[0]
    first_change = frames[1]
    last_frame = frames[-1]
    match = re.compile('ms_(?P<ms>[0-9]+)\.')
    m = re.search(match, first_change)
    first_change_time = 0
    if m is not None:
      first_change_time = int(m.groupdict().get('ms'))
    last_bucket = None
    logging.debug('Sapling frames in {0:d}ms intervals after {1:d} ms, skipping {2:d} frames...'.format(interval,
                                                                                                        first_change_time + start_ms,
                                                                                                        skip_frames))
    frame_count = 0
    for frame in frames:
      m = re.search(match, frame)
      if m is not None:
        frame_count += 1
        frame_time = int(m.groupdict().get('ms'))
        frame_bucket = int(math.floor(frame_time / interval))
        if (frame_time > first_change_time + start_ms and
                frame_bucket == last_bucket and
                frame != first_frame and
                frame != first_change and
                frame != last_frame and
                frame_count > skip_frames):
          logging.debug('Removing sampled frame ' + frame)
          os.remove(frame)
        last_bucket = frame_bucket


########################################################################################################################
#   Visual Metrics
########################################################################################################################


def calculate_visual_metrics(histograms_file, start, end, perceptual, dirs):
  metrics = None
  histograms = load_histograms(histograms_file, start, end)
  if histograms is not None and len(histograms) > 0:
    progress = calculate_visual_progress(histograms)
    if len(histograms) > 1:
      metrics = [
        {'name': 'First Visual Change', 'value': histograms[1]['time']},
        {'name': 'Last Visual Change', 'value': histograms[-1]['time']},
        {'name': 'Speed Index', 'value': calculate_speed_index(progress)}
      ]
      if perceptual:
        metrics.append({'name': 'Perceptual Speed Index',
                        'value': calculate_perceptual_speed_index(progress, dirs)})
    else:
      metrics = [
        {'name': 'First Visual Change', 'value': histograms[0]['time']},
        {'name': 'Last Visual Change', 'value': histograms[0]['time']},
        {'name': 'Visually Complete', 'value': histograms[0]['time']},
        {'name': 'Speed Index', 'value': 0}
      ]
      if perceptual:
        metrics.append({'name': 'Perceptual Speed Index', 'value': 0})
    prog = ''
    for p in progress:
      if len(prog):
        prog += ", "
      prog += '{0:d}={1:d}%'.format(p['time'], int(p['progress']))
    metrics.append({'name': 'Visual Progress', 'value': prog})

  return metrics


def load_histograms(histograms_file, start, end):
  histograms = None
  if os.path.isfile(histograms_file):
    f = gzip.open(histograms_file)
    original = json.load(f)
    f.close()
    if start != 0 or end != 0:
      histograms = []
      for histogram in original:
        if histogram['time'] <= start:
          histogram['time'] = start
          histograms = [histogram]
        elif histogram['time'] <= end:
          histograms.append(histogram)
        else:
          break
    else:
      histograms = original
  return histograms


def calculate_visual_progress(histograms):
  progress = []
  first = histograms[0]['histogram']
  last = histograms[-1]['histogram']
  for index, histogram in enumerate(histograms):
    p = calculate_frame_progress(histogram['histogram'], first, last)
    progress.append({'time': histogram['time'],
                     'progress': p})
    logging.debug('{0:d}ms - {1:d}% Complete'.format(histogram['time'], int(p)))
  return progress


def calculate_frame_progress(histogram, start, final):
  total = 0
  matched = 0
  slop = 5  # allow for matching slight color variations
  channels = ['r', 'g', 'b']
  for channel in channels:
    channel_total = 0
    channel_matched = 0
    buckets = 256
    available = [0 for i in xrange(buckets)]
    for i in xrange(buckets):
      available[i] = abs(histogram[channel][i] - start[channel][i])
    for i in xrange(buckets):
      target = abs(final[channel][i] - start[channel][i])
      if (target):
        channel_total += target
        low = max(0, i - slop)
        high = min(buckets, i + slop)
        for j in xrange(low, high):
          this_match = min(target, available[j])
          available[j] -= this_match
          channel_matched += this_match
          target -= this_match
    total += channel_total
    matched += channel_matched
  progress = (float(matched) / float(total)) if total else 1
  return math.floor(progress * 100)


def find_visually_complete(progress):
  time = 0
  for p in progress:
    if int(p['progress']) == 100:
      time = p['time']
      break
    elif time == 0:
      time = p['time']
  return time


def calculate_speed_index(progress):
  si = 0
  last_ms = progress[0]['time']
  last_progress = progress[0]['progress']
  for p in progress:
    elapsed = p['time'] - last_ms
    si += elapsed * (1.0 - last_progress)
    last_ms = p['time']
    last_progress = p['progress'] / 100.0
  return int(si)


def calculate_perceptual_speed_index(progress, directory):
  from ssim import compute_ssim
  x = len(progress)
  dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), directory)
  first_paint_frame = os.path.join(dir, "ms_{0:06d}.png".format(progress[1]["time"]))
  target_frame = os.path.join(dir, "ms_{0:06d}.png".format(progress[x - 1]["time"]))
  ssim_1 = compute_ssim(first_paint_frame, target_frame)
  per_si = float(progress[1]['time'])
  last_ms = progress[1]['time']
  # Full Path of the Target Frame
  logging.debug("Target image for perSI is %s" % target_frame)
  ssim = ssim_1
  for p in progress[1:]:
    elapsed = p['time'] - last_ms
    # print '*******elapsed %f'%elapsed
    # Full Path of the Current Frame
    current_frame = os.path.join(dir, "ms_{0:06d}.png".format(p["time"]))
    logging.debug("Current Image is %s" % current_frame)
    # Takes full path of PNG frames to compute SSIM value
    per_si += elapsed * (1.0 - ssim)
    ssim = compute_ssim(current_frame, target_frame)
    gc.collect()
    last_ms = p['time']
  return int(per_si)


########################################################################################################################
#   Check any dependencies
########################################################################################################################


def check_config():
  ok = True

  print 'ffmpeg:  ',
  if get_decimate_filter() is not None:
    print 'OK'
  else:
    print 'FAIL'
    ok = False

  print 'convert: ',
  if check_process('convert -version', 'ImageMagick'):
    print 'OK'
  else:
    print 'FAIL'
    ok = False

  print 'compare: ',
  if check_process('compare -version', 'ImageMagick'):
    print 'OK'
  else:
    print 'FAIL'
    ok = False

  print 'Pillow:  ',
  try:
    from PIL import Image, ImageDraw

    print 'OK'
  except:
    print 'FAIL'
    ok = False

  print 'SSIM:    ',
  try:
    from ssim import compute_ssim

    print 'OK'
  except:
    print 'FAIL'
    ok = False

  return ok


def check_process(command, output):
  ok = False
  try:
    out = subprocess.check_output(command, stderr=subprocess.STDOUT, shell=True)
    if out.find(output) > -1:
      ok = True
  except:
    ok = False
  return ok


########################################################################################################################
#   Main Entry Point
########################################################################################################################


def main():
  import argparse
  global options

  parser = argparse.ArgumentParser(description='Calculate visual performance metrics from a video.',
                                   prog='visualmetrics')
  parser.add_argument('--version', action='version', version='%(prog)s 0.1')
  parser.add_argument('-c', '--check', action='store_true', default=False,
                      help="Check dependencies (ffmpeg, imagemagick, PIL, SSIM).")
  parser.add_argument('-v', '--verbose', action='count', help="Increase verbosity (specify multiple times for more).")
  parser.add_argument('-i', '--video', help="Input video file.")
  parser.add_argument('-d', '--dir', help="Directory of video frames "
                                          "(as input if exists or as output if a video file is specified).")
  parser.add_argument('--screenshot', help="Save the last frame of video as an image to the path provided.")
  parser.add_argument('-g', '--histogram', help="Histogram file (as input if exists or as output if "
                                                "histograms need to be calculated).")
  parser.add_argument('-m', '--timeline', help="Timeline capture from Chrome dev tools. Used to synchronize the video"
                                               " start time and only applies when orange frames are removed "
                                               "(see --orange). The timeline file can be gzipped if it ends in .gz")
  parser.add_argument('-q', '--quality', type=int, help="JPEG Quality "
                                                        "(if specified, frames will be converted to JPEG).")
  parser.add_argument('-l', '--full', action='store_true', default=False,
                      help="Keep full-resolution images instead of resizing to 400x400 pixels")
  parser.add_argument('-f', '--force', action='store_true', default=False,
                      help="Force processing of a video file (overwrite existing directory).")
  parser.add_argument('-o', '--orange', action='store_true', default=False,
                      help="Remove orange-colored frames from the beginning of the video.")
  parser.add_argument('-w', '--white', action='store_true', default=False,
                      help="Wait for a full white frame after a non-white frame at the beginning of the video.")
  parser.add_argument('--multiple', action='store_true', default=False,
                      help="Multiple videos are combined, separated by orange frames."
                           "In this mode only the extraction is done and analysis needs to be run separetely on "
                           "each directory. Numbered directories will be created for each video under the output "
                           "directory.")
  parser.add_argument('-n', '--notification', action='store_true', default=False,
                      help="Trim the notification and home bars from the window.")
  parser.add_argument('-p', '--viewport', action='store_true', default=False,
                      help="Locate and use the viewport from the first video frame.")
  parser.add_argument('-t', '--viewporttime',
                      help="Time of the video frame to use for identifying the viewport (in HH:MM:SS.xx format).")
  parser.add_argument('-s', '--start', type=int, default=0, help="Start time (in milliseconds) for calculating "
                                                                 "visual metrics.")
  parser.add_argument('-e', '--end', type=int, default=0, help="End time (in milliseconds) for calculating "
                                                               "visual metrics.")
  parser.add_argument('--findstart', type=int, default=0, help="Find the start of activity by looking at the top X% "
                                                               "of the video (like a browser address bar).")
  parser.add_argument('--renderignore', type=int, default=0, help="Ignore the center X% of the frame when looking for "
                                                                  "the first rendered frame (useful for Opera mini).")
  parser.add_argument('--startwhite', action='store_true', default=False,
                      help="Find the first fully white frame as the start of the video.")
  parser.add_argument('--endwhite', action='store_true', default=False,
                      help="Find the first fully white frame after render start as the end of the video.")
  parser.add_argument('--forceblank', action='store_true', default=False,
                      help="Force the first frame to be blank white.")
  parser.add_argument('--trimend', type=int, default=0, help="Time to trim from the end of the video "
                                                             "(in milliseconds).")
  parser.add_argument('--maxframes', type=int, default=0, help="Maximum number of video frames before reducing by "
                                                               "sampling (to 10fps, 1fps, etc).")
  parser.add_argument('-k', '--perceptual', action='store_true', default=False,
                      help="Calculate perceptual Speed Index")
  parser.add_argument('-j', '--json', action='store_true', default=False,
                      help="Set output format to JSON")

  options = parser.parse_args()

  if not options.check and not options.dir and not options.video and not options.histogram:
    parser.error("A video, Directory of images or histograms file needs to be provided.\n\n"
                 "Use -h to see available options")

  if options.perceptual:
    if not options.video:
      parser.error("A video file needs to be provided.\n\n" "Use -h to see available options")

  temp_dir = tempfile.mkdtemp(prefix='vis-')
  directory = temp_dir
  if options.dir is not None:
    directory = options.dir
  if options.histogram is not None:
    histogram_file = options.histogram
  else:
    histogram_file = os.path.join(temp_dir, 'histograms.json.gz')

  # Set up logging
  log_level = logging.CRITICAL
  if options.verbose == 1:
    log_level = logging.ERROR
  elif options.verbose == 2:
    log_level = logging.WARNING
  elif options.verbose == 3:
    log_level = logging.INFO
  elif options.verbose >= 4:
    log_level = logging.DEBUG
  logging.basicConfig(level=log_level, format="%(asctime)s.%(msecs)03d - %(message)s", datefmt="%H:%M:%S")

  if options.multiple:
    options.orange = True

  ok = False
  try:
    if not options.check:
      viewport = None
      if options.video:
        orange_file = None
        if options.orange:
          orange_file = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'orange.png')
          if not os.path.isfile(orange_file):
            orange_file = os.path.join(temp_dir, 'orange.png')
            generate_orange_png(orange_file)
        white_file = None
        if options.white or options.startwhite or options.endwhite:
          white_file = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'white.png')
          if not os.path.isfile(white_file):
            white_file = os.path.join(temp_dir, 'white.png')
            generate_white_png(white_file)
        video_to_frames(options.video, directory, options.force, orange_file, white_file, options.multiple,
                        options.viewport, options.viewporttime, options.full, options.timeline, options.trimend)
      if not options.multiple:
        # Calculate the histograms and visual metrics
        calculate_histograms(directory, histogram_file, options.force)
        metrics = calculate_visual_metrics(histogram_file, options.start, options.end, options.perceptual,
                                           directory)
        if options.screenshot is not None:
          quality = 30
          if options.quality is not None:
            quality = options.quality
          save_screenshot(directory, options.screenshot, quality)
        # JPEG conversion
        if options.dir is not None and options.quality is not None:
          convert_to_jpeg(directory, options.quality)

        if metrics is not None:
          ok = True
          if options.json:
            data = dict()
            for metric in metrics:
              data[metric['name'].replace(' ', '')] = metric['value']
            print json.dumps(data)
          else:
            for metric in metrics:
              print "{0}: {1}".format(metric['name'], metric['value'])
    else:
      ok = check_config()
  except Exception as e:
    logging.exception(e)
    ok = False

  # Clean up
  shutil.rmtree(temp_dir)
  if ok:
    exit(0)
  else:
    exit(1)


if '__main__' == __name__:
  main()

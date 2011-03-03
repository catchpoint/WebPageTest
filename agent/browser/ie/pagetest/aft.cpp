#include <stdafx.h>
#include "aft.h"

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CAFT::CAFT(DWORD earlyCutoff, DWORD pixelChangesThreshold):
  lastImg(NULL)
  , width(0)
  , height(0)
  , pixelChangeTime(NULL)
  , firstPixelChangeTime(NULL)
  , pixelChangeCount(NULL)
  , early_cutoff(earlyCutoff)
  , pixel_changes_threshold(pixelChangesThreshold)
{
  crop.top = 0;
  crop.left = 0;
  crop.bottom = 0;
  crop.right = 0;
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
CAFT::~CAFT(void)
{
  if( pixelChangeTime )
    free( pixelChangeTime );
  if( firstPixelChangeTime )
    free( firstPixelChangeTime );
  if( pixelChangeCount )
    free( pixelChangeCount );
}

/*-----------------------------------------------------------------------------
-----------------------------------------------------------------------------*/
void CAFT::SetCrop( DWORD top, DWORD right, DWORD bottom, DWORD left )
{
  crop.top = top;
  crop.right = right;
  crop.bottom = bottom;
  crop.left = left;
}

/*-----------------------------------------------------------------------------
  Keep track of the changes as images are added
-----------------------------------------------------------------------------*/
void CAFT::AddImage( CxImage * img, DWORD ms )
{
  if( img && img->IsValid() && img->GetWidth() && img->GetHeight() )
  {
    if( lastImg )
    {
      // go through each pixel and check for deltas from the previous image
      if( img->GetWidth() == width && img->GetHeight() == height )
      {
        DWORD changeCount = 0;

        // this could be optimized instead of fetching each pixel individually
        DWORD i = 0;
        for( DWORD y = crop.bottom; y < height - crop.top; y++ )
          for( DWORD x = crop.left; x < width - crop.right; x++ )
          {
            RGBQUAD last = lastImg->GetPixelColor(x, y, false);
            RGBQUAD current = img->GetPixelColor(x, y, false);

            if( last.rgbBlue != current.rgbBlue || last.rgbGreen != current.rgbGreen || last.rgbRed != current.rgbRed )
            {
              pixelChangeCount[i]++;
              pixelChangeTime[i] = ms;
              if( !firstPixelChangeTime[i] )
                firstPixelChangeTime[i] = ms;

              changeCount++;
            }

            i++;
          }

        ATLTRACE(_T("[Pagetest] - Adding video frame at %d ms, %d changes detected\n"), ms, changeCount);
      }
    }
    else
    {
      // first-time setup
      width = img->GetWidth();
      height = img->GetHeight();

      pixelChangeTime = (DWORD *)malloc((width - crop.left - crop.right) * (height - crop.top - crop.bottom) * sizeof(DWORD));
      firstPixelChangeTime  = (DWORD *)malloc((width - crop.left - crop.right) * (height - crop.top - crop.bottom) * sizeof(DWORD));
      pixelChangeCount = (DWORD *)malloc((width - crop.left - crop.right) * (height - crop.top - crop.bottom) * sizeof(DWORD));

      memset(pixelChangeTime, 0, (width - crop.left - crop.right) * (height - crop.top - crop.bottom) * sizeof(DWORD));
      memset(firstPixelChangeTime, 0, (width - crop.left - crop.right) * (height - crop.top - crop.bottom) * sizeof(DWORD));
      memset(pixelChangeCount, 0, (width - crop.left - crop.right) * (height - crop.top - crop.bottom) * sizeof(DWORD));
    }

    lastImg = img;
  }
}

/*-----------------------------------------------------------------------------
  After all of the images have been added this will go through
  and look for the latest change for any pixel that isn't considered
  dynamic
-----------------------------------------------------------------------------*/
bool CAFT::Calculate( DWORD &ms, bool &confident, CxImage * imgAft )
{
  bool ret = false;
  ms = 0;

  if( lastImg )
  {
    DWORD latest_of_first = 0;
    DWORD latest_of_early = 0;
    DWORD latest_of_static = 0;
    confident = true;
    bool determined = true;

    ATLTRACE(_T("[Pagetest] - Calculating AFT\n"));

    // create the image of the AFT algorithm
    if( imgAft )
    {
      imgAft->Create(width, height, 24);
      imgAft->Clear();
    }

    // go through the timings for each pixel
    DWORD i = 0;
    int rowPixels = (int)width - (int)(crop.left + crop.right);
    for( int y = (int)crop.bottom; y < (int)(height - crop.top); y++ )
    {
      for( int x = (int)crop.left; x < (int)(width - crop.right); x++ )
      {
        DWORD changeCount = pixelChangeCount[i];
        DWORD lastChange = pixelChangeTime[i];
        DWORD firstChange = firstPixelChangeTime[i];
        bool latest_is_early = lastChange < early_cutoff;
        bool few_changes = changeCount < pixel_changes_threshold;

        // keep track of the first change time for each pixel
        if( firstChange > latest_of_first )
          latest_of_first = firstChange;

        if( changeCount )
        {
          // late-stabelizing static pixels cause undetermined results
          if( !latest_is_early && few_changes )
          {
            determined = false;
            if(imgAft)
              imgAft->SetPixelColor(x,y, RGB(255,0,0));
          }

          // did it stabilize early (even if it was dynamic)?
          if( latest_is_early )
          {
            if( lastChange > latest_of_early )
            {
              latest_of_early = lastChange;
              ATLTRACE(_T("[Pagetest] - Latest early updated to %d ms\n"), latest_of_early);
            }
            if(imgAft)
              imgAft->SetPixelColor(x,y, RGB(255,255,255));
          }

          // is it a static pixel?
          if( few_changes )
          {
            // make sure the immediately surrounding pixels are also static
            if( lastChange > latest_of_static )
            {
              bool boundary_has_few_changes = true;
              int x1 = max( x - 1, (int)crop.left);
              int x2 = min( x + 1, (int)(width - crop.right));
              int y1 = max( y - 1, (int)crop.bottom );
              int y2 = min( y + 1, (int)(height - crop.top));
              for( int yy = y1; yy <= y2; yy++ )
              {
                for( int xx = x1; xx <= x2; xx++ )
                {
                  int pixelOffest = (rowPixels * (yy - (int)crop.bottom)) + (xx - (int)crop.left);
                  if( pixelOffest > 0 && 
                      pixelOffest < (int)((width - crop.left - crop.right) * (height - crop.top - crop.bottom)) &&
                      pixelChangeCount[pixelOffest] >= pixel_changes_threshold )
                    boundary_has_few_changes = false;
                }
              }
              if( boundary_has_few_changes )
              {
                latest_of_static = lastChange;
                ATLTRACE(_T("[Pagetest] - Latest static updated to %d ms\n"), latest_of_static);
              }
            }
          }
          else if( !latest_is_early && imgAft )
            imgAft->SetPixelColor(x,y, RGB(0,0,255));
        }
        else if(imgAft)
          imgAft->SetPixelColor(x,y, RGB(0,0,0));

        i++;
      }
    }

    // ignore latest_of_first for now to stay true to the original algorithm
    if( latest_of_static == latest_of_early )
    {
      ret = true;
      ms = latest_of_early;
      confident = true;
      ATLTRACE(_T("[Pagetest] - AFT Calculated: %d ms (high confidence)\n"), ms);
    }
    else if( determined )
    {
      ret = true;
      ms = latest_of_static;
      confident = false;
      ATLTRACE(_T("[Pagetest] - AFT Calculated: %d ms (stabilized - lower confidence)\n"), ms);
    }
    else
    {
      ret = false;
      ATLTRACE(_T("[Pagetest] - AFT Undetermined\n"));
    }

    // color the AFT pixels that defined the end time
    if( ms && imgAft )
    {
      DWORD i = 0;
      for( DWORD y = crop.bottom; y < height - crop.top; y++ )
      {
        for( DWORD x = crop.left; x < width - crop.right; x++ )
        {
          if( pixelChangeTime[i] == ms )
            imgAft->SetPixelColor(x,y, RGB(0,255,0));

          i++;
        }
      }
    }
  }

  return ret;
}

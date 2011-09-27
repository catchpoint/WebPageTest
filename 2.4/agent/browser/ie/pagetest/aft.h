class CAFT
{
public:
  CAFT(DWORD minChanges = 0, DWORD earlyCutoff = 25, DWORD pixelChangesThreshold = 5);
  ~CAFT(void);

  void SetCrop( DWORD top, DWORD right, DWORD bottom, DWORD left );
  void AddImage( CxImage * img, DWORD ms );
  bool Calculate( DWORD &ms, bool &confident, CxImage * imgAft = NULL );

  DWORD pixel_changes_threshold;
  DWORD early_cutoff;
  DWORD min_changes;

private:
  CxImage * lastImg;            // stores the previos image in the sequence as images are submitted
  DWORD width;                  // expected width of video images (all must be the same size)
  DWORD height;                 // expected height of video images (all must be the same size)
  DWORD * pixelChangeTime;      // For each pixel, the latest time the pixel changed (in ms)
  DWORD * firstPixelChangeTime; // For each pixel, the first time it changed
  DWORD * pixelChangeCount;     // For each pixel, the number of times it changed
  RECT  crop;                   // number of pixels to crop from each side
};

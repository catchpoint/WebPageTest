# Specify the directories that have the videos for each pane (relative to the folder this script is in)
# Each needs to be in it's own directory and the directory name
# will be used for the label

# load the video clip, and do any necessary preparation
function PrepareClip()
{
	SetWorkingDir(".\0")
	video = Import("video.avs")
	SetWorkingDir("..")

	end = video.FrameCount()
	video = video.ApplyRange(end - 1, end, "GreyScale")
	
	return video
}

function TimeFrame(clip video, int currentFrame)
{
	timeString = String(Float(currentFrame) / 10.0, "%0.1f")
	video.Subtitle(timeString, align = 2, size = 72, text_color=$FFFFFF)
}

function DisplayTime(clip video)
{
	video = video.AddBorders(10,10,10,80,$000000)
	end = video.FrameCount()
	return Animate(0, end, "TimeFrame", video, 0, video, end)
}

# make the video dimensions and even multiple of 16
function PadVideo(clip video)
{
    wPad = 16 - video.Width() % 16
    hPad = 16 - video.Height() % 16
    wPad = wPad == 16 ? 0 : wPad
    hPad = hPad == 16 ? 0 : hPad
    lPad = wPad / 2
    rPad = (wPad / 2) + (wPad % 2)
    tPad = hPad / 2
    bPad = (hPad / 2) + (hPad % 2)
    video = video.AddBorders(lPad,tPad,rPad,bPad,$000000)
    
    return video
}

video = PrepareClip()
video = DisplayTime(video)
video = PadVideo(video)

last = video.FrameCount()
video.DuplicateFrame(last, last, last, last, last, last, last, last, last, last)

ConvertToYV12(matrix="PC.601")

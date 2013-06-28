# load the video clip, and do any necessary preparation
function PrepareClip(string dir, string label)
{
	clipWidth = 300

	SetWorkingDir(".\" + dir)
	video = Import("video.avs")
	SetWorkingDir("..")
	
	#resize the video (aspect-correct) to fit within the defined box size
	clipHeight = Int(Float(clipWidth) / 1.644)
	width = video.Width()
	height = video.Height()
	scaleW = Float(width) / Float(clipWidth)
	scaleH = Float(height) / Float(clipHeight)
	scale = scaleW > scaleH ? scaleW : scaleH
	width = Int(Float(width) / Float(scale))
	height = Int(Float(height) / Float(scale))
	video = video.LanczosResize( width, height )
	
	# pad the video up to the full box size
    wPad = clipWidth - width
    hPad = clipHeight - height
    lPad = wPad / 2
    rPad = (wPad / 2) + (wPad % 2)
    tPad = hPad / 2
    bPad = (hPad / 2) + (hPad % 2)
    video = video.AddBorders(lPad,tPad,rPad,bPad,$000000)
	
	# gey out the clip after it is complete
	end = video.FrameCount()
	video = video.ApplyRange(end - 1, end, "GreyScale")
	
	video = video.AddBorders(2,30,2,15,$000000)
	
	video = video.Subtitle(label, align=8, size=24, text_color=$FFFFFF) 
	return video
}

function TimeFrame(clip video, int currentFrame)
{
	timeString = String(Float(currentFrame) / 10.0, "%0.1f")
	video.Subtitle(timeString, align = 2, size = 72, text_color=$FFFFFF)
}

function DisplayTime(clip video)
{
	video = video.AddBorders(0,0,0,70,$000000)

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

v1 = PrepareClip("0", "%0%")
v1 = DisplayTime(v1)
v2 = PrepareClip("1", "%1%")
v2 = DisplayTime(v2)
v3 = PrepareClip("2", "%2%")
v3 = DisplayTime(v3)

video = StackHorizontal(v1, v2, v3)
video = PadVideo(video)

last = video.FrameCount()
video.DuplicateFrame(last, last, last, last, last, last, last, last, last, last)

ConvertToYV12(matrix="PC.601")

<!DOCTYPE html>
<html>
<head>
</head>
<body>
<h1>JPEG Information</h1>  
<h1>Submit by URL</h1>
<form name="form" action="jpeginfo.php" method="GET">
Enter URL for jpeg image to be inspected: <input type="text" size="50" name="url"/> <button type="submit">Analyze</button>
</form>
<h1>Upload File</h1>
<form name="form" action="jpeginfo.php" method="POST" enctype="multipart/form-data" >
Upload Image File: <input type="file" name="imgfile" size="40">  <button type="submit">Analyze</button>
</form>
</body>
</html>

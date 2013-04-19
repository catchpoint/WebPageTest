using System;
using System.Web;
using System.Drawing;
using System.Drawing.Imaging;

public partial class _export : System.Web.UI.Page 
{
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Request.Form["width"] != null && Request.Form["width"] != String.Empty)
        {
            // image dimensions
            int width = Int32.Parse((Request.Form["width"].IndexOf('.') != -1) ? Request.Form["width"].Substring(0, Request.Form["width"].IndexOf('.')) : Request.Form["width"]);
            int height = Int32.Parse((Request.Form["height"].IndexOf('.') != -1) ? Request.Form["height"].Substring(0, Request.Form["height"].IndexOf('.')) : Request.Form["height"]);

            // image
            Bitmap result = new Bitmap(width, height);

            // set pixel colors
            for (int y = 0; y < height; y++)
            {
                // column counter for the row
                int x = 0;
                // get current row data
                string[] row = Request.Form["r" + y].Split(new char[] { ',' });
                // set pixels in the row
                for (int c = 0; c < row.Length; c++)
                {
                    // get pixel color and repeat count
                    string[] pixel = row[c].Split(new char[] { ':' });
                    Color current_color = ColorTranslator.FromHtml("#" + pixel[0]);
                    int repeat = pixel.Length > 1 ? Int32.Parse(pixel[1]) : 1;

                    // set pixel(s)
                    for (int l = 0; l < repeat; l++)
                    {
                        result.SetPixel(x, y, current_color);
                        x++;
                    }
                }
            }

            // output image

            // image type
            Response.ContentType = "image/jpeg";
            Response.AddHeader("Content-Disposition", "attachment; filename=\"amchart.jpg\"");

            // find image encoder for selected type
            ImageCodecInfo[] encoders;
            ImageCodecInfo img_encoder = null;
            encoders = ImageCodecInfo.GetImageEncoders();
            foreach (ImageCodecInfo codec in encoders)
                if (codec.MimeType == Response.ContentType)
                {
                    img_encoder = codec;
                    break;
                }

            // image parameters
            EncoderParameter jpeg_quality = new EncoderParameter(Encoder.Quality, 100L); // for jpeg images only
            EncoderParameters enc_params = new EncoderParameters(1);
            enc_params.Param[0] = jpeg_quality;

            result.Save(Response.OutputStream, img_encoder, enc_params);
        }
        else
        {
            // invalid post
            Response.Write("Invalid post");
        }
    }
}

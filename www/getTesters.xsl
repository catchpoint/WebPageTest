<?xml version="1.0" encoding="UTF-8"?>

<xsl:stylesheet version="1.0"
xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">
  <html>
  <head>
      <noscript>
      <meta http-equiv="refresh" content="240" />
      </noscript>
      <script language="JavaScript">
      setTimeout( "window.location.reload(true)", 240000 );
      </script>
      <style type="text/css">
      th,td{text-align:center; padding: 0px 15px;}
      .tester{text-align: left;}
      .header{text-align: left; background-color: yellow;font-size: larger; padding: 0.2em;}
      </style>
  </head>
  <body>
    <table id="locations">
      <xsl:for-each select="response/data/location">
        <tr><th class="header" colspan="16"><xsl:attribute name="id"><xsl:value-of select="id"/></xsl:attribute><xsl:value-of select="id"/> (<xsl:value-of select="elapsed"/> minutes)</th></tr>
        <xsl:if test="testers">
          <tr>
            <th class="tester">Tester</th>
            <th>Busy?</th>
            <th>Last Check (minutes)</th>
            <th>Last Work (minutes)</th>
            <th>Version</th>
            <th>Computer Name</th>
            <th>EC2 Instance</th>
            <th>CPU Utilization</th>
            <th>Error Rate</th>
            <th>Free Disk (GB)</th>
            <th>Screen Size</th>
            <th>IE Version</th>
            <th>Windows Version</th>
            <th>GPU?</th>
            <th>IP</th>
            <th>DNS Server(s)</th>
          </tr>
          <xsl:for-each select="testers/tester">
              <tr>
                <td class="tester"><xsl:value-of select="index"/></td>
                <td><xsl:value-of select="busy"/></td>
                <td><xsl:value-of select="elapsed"/></td>
                <td><xsl:value-of select="last"/></td>
                <td><xsl:value-of select="version"/></td>
                <td><xsl:value-of select="pc"/></td>
                <td><xsl:value-of select="ec2"/></td>
                <td><xsl:value-of select="cpu"/></td>
                <td><xsl:value-of select="errors"/></td>
                <td><xsl:value-of select="freedisk"/></td>
                <td><xsl:if test="string-length(screenwidth)!=0 and string-length(screenheight)!=0"><xsl:value-of select="screenwidth"/>x<xsl:value-of select="screenheight"/></xsl:if></td>
                <td><xsl:value-of select="ie"/></td>
                <td><xsl:value-of select="winver"/></td>
                <td><xsl:value-of select="GPU"/></td>
                <td><xsl:value-of select="ip"/></td>
                <td><xsl:value-of select="dns"/></td>
              </tr>
          </xsl:for-each>
        </xsl:if>
      </xsl:for-each>
    </table>
  </body>
  </html>
</xsl:template>
</xsl:stylesheet>

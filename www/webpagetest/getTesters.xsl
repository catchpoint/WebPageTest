<?xml version="1.0" encoding="UTF-8"?>

<xsl:stylesheet version="1.0"
xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">
  <html>
  <head>
      <noscript>
      <meta http-equiv="refresh" content="15" />
      </noscript>
      <script language="JavaScript">
      setTimeout( "window.location.reload(true)", 15000 );
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
        <tr><th class="header" colspan="8"><xsl:value-of select="id"/> (<xsl:value-of select="elapsed"/> minutes)</th></tr>
        <xsl:if test="testers">
          <tr>
            <th class="tester">Tester</th>
            <th>Version</th>
            <th>PC</th>
            <th>EC2 Instance</th>
            <th>IP</th>
            <th>Busy?</th>
            <th>Last Check (minutes)</th>
            <th>Last Work (minutes)</th>
          </tr>
          <xsl:for-each select="testers/tester">
              <tr>
                <td class="tester"><xsl:value-of select="index"/></td>
                <td><xsl:value-of select="version"/></td>
                <td><xsl:value-of select="pc"/></td>
                <td><xsl:value-of select="ec2"/></td>
                <td><xsl:value-of select="ip"/></td>
                <td><xsl:value-of select="busy"/></td>
                <td><xsl:value-of select="elapsed"/></td>
                <td><xsl:value-of select="last"/></td>
              </tr>
          </xsl:for-each>
        </xsl:if>
      </xsl:for-each>
    </table>
  </body>
  </html>
</xsl:template>
</xsl:stylesheet>
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
      th,td{text-align:center; padding: 0px 20px;}
      .location{text-align: left;}
      </style>
  </head>
  <body>
    <table id="locations">
      <tr>
        <th class="location">Location</th>
        <th>Idle Testers</th>
        <th>Total Tests</th>
        <th>Being Tested</th>
        <th>High Priority</th>
        <th>P1</th>
        <th>P2</th>
        <th>P3</th>
        <th>P4</th>
        <th>P5</th>
        <th>P6</th>
        <th>P7</th>
        <th>P8</th>
        <th>P9</th>
      </tr>
      <xsl:for-each select="response/data/location">
      <tr>
        <td class="location"><xsl:value-of select="id"/></td>
        <td><xsl:value-of select="PendingTests/Idle"/></td>
        <td><xsl:value-of select="PendingTests/Total"/></td>
        <td><xsl:value-of select="PendingTests/Testing"/></td>
        <td><xsl:value-of select="PendingTests/HighPriority"/></td>
        <td><xsl:value-of select="PendingTests/p1"/></td>
        <td><xsl:value-of select="PendingTests/p2"/></td>
        <td><xsl:value-of select="PendingTests/p3"/></td>
        <td><xsl:value-of select="PendingTests/p4"/></td>
        <td><xsl:value-of select="PendingTests/p5"/></td>
        <td><xsl:value-of select="PendingTests/p6"/></td>
        <td><xsl:value-of select="PendingTests/p7"/></td>
        <td><xsl:value-of select="PendingTests/p8"/></td>
        <td><xsl:value-of select="PendingTests/p9"/></td>
      </tr>
      </xsl:for-each>
    </table>
  </body>
  </html>
</xsl:template>
</xsl:stylesheet>
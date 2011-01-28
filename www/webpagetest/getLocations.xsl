<?xml version="1.0" encoding="UTF-8"?>

<xsl:stylesheet version="1.0"
xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">
  <html>
  <style type="text/css">
  th,td{text-align:center; padding: 0px 20px;}
  .location{text-align: left;}
  </style>
  <body>
    <table id="locations">
      <tr>
        <th class="location">Location</th>
        <th>Total Tests</th>
        <th>High Priority</th>
        <th>Low Priority</th>
        <th>Being Tested</th>
      </tr>
      <xsl:for-each select="response/data/location">
      <tr>
        <td class="location"><xsl:value-of select="id"/></td>
        <td><xsl:value-of select="PendingTests/Total"/></td>
        <td><xsl:value-of select="PendingTests/HighPriority"/></td>
        <td><xsl:value-of select="PendingTests/LowPriority"/></td>
        <td><xsl:value-of select="PendingTests/Testing"/></td>
      </tr>
      </xsl:for-each>
    </table>
  </body>
  </html>
</xsl:template>
</xsl:stylesheet>
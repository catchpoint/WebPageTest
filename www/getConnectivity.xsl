<?xml version="1.0" encoding="UTF-8"?>

<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:template match="/">
        <html>
            <head>
                <style type="text/css">
                    th,td{text-align:center; padding: 0px 20px;}
                    .connectivity{text-align: left;}
                </style>
            </head>
            <body>
                <table id="connectivities">
                    <tr>
                        <th class="connectivity">name</th>
                        <th>label</th>
                        <th>bwIn</th>
                        <th>bwOut</th>
                        <th>latency</th>
                        <th>plr</th>
                        <th>isDefault</th>
                    </tr>
                    <xsl:for-each select="response/data/connectivity">
                        <tr>
                            <td class="connectivity"><xsl:value-of select="id"/></td>
                            <td class="connectivity"><xsl:value-of select="label"/></td>
                            <td><xsl:value-of select="bwIn"/></td>
                            <td><xsl:value-of select="bwOut"/></td>
                            <td><xsl:value-of select="latency"/></td>
                            <td><xsl:value-of select="plr"/></td>
                            <td><xsl:value-of select="isDefault"/></td>
                        </tr>
                    </xsl:for-each>
                </table>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>

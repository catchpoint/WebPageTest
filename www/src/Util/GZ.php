<?php

declare(strict_types=1);

namespace WebPageTest\Util;

use WebPageTest\Util;

class GZ
{
    /**
     * Send a large file a chunk at a time (supports gzipped files)
     *
     * @return bool|int
     *
     * @psalm-return bool|int<0, max>
     */
    public static function gzReadfileChunked(string $filename, $retbytes = true)
    {
        $buffer = '';
        $cnt = 0;
        $handle = gzopen("$filename.gz", 'rb');
        if ($handle === false) {
            $handle = gzopen($filename, 'rb');
        }
        if ($handle === false) {
            return false;
        }
        while (!gzeof($handle)) {
            $buffer = gzread($handle, 1024 * 1024);  // 1MB at a time
            echo $buffer;
            ob_flush();
            flush();
            if ($retbytes) {
                $cnt += strlen($buffer);
            }
        }
        $status = gzclose($handle);
        if ($retbytes && $status) {
            return $cnt; // return num. bytes delivered like readfile() does.
        }
        return $status;
    }

    /**
     * Transparently read a GZIP version of the given file
     * (we will be looking for .gz extensions though it's not technically required, just good practice)
     *
     * @return false|null|string
     */
    public static function gzFileGetContents(string $file)
    {
        $data = null;

        $fileSize = @filesize("$file.gz");
        if (!$fileSize) {
            $fileSize = @filesize($file);
        }
        if ($fileSize) {
            $chunkSize = min(4096, max(1024000, $fileSize * 10));
            $zip = @gzopen("$file.gz", 'rb');
            if ($zip === false) {
                $zip = @gzopen($file, 'rb');
            }

            if ($zip !== false) {
                while ($string = gzread($zip, $chunkSize)) {
                    $data .= $string;
                }
                gzclose($zip);
            } else {
                $data = false;
            }
        }

        return $data;
    }

    /**
     * Write out a GZIP version of the given file (tacking on the .gz automatically)
     */
    public static function gzFilePutContents(string $filename, string $data): bool
    {
        $ret = false;
        $nogzip = Util::getSetting('nogzip');
        $compression = Util::getSetting('compression', '6');
        if (!is_numeric($compression) || $compression < 1 || $compression > 9) {
            $compression = 6;
        }
        if (!$nogzip && extension_loaded('zlib')) {
            $zip = @gzopen("$filename.gz", "wb$compression");
            if ($zip !== false) {
                if (gzwrite($zip, $data)) {
                    $ret = true;
                }
                gzclose($zip);
            }
        } else {
            if (file_put_contents($filename, $data)) {
                $ret = true;
            }
        }

        return $ret;
    }

    /**
     * read a GZIP file into an array
     *
     * @return false|null|string[]
     *
     * @psalm-return false|list<string>|null
     */
    public static function gzFile(string $filename)
    {
        $ret = null;

        if (is_file("$filename.gz")) {
            $ret = gzfile("$filename.gz");
        } elseif (is_file($filename)) {
            $ret = file($filename);
        }

        return $ret;
    }

    /**
     * GZip compress the given file
     */
    public static function gzCompress(string $filename): bool
    {
        $ret = false;

        $nogzip = Util::getSetting('nogzip');
        if (!$nogzip && extension_loaded('zlib')) {
            $data = file_get_contents($filename);
            if ($data) {
                $ret = self::gzFilePutContents($filename, $data);
                unset($data);
            }
        }

        return $ret;
    }

    /**
     * Check for either the compressed or uncompressed file
     */
    public static function gzIsFile(string $filename): bool
    {
        $ret = is_file("$filename.gz") || is_file($filename);
        return $ret;
    }
}

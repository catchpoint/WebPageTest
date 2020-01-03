<?php
/**
 * Sendmail implementation of the PEAR Mail interface.
 *
 * PHP version 5
 *
 * LICENSE:
 *
 * Copyright (c) 2010-2017, Chuck Hagenbuch & Jon Parise
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @category    Mail
 * @package     Mail
 * @author      Jon Parise <jon@php.net>
 * @author      Chuck Hagenbuch <chuck@horde.org>
 * @copyright   2010-2017 Chuck Hagenbuch
 * @license     http://opensource.org/licenses/BSD-3-Clause New BSD License
 * @version     CVS: $Id$
 * @link        http://pear.php.net/package/Mail/
 */

/**
 * Sendmail implementation of the PEAR Mail:: interface.
 * @access public
 * @package Mail
 * @version $Revision$
 */
class Mail_sendmail extends Mail {

    /**
     * The location of the sendmail or sendmail wrapper binary on the
     * filesystem.
     * @var string
     */
    var $sendmail_path = '/usr/sbin/sendmail';

    /**
     * Any extra command-line parameters to pass to the sendmail or
     * sendmail wrapper binary.
     * @var string
     */
    var $sendmail_args = '-i';

    /**
     * Constructor.
     *
     * Instantiates a new Mail_sendmail:: object based on the parameters
     * passed in. It looks for the following parameters:
     *     sendmail_path    The location of the sendmail binary on the
     *                      filesystem. Defaults to '/usr/sbin/sendmail'.
     *
     *     sendmail_args    Any extra parameters to pass to the sendmail
     *                      or sendmail wrapper binary.
     *
     * If a parameter is present in the $params array, it replaces the
     * default.
     *
     * @param array $params Hash containing any parameters different from the
     *              defaults.
     */
    public function __construct($params)
    {
        if (isset($params['sendmail_path'])) {
            $this->sendmail_path = $params['sendmail_path'];
        }
        if (isset($params['sendmail_args'])) {
            $this->sendmail_args = $params['sendmail_args'];
        }

        /*
         * Because we need to pass message headers to the sendmail program on
         * the commandline, we can't guarantee the use of the standard "\r\n"
         * separator.  Instead, we use the system's native line separator.
         */
        if (defined('PHP_EOL')) {
            $this->sep = PHP_EOL;
        } else {
            $this->sep = (strpos(PHP_OS, 'WIN') === false) ? "\n" : "\r\n";
        }
    }

    /**
     * Implements Mail::send() function using the sendmail
     * command-line binary.
     *
     * @param mixed $recipients Either a comma-seperated list of recipients
     *              (RFC822 compliant), or an array of recipients,
     *              each RFC822 valid. This may contain recipients not
     *              specified in the headers, for Bcc:, resending
     *              messages, etc.
     *
     * @param array $headers The array of headers to send with the mail, in an
     *              associative array, where the array key is the
     *              header name (ie, 'Subject'), and the array value
     *              is the header value (ie, 'test'). The header
     *              produced from those values would be 'Subject:
     *              test'.
     *
     * @param string $body The full text of the message body, including any
     *               Mime parts, etc.
     *
     * @return mixed Returns true on success, or a PEAR_Error
     *               containing a descriptive error message on
     *               failure.
     */
    public function send($recipients, $headers, $body)
    {
        if (!is_array($headers)) {
            return PEAR::raiseError('$headers must be an array');
        }

        $result = $this->_sanitizeHeaders($headers);
        if (is_a($result, 'PEAR_Error')) {
            return $result;
        }

        $recipients = $this->parseRecipients($recipients);
        if (is_a($recipients, 'PEAR_Error')) {
            return $recipients;
        }
        $recipients = implode(' ', array_map('escapeshellarg', $recipients));

        $headerElements = $this->prepareHeaders($headers);
        if (is_a($headerElements, 'PEAR_Error')) {
            return $headerElements;
        }
        list($from, $text_headers) = $headerElements;

        /* Since few MTAs are going to allow this header to be forged
         * unless it's in the MAIL FROM: exchange, we'll use
         * Return-Path instead of From: if it's set. */
        if (!empty($headers['Return-Path'])) {
            $from = $headers['Return-Path'];
        }

        if (!isset($from)) {
            return PEAR::raiseError('No from address given.');
        } elseif (strpos($from, ' ') !== false ||
                  strpos($from, ';') !== false ||
                  strpos($from, '&') !== false ||
                  strpos($from, '`') !== false) {
            return PEAR::raiseError('From address specified with dangerous characters.');
        }

        $from = escapeshellarg($from); // Security bug #16200

        $mail = @popen($this->sendmail_path . (!empty($this->sendmail_args) ? ' ' . $this->sendmail_args : '') . " -f$from -- $recipients", 'w');
        if (!$mail) {
            return PEAR::raiseError('Failed to open sendmail [' . $this->sendmail_path . '] for execution.');
        }

        // Write the headers following by two newlines: one to end the headers
        // section and a second to separate the headers block from the body.
        fputs($mail, $text_headers . $this->sep . $this->sep);

        fputs($mail, $body);
        $result = pclose($mail);
        if (version_compare(phpversion(), '4.2.3') == -1) {
            // With older php versions, we need to shift the pclose
            // result to get the exit code.
            $result = $result >> 8 & 0xFF;
        }

        if ($result != 0) {
            return PEAR::raiseError('sendmail returned error code ' . $result,
                                    $result);
        }

        return true;
    }

}

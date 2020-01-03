<?php
/**
 * Mock implementation
 *
 * PHP version 5
 *
 * LICENSE:
 *
 * Copyright (c) 2010-2017, Chuck Hagenbuch
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
 * @author      Chuck Hagenbuch <chuck@horde.org> 
 * @copyright   2010-2017 Chuck Hagenbuch
 * @license     http://opensource.org/licenses/BSD-3-Clause New BSD License
 * @version     CVS: $Id$
 * @link        http://pear.php.net/package/Mail/
 */

/**
 * Mock implementation of the PEAR Mail:: interface for testing.
 * @access public
 * @package Mail
 * @version $Revision$
 */
class Mail_mock extends Mail {

    /**
     * Array of messages that have been sent with the mock.
     *
     * @var array
     */
    public $sentMessages = array();

    /**
     * Callback before sending mail.
     *
     * @var callback
     */
    protected $_preSendCallback;

    /**
     * Callback after sending mai.
     *
     * @var callback
     */
    protected $_postSendCallback;

    /**
     * Constructor.
     *
     * Instantiates a new Mail_mock:: object based on the parameters
     * passed in. It looks for the following parameters, both optional:
     *     preSendCallback   Called before an email would be sent.
     *     postSendCallback  Called after an email would have been sent.
     *
     * @param array Hash containing any parameters.
     */
    public function __construct($params)
    {
        if (isset($params['preSendCallback']) &&
            is_callable($params['preSendCallback'])) {
            $this->_preSendCallback = $params['preSendCallback'];
        }

        if (isset($params['postSendCallback']) &&
            is_callable($params['postSendCallback'])) {
            $this->_postSendCallback = $params['postSendCallback'];
        }
    }

    /**
     * Implements Mail_mock::send() function. Silently discards all
     * mail.
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
        if ($this->_preSendCallback) {
            call_user_func_array($this->_preSendCallback,
                                 array(&$this, $recipients, $headers, $body));
        }

        $entry = array('recipients' => $recipients, 'headers' => $headers, 'body' => $body);
        $this->sentMessages[] = $entry;

        if ($this->_postSendCallback) {
            call_user_func_array($this->_postSendCallback,
                                 array(&$this, $recipients, $headers, $body));
        }

        return true;
    }

}

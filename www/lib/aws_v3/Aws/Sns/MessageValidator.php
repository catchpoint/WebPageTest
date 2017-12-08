<?php
namespace Aws\Sns;

use Aws\Sns\Exception\InvalidSnsMessageException;

/**
 * Uses openssl to verify SNS messages to ensure that they were sent by AWS.
 */
class MessageValidator
{
    const SIGNATURE_VERSION_1 = '1';

    /**
     * @var callable Callable used to download the certificate content.
     */
    private $certClient;

    /** @var string */
    private $hostPattern;

    /**
     * @var string  A pattern that will match all regional SNS endpoints, e.g.:
     *                  - sns.<region>.amazonaws.com        (AWS)
     *                  - sns.us-gov-west-1.amazonaws.com   (AWS GovCloud)
     *                  - sns.cn-north-1.amazonaws.com.cn   (AWS China)
     */
    private static $defaultHostPattern
        = '/^sns\.[a-zA-Z0-9\-]{3,}\.amazonaws\.com(\.cn)?$/';

    /**
     * Constructs the Message Validator object and ensures that openssl is
     * installed.
     *
     * @param callable $certClient Callable used to download the certificate.
     *                             Should have the following function signature:
     *                             `function (string $certUrl) : string $certContent`
     * @param string $hostNamePattern
     */
    public function __construct(
        callable $certClient = null,
        $hostNamePattern = ''
    ) {
        $this->certClient = $certClient ?: 'file_get_contents';
        $this->hostPattern = $hostNamePattern ?: self::$defaultHostPattern;
    }

    /**
     * Validates a message from SNS to ensure that it was delivered by AWS.
     *
     * @param Message $message Message to validate.
     *
     * @throws InvalidSnsMessageException If the cert cannot be retrieved or its
     *                                    source verified, or the message
     *                                    signature is invalid.
     */
    public function validate(Message $message)
    {
        // Get the certificate.
        $this->validateUrl($message['SigningCertURL']);
        $certificate = call_user_func($this->certClient, $message['SigningCertURL']);

        // Extract the public key.
        $key = openssl_get_publickey($certificate);
        if (!$key) {
            throw new InvalidSnsMessageException(
                'Cannot get the public key from the certificate.'
            );
        }

        // Verify the signature of the message.
        $content = $this->getStringToSign($message);
        $signature = base64_decode($message['Signature']);
        if (!openssl_verify($content, $signature, $key, OPENSSL_ALGO_SHA1)) {
            throw new InvalidSnsMessageException(
                'The message signature is invalid.'
            );
        }
    }

    /**
     * Determines if a message is valid and that is was delivered by AWS. This
     * method does not throw exceptions and returns a simple boolean value.
     *
     * @param Message $message The message to validate
     *
     * @return bool
     */
    public function isValid(Message $message)
    {
        try {
            $this->validate($message);
            return true;
        } catch (InvalidSnsMessageException $e) {
            return false;
        }
    }

    /**
     * Builds string-to-sign according to the SNS message spec.
     *
     * @param Message $message Message for which to build the string-to-sign.
     *
     * @return string
     * @link http://docs.aws.amazon.com/sns/latest/gsg/SendMessageToHttp.verify.signature.html
     */
    public function getStringToSign(Message $message)
    {
        static $signableKeys = [
            'Message',
            'MessageId',
            'Subject',
            'SubscribeURL',
            'Timestamp',
            'Token',
            'TopicArn',
            'Type',
        ];

        if ($message['SignatureVersion'] !== self::SIGNATURE_VERSION_1) {
            throw new InvalidSnsMessageException(
                "The SignatureVersion \"{$message['SignatureVersion']}\" is not supported."
            );
        }

        $stringToSign = '';
        foreach ($signableKeys as $key) {
            if (isset($message[$key])) {
                $stringToSign .= "{$key}\n{$message[$key]}\n";
            }
        }

        return $stringToSign;
    }

    /**
     * Ensures that the URL of the certificate is one belonging to AWS, and not
     * just something from the amazonaws domain, which could include S3 buckets.
     *
     * @param string $url Certificate URL
     *
     * @throws InvalidSnsMessageException if the cert url is invalid.
     */
    private function validateUrl($url)
    {
        $parsed = parse_url($url);
        if (empty($parsed['scheme'])
            || empty($parsed['host'])
            || $parsed['scheme'] !== 'https'
            || substr($url, -4) !== '.pem'
            || !preg_match($this->hostPattern, $parsed['host'])
        ) {
            throw new InvalidSnsMessageException(
                'The certificate is located on an invalid domain.'
            );
        }
    }
}

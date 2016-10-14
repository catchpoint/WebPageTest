<?php
namespace Aws\Sns;

/**
 * Represents an SNS message received over http(s).
 */
class Message implements \ArrayAccess, \IteratorAggregate
{
    private static $requiredKeys = [
        'Message',
        'MessageId',
        'Timestamp',
        'TopicArn',
        'Type',
        'Signature',
        'SigningCertURL',
        'SignatureVersion',
    ];

    /** @var array The message data */
    private $data;

    /**
     * Creates a message object from the raw POST data
     *
     * @return Message
     * @throws \RuntimeException If the POST data is absent, or not a valid JSON document
     */
    public static function fromRawPostData()
    {
        // Make sure the SNS-provided header exists.
        if (!isset($_SERVER['HTTP_X_AMZ_SNS_MESSAGE_TYPE'])) {
            throw new \RuntimeException('SNS message type header not provided.');
        }

        // Read the raw POST data and JSON-decode it.
        $data = json_decode(file_get_contents('php://input'), true);
        if (JSON_ERROR_NONE !== json_last_error() || !is_array($data)) {
            throw new \RuntimeException('Invalid POST data.');
        }

        return new Message($data);
    }

    /**
     * Creates a Message object from an array of raw message data.
     *
     * @param array $data The message data.
     *
     * @throws \InvalidArgumentException If a valid type is not provided or
     *                                   there are other required keys missing.
     */
    public function __construct(array $data)
    {
        // Ensure that all the required keys for the message's type are present.
        $this->validateRequiredKeys($data, self::$requiredKeys);
        if ($data['Type'] === 'SubscriptionConfirmation'
            || $data['Type'] === 'UnsubscribeConfirmation'
        ) {
            $this->validateRequiredKeys($data, ['SubscribeURL', 'Token']);
        }

        $this->data = $data;
    }

    public function getIterator()
    {
        return new \ArrayIterator($this->data);
    }

    public function offsetExists($key)
    {
        return isset($this->data[$key]);
    }

    public function offsetGet($key)
    {
        return isset($this->data[$key]) ? $this->data[$key] : null;
    }

    public function offsetSet($key, $value)
    {
        $this->data[$key] = $value;
    }

    public function offsetUnset($key)
    {
        unset($this->data[$key]);
    }

    /**
     * Get all the message data as a plain array.
     *
     * @return array
     */
    public function toArray()
    {
        return $this->data;
    }

    private function validateRequiredKeys(array $data, array $keys)
    {
        foreach ($keys as $key) {
            if (!isset($data[$key])) {
                throw new \InvalidArgumentException(
                    "\"{$key}\" is required to verify the SNS Message."
                );
            }
        }
    }
}

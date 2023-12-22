<?php

declare(strict_types=1);

namespace Psalm\Internal\LanguageServer;

use Amp\ByteStream\ResourceOutputStream;
use Amp\Promise;

/**
 * @internal
 */
final class ProtocolStreamWriter implements ProtocolWriter
{
    private ResourceOutputStream $output;

    /**
     * @param resource $output
     */
    public function __construct($output)
    {
        $this->output = new ResourceOutputStream($output);
    }

    /**
     * {@inheritdoc}
     */
    public function write(Message $msg): Promise
    {
        return $this->output->write((string)$msg);
    }
}

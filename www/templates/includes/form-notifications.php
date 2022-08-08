<?php foreach ($messages['form'] as $message) : ?>
    <div class="notification-banner  notification-banner__<?= htmlspecialchars($message['type']) ?>">
        <p> <?= htmlspecialchars_decode($message['text']) ?> </p>
    </div>
<?php endforeach; ?>
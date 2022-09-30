<?php if (isset($messages) && isset($messages['form'])) : ?>
    <?php foreach ($messages['form'] as $message) : ?>
        <div class="notification-banner  notification-banner__<?= htmlspecialchars($message['type']) ?>">
            <p> <?= htmlspecialchars_decode($message['text']) ?> </p>
        </div>
    <?php endforeach; ?>
    <script>
        (() => {
            if (document.readyState === "loading") {
                document.body.addEventListener('click', e => {
                    document.querySelectorAll('.notification-banner').forEach(el => {
                        el.remove();
                    })
                });
            }
        })();
    </script>
<?php endif; ?>
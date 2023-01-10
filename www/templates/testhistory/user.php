<div class="history_hed">
    <h1>Test History</h1>

    <form name="filterLog" method="get" action="/testlog.php">

        <?php if (!$is_logged_in) : ?>
            <div class="logged-out-history">
                <p>Test history is available for up to 30 days as long as your storage isn't cleared. By registering for a free account, you can keep test history for longer, compare tests, and review changes. Additionally, you will also be able to post on the <a href="https://forums.webpagetest.org">WebPageTest Forum</a> and contribute to the discussions there about features, test results and more.</p>
                <a href="<?= "{$protocol}://{$host}/signup" ?>" class="btn-primary">Get Free Access</a>
            </div>
        <?php endif; ?>
        <div class="history_filter">
            <label for="filter">Filter test history:</label>
            <input id="filter" name="filter" type="text" onkeyup="filterHistory()" placeholder="Search">
            <?php if ($is_logged_in) : ?>
                <label for="days" class="a11y-hidden">Select how far back you want to see</label>
                <select name="days">
                    <option value="1" <?php if ($days == 1) {
                                            echo "selected";
                                      } ?>>1 Day</option>
                    <option value="7" <?php if ($days == 7) {
                                            echo "selected";
                                      } ?>>7 Days</option>
                    <option value="30" <?php if ($days == 30) {
                                            echo "selected";
                                       } ?>>30 Days</option>
                    <option value="182" <?php if ($days == 182) {
                                            echo "selected";
                                        } ?>>6 Months</option>
                    <option value="365" <?php if ($days == 365) {
                                            echo "selected";
                                        } ?>>1 Year</option>
                </select>
            <?php endif; ?>
        </div>
    </form>
</div>
<div class="box">
    <form name="compare" method="get" action="/video/compare.php">
        <div class="history-controls">
            <input id="CompareBtn" type="submit" value="Compare Selected Tests">
        </div>
        <div class="scrollableTable">
            <table id="history" class="history pretty" border="0" cellpadding="5px" cellspacing="0">
                <thead>
                    <tr>
                        <th class="pin"><span>Select to compare</span></th>
                        <th class="url">URL</th>
                        <th class="date">Run Date</th>
                        <th class="location">Run From</th>
                        <th class="label">Label</th>
                    </tr>
                </thead>
                <?php if ($is_logged_in) : ?>
                    <tbody id="historyBody">
                        <?php foreach ($test_history as $record) : ?>
                            <tr>
                                <th><input type="checkbox" name="t[]" value="<?= $record->getTestId() ?>" /></th>
                                <td class="url"><a href="/result/<?= $record->getTestId() ?>/"><?= $record->getUrl() ?></a></td>
                                <td class="date"><?= date_format(date_create($record->getStartTime()), 'M d, Y g:i:s A e') ?></td>
                                <td class="location"><?= $record->getLocation() ?></td>
                                <td class="label"><?= $record->getLabel() ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                <?php endif; ?>
            </table>
        </div>
        <?php
        // Hidden form fields
        if ($local) {
            echo '<input type="hidden" name="local" value="1">';
        }
        if (isset($priority)) {
            echo '<input type="hidden" name="priority" value="' . $priority . '">';
        }
        ?>
    </form>
</div>

<script>
    <?php
    if ($is_logged_in) {
        include ASSETS_PATH . '/js/history-loggedin.js';
    } else {
        // if not logged in, build a local searchable test history from the data stored in indexeddb.
        include ASSETS_PATH . '/js/history.js';
    }
    ?>
</script>
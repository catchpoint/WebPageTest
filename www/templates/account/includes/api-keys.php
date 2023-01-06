<div class="box card api-consumers">
    <h2>API Consumers</h2>
    <div class="create-key-container">
        <div class="create-delete-button-container">
            <button type="button" class="new-api-key" data-toggle="open" data-targetid="create-api-key-toggle-area">New Api Key</button>
            <label for="delete-api-key-submit-input" class="delete-key disabled" data-apikeybox="delete-button" disabled data-apikey-form-submit="delete">Delete</label>
        </div>
        <div class="toggleable" id="create-api-key-toggle-area">
            <form method="POST" action="/account" class="apikey-control" data-apikey-form="create">
                <label for="api-key-name" class="sr-only">API Key Name</label>
                <input type="text" name="api-key-name" placeholder="Enter Application Name" required />
                <button type="submit">Save</button>
                <button type="button" class="cancel" data-toggle="close" data-targetid="create-api-key-toggle-area">Cancel</button>
                <input type="hidden" name="type" value="create-api-key" />
                <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
            </form>
        </div>
    </div>
    <div class="info">
        <form method='POST' action='/account' class="apikey-control" data-apikey-form="delete">
            <table class="sortable responsive-vertical-table selectable-table">
                <caption>
                    <span class="sr-only">API Consumers table, column headers with buttons are sortable.</span>
                </caption>
                <thead>
                    <tr>
                        <th class="no-sort select-all-box"><label class="sr-only" for="select-all-api-keys">Select all api keys</label><input type="checkbox" name="select-all-api-keys" data-apikeybox="select-all" /></th>
                        <th aria-sort="ascending">
                            <button type="button">
                                Name
                                <span aria-hidden="true"></span>
                            </button>
                        </th>
                        <th>
                            <button type="button">
                                API Key
                                <span aria-hidden="true"></span>
                            </button>
                        </th>
                        <th>
                            <button type="button">
                                Create Date
                                <span aria-hidden="true"></span>
                            </button>
                        </th>
                        <th>
                            <button type="button">
                                Last Updated
                                <span aria-hidden="true"></span>
                            </button>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($api_keys as $key) : ?>
                        <tr>
                            <td data-th="Select">
                                <input type='checkbox' data-apikeybox="individual" name='api-key-id[]' value='<?= $key->getId() ?>' />
                            </td>
                            <td data-th="Name"><?= $key->getName() ?></td>
                            <td data-th="API key" class="hidden-content">
                                <button type="button" class="view-button">View</button>
                                <span class="hidden-area closed">
                                    <span class="api-key"><?= $key->getApiKey() ?></span>
                                    <button type="button" class="hide-button"><span class="sr-only">Close</span></button>
                            </td>
                            </span>
                            <td data-th="Created"><?= date_format($key->getCreateDate(), 'M d Y H:i:s e') ?></td>
                            <td data-th="Updated"><?= date_format($key->getChangeDate(), 'M d Y H:i:s e') ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <input type='hidden' name='type' value='delete-api-key' />
            <input type='hidden' name='csrf_token' value='<?= $csrf_token ?>' />
            <input type="submit" id="delete-api-key-submit-input" class="sr-only" />
        </form>
    </div>
</div>

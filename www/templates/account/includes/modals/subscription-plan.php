<fg-modal id="subscription-plan-modal" class="subscription-plan-modal fg-modal">
  <form method="POST" action="/account">
    <fieldset>
      <legend class="modal_title">Subscription Details</legend>
      <p>Plan Details: </p>
      <button type="submit">Cancel Subscription</button>
      <input type="hidden" name="type" value="cancel-subscription" />
      <input type="hidden" name="id" value="<?= $id ?>" />
      <input type="hidden" name="csrf_token" value="<?= $csrf_token ?>" />
    </fieldset>
  </form>
</fg-modal>

(function (window) {
  window.filterHistory = filterHistory;

  function filterHistory() {
    const input = document.getElementById("filter");
    const filter = input.value.toUpperCase();
    const table = document.getElementById("historyBody");
    const rows = table.getElementsByTagName("tr");

    if (filter === '') {
      return;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row) {
        txtValue = row.textContent || row.innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
          row.style.display = "";
        } else {
          row.style.display = "none";
        }
      }
    }
  }
})(window);

((window) => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      handleDaySelector();
      filterHistory();
    });
  } else {
    handleDaySelector();
    filterHistory();
  }

  function handleDaySelector() {
    const daySelector = document.querySelector("select[name=days]");
    const filter = document.getElementById('filter');

    daySelector.addEventListener("change", (e) => {
      const days = e.target.value;
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;

      if (filter.value) {
        document.querySelector('form[name=filterLog]').submit();
        return;
      }

      const redirectUri = protocol + "//" + hostname + "/testlog/" + days + "/";
      window.location = redirectUri;
    });
  }
})(window);

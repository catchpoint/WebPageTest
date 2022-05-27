(function(window) {
  window.filterHistory = filterHistory;

  function filterHistory() {
      const input = document.getElementById("filter");
      const filter = input.value.toUpperCase();
      const table = document.getElementById("historyBody");
      const rows = table.getElementsByTagName("tr");

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

}(window));

((window) => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      handleDaySelector();
    });
  } else {
    handleDaySelector();
  }

  function handleDaySelector () {
    const daySelector = document.querySelector('select[name=days]')
    daySelector.addEventListener('change', (e) => {
      const days = e.target.value;
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const redirectUri = protocol + "//" + hostname + "/testlog/" + days + "/";

      window.location = redirectUri;
    })
  }
})(window);

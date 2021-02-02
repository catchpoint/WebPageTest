(function(){
const open = window.indexedDB.open("webpagetest", 1);
const now = Date.now() / 1000;
open.onsuccess = () => {
    const db = open.result;
    const transaction = db.transaction(['history'], 'readwrite');
    const store = transaction.objectStore('history');
    const index = store.index('created');
    const cursorRequest = index.openCursor();
    let entries = new Array();
    cursorRequest.onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) {
            const entry = cursor.value;
            const elapsedDays = (now - entry.created) / 86400;
            if (elapsedDays > 31) {
                cursor.delete();
            } else {
                entries.unshift(entry);
            }
            cursor.continue();
        } else {
            const table = document.getElementById('history');
            const tbody = document.createElement('tbody');
            tbody.id = 'historyBody';
            for(let i in entries) {
                const entry = entries[i];
                const tr = document.createElement('tr');
                const compare = document.createElement('td');
                if (entry.video) {
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.name = 't[]';
                    checkbox.value = entry.id;
                    compare.appendChild(checkbox);
                }
                tr.appendChild(compare);

                const datetime = document.createElement('td');
                datetime.className = 'date';
                datetime.innerText = new Date(entry.created * 1000).toLocaleString();
                tr.appendChild(datetime);

                const location = document.createElement('td');
                location.className = 'location';
                location.innerHTML = entry.location;
                tr.appendChild(location);

                const label = document.createElement('td');
                label.className = 'label';
                label.innerText = entry.label;
                tr.appendChild(label);

                const url = document.createElement('td');
                url.className = 'url';
                const link = document.createElement('a');
                link.href = '/result/' + entry.id + '/';
                link.innerText = entry.url;
                url.appendChild(link);
                tr.appendChild(url);

                tbody.appendChild(tr);
            }
            table.appendChild(tbody);
        }
    }
};
})();

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
// Highlights the save button to show something has changed and needs saving.
function highlightSaveBtn() {
    document.querySelector('#saveBtn').style.backgroundColor = 'darkblue';
}

// Opposite of highlightSaveBtn.
function unHighlightSaveBtn() {
    document.querySelector('#saveBtn').style.backgroundColor = '';
}

// Is called whenever a cell is edited, performs conditional highlights and save btn highlights.
function onCellEdit(e) {
    if (e.target.textContent === '') {
        e.target.style.backgroundColor = '#FF6961';
    } else {
        e.target.style.backgroundColor = '';
    }
    highlightSaveBtn();
}

// Event that fires when the delete button for a row is clicked.
function deleteRowClicked(e) {
    e.target.parentElement.parentElement.remove();
    highlightSaveBtn();
}

// Adds a row to the given table element with the given texts and a trash icon/
function addRow(tableElem, bangText, urlText) {
    const row = document.createElement('tr');

    const bangCol = document.createElement('td');
    bangCol.textContent = bangText;
    bangCol.addEventListener('input', onCellEdit);
    bangCol.setAttribute('contenteditable', 'true');
    row.appendChild(bangCol);

    const urlCol = document.createElement('td');
    urlCol.textContent = urlText;
    urlCol.addEventListener('input', onCellEdit);
    urlCol.setAttribute('contenteditable', 'true');
    row.appendChild(urlCol);

    const trashImgTd = document.createElement('td');
    const trashImg = document.createElement('img');
    trashImg.src = 'trash.svg';
    trashImg.className = 'trashSvg';
    trashImg.addEventListener('click', deleteRowClicked);
    trashImgTd.appendChild(trashImg);
    row.appendChild(trashImgTd);

    tableElem.appendChild(row);
    highlightSaveBtn();
}

// Takes the rows in the table and saves the given parameters to storage.
async function saveFromTable() {
    const table = document.querySelector('#bangsTable');
    const bangs = {};

    // Start from 1 to ignore headers.
    for (let i = 1; i < table.rows.length; i++) {
        const row = table.rows[i];

        const bangText = row.cells[0].textContent.trim();
        const urlText = row.cells[1].textContent.trim();

        if (bangText !== '' && urlText !== '') {
            bangs[bangText] = urlText;
        } else {
            row.remove();
        }
    }

    await browser.storage.sync.set({ bangs });
    unHighlightSaveBtn();
}

// Remove all <td> from the table & add new ones from either bangsToUse or browser storage.
async function renderTable(bangsToUse = null) {
    const table = document.querySelector('#bangsTable');

    // Set to a const as table.rows.length will change as we remove things.
    const lastRowIndex = table.rows.length - 1;
    // Counting down from the last index means we don't have to worry about the fact that the amount
    // of rows is changing when we remove one. i > 0 means that we will stop before removing the 0th
    // element, the header row.
    for (let i = lastRowIndex; i > 0; i--) {
        table.rows[i].remove();
    }

    let bangs = bangsToUse;
    if (bangs === null) {
        bangs = (await browser.storage.sync.get('bangs')).bangs;
    }

    for (const [k, v] of Object.entries(bangs)) {
        addRow(table, k, v);
    }
}

// Attempts to load a valid & importable JSON object from the file, otherwise returns null.
async function tryFileToObj(file) {
    if (file.type !== 'application/json') {
        return null;
    }

    const obj = JSON.parse(await file.text());
    for (const [key, value] of Object.entries(obj)) {
        if (typeof key !== 'string' || typeof value !== 'string') {
            return null;
        }
    }

    return obj;
}

// Imports bangs from a given file by appending them to the current bangs.
async function importBangs(fileInput) {
    const file = fileInput.files[0];
    const newBangs = await tryFileToObj(file);

    if (newBangs !== null) {
        const { bangs: currentBangs } = await browser.storage.sync.get('bangs');
        const combined = { ...currentBangs, ...newBangs };
        await renderTable(combined);
    } else {
        // Show and then hide error toast.
        const toast = document.querySelector('#errorToast');
        toast.className = 'show';
        setTimeout(() => { toast.className = ''; }, 4000);
    }
}

// Exports the currently saved bangs (not the bangs currently in the table).
async function exportBangs() {
    const { bangs } = await browser.storage.sync.get('bangs');
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(bangs))}`;
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'custombangs.json');
    a.click();
    a.remove();
}

// Sets the storage to the defaults and re-renders the table.
async function setDefaults() {
    const r = await fetch('../defaults.json');
    const bangs = await r.json();
    await renderTable(bangs);
}

// Sets up event listeners and calls renderTable.
document.addEventListener('DOMContentLoaded', async () => {
    const table = document.querySelector('#bangsTable');
    const fileInput = document.querySelector('#importFileInput');

    document.querySelector('#saveBtn').addEventListener('click', async () => {
        await saveFromTable();
    });

    document.querySelector('#addRowBtn').addEventListener('click', () => {
        addRow(table, 'e', 'https://example.com?q=%s');
    });

    document.querySelector('#importBtn').addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async () => {
        await importBangs(fileInput);
    });

    document.querySelector('#exportBtn').addEventListener('click', async () => {
        await exportBangs();
    });

    document.querySelector('#setDefaultBtn').addEventListener('click', async () => {
        await setDefaults();
    });

    document.querySelector('#helpBtn').addEventListener('click', async () => {
        window.open('https://github.com/psidex/CustomBangSearch#options-page');
    });

    // It is assumed bangs wont ever be undefined here as we set it in main.js.
    await renderTable();
    // renderTable will cause the save button to highlight.
    // We're rendering what is already saved so don't do that.
    unHighlightSaveBtn();
});

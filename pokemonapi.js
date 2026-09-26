const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const quickSearchList = document.getElementById('quick-search-list');
const randomButton = document.getElementById('random-button');

// ⭐ RECENTLY SEARCHED — the 4 quick-search buttons are now a most-recently-
// searched list, not a fixed set. Every successful search (typed, quick
// button, or random) moves that Pokémon to the leftmost slot; whatever was
// in the rightmost slot falls off the end.
let recentSearches = ['pikachu', 'charizard', 'bulbasaur', 'mewtwo'];

function renderQuickSearchButtons() {
    quickSearchList.innerHTML = recentSearches.map(name => {
        const label = name.charAt(0).toUpperCase() + name.slice(1);
        return `<button data-name="${name}">${label}</button>`;
    }).join('');
}

function addToRecentSearches(name) {
    const normalized = name.toLowerCase();
    // Drop any existing occurrence first so the same Pokémon doesn't show
    // up twice, then place it at the front and cap the list at 4.
    recentSearches = [normalized, ...recentSearches.filter(n => n !== normalized)].slice(0, 4);
    renderQuickSearchButtons();
}

renderQuickSearchButtons();

// Event delegation: the buttons above get replaced every time the list
// re-renders, so one listener on the container (rather than one per button)
// keeps working no matter how many times it's rebuilt.
quickSearchList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-name]');
    if (btn) {
        searchInput.value = btn.dataset.name;
        fetchPokemon(btn.dataset.name);
    }
});
const cardContainer = document.getElementById('card-container');
const statusMessage = document.getElementById('status-message');

// ⭐ BUTTON PRESS SOUND — plays on every <button> click, anywhere on the page.
// Using event delegation on document (rather than one listener per button)
// means it also covers buttons that don't exist yet at load time.
const buttonPressSound = new Audio('button-press.mp3');
function playButtonSound() {
    // Rewind first so rapid clicks always restart the sound instead of
    // getting silently ignored while a previous play is still finishing.
    buttonPressSound.currentTime = 0;
    buttonPressSound.play().catch(() => {
        // Autoplay can be blocked until the user has interacted with the
        // page at least once — safe to ignore, the click itself counts.
    });
}
document.addEventListener('click', (e) => {
    if (e.target.closest('button')) playButtonSound();
});

async function fetchPokemon(name) {
    // Disable the button while loading
    searchButton.disabled = true;
    searchButton.textContent = 'Searching...';

    try {
        statusMessage.textContent = `Loading ${name}...`;
        cardContainer.innerHTML = '';

        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${String(name).toLowerCase()}`);
        if (!response.ok) throw new Error('Pokémon not found');

        const data = await response.json();
        buildCard(data);

        // Show the actual Pokémon name in the search bar (not whatever was
        // typed/passed in, e.g. a dex number from the Random button) and
        // record it as the most recent search.
        const properName = data.name.charAt(0).toUpperCase() + data.name.slice(1);
        searchInput.value = properName;
        addToRecentSearches(data.name);

        statusMessage.textContent = `Loaded ${properName} successfully.`;

    } catch (error) {
        statusMessage.textContent = `Error: ${error.message}`;
    } finally {
        // Always re-enable the button when done
        searchButton.disabled = false;
        searchButton.textContent = 'Search 👈';
    }
}

function buildCard(data) {
    // Extract the values we need from the API data
    const name = data.name.charAt(0).toUpperCase() + data.name.slice(1);
    const id = `#${String(data.id).padStart(3, '0')}`;
    const primaryType = data.types[0].type.name;
    const typeCapitalized = primaryType.charAt(0).toUpperCase() + primaryType.slice(1);
    const sprite = data.sprites.other['official-artwork'].front_default || data.sprites.front_default;
    const height = `${(data.height / 10).toFixed(1)} M`;
    const weight = `${(data.weight / 10).toFixed(1)} Kg`;
    const ability = data.abilities[0].ability.name.charAt(0).toUpperCase() + data.abilities[0].ability.name.slice(1);

    // ⭐ THEME SWITCH — changes the whole page color based on the Pokémon's type
    // NOTE: assigning className wipes every other class on <body>, so the
    // side-artwork class has to be decided again right after the switch.
    document.body.className = `theme-${primaryType}`;
    applySideArtwork();

    // Build the stats bars HTML as a single string
    const statsHTML = data.stats.map(stat => `
        <div class="stat-row">
            <div class="stat-name">${stat.stat.name.toUpperCase()}</div>
            <div class="stat-bar-bg">
                <div class="stat-bar-fill" style="width: ${(stat.base_stat / 255) * 100}%"></div>
            </div>
            <div class="stat-number">${stat.base_stat}</div>
        </div>
    `).join('');

    // Build the ENTIRE card as one big HTML string and inject it
    cardContainer.innerHTML = `
        <div class="box">
            <div class="card-header">
                <div class="row-before-header">${primaryType.toUpperCase()} TYPE · POKÉDEX ENTRY</div>
                <div class="row-before-header">${id}</div>
            </div>

            <div class="card-hero">
                <div class="card-hero-left">
                    <div class="row-before-header">${typeCapitalized} type</div>
                    <h1>${name}</h1>
                    <span class="type-badge type-${primaryType}">${primaryType.toUpperCase()}</span>
                </div>
                <div class="card-hero-right">
                    <img id="pokemon-sprite" src="${sprite}" alt="${name}">
                </div>
            </div>

            <div class="card-stats-row">
                <div class="stat-box">
                    <div class="stat-label">Height</div>
                    <div class="stat-value">${height}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Weight</div>
                    <div class="stat-value">${weight}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Abilities</div>
                    <div class="stat-value">${ability}</div>
                </div>
            </div>

            <div class="stats-section">
                <div class="stats-header">
                    <div>
                        <div class="row-before-header">BATTLE PROFILE</div>
                        <h2>Base stats</h2>
                    </div>
                    <div class="endpoint-info">Source: API response</div>
                </div>
                <div class="stats-list">${statsHTML}</div>
            </div>
        </div>
    `;
}

// The stylesheet decides which types are "image types" by giving them an
// --icon-url (every other theme keeps --icon-url: none). So instead of
// hard-coding a list of types here, we simply ask the browser what the
// active theme resolved --icon-url to.
function applySideArtwork() {
    const iconUrl = getComputedStyle(document.body).getPropertyValue('--icon-url').trim();
    const hasArtwork = iconUrl !== '' && iconUrl !== 'none';

    // .has-side-icons = black page + the two full-height side panels at the
    // left/right edge of the window (they live outside #card-container, so the
    // photo is never drawn inside a card box again).
    document.body.classList.toggle('has-side-icons', hasArtwork);
}

// Event listeners
searchButton.addEventListener('click', () => {
    const name = searchInput.value.trim();
    if (name) fetchPokemon(name);
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const name = searchInput.value.trim();
        if (name) fetchPokemon(name);
    }
});

// Total number of Pokémon currently in the PokéAPI national dex
// (covers up to Gen 9 / Scarlet & Violet). Bump this as new games add more.
const POKEMON_COUNT = 1025;

randomButton.addEventListener('click', () => {
    const randomId = Math.floor(Math.random() * POKEMON_COUNT) + 1;
    fetchPokemon(randomId);
});

// Auto-load Mew on page open
fetchPokemon('mew');
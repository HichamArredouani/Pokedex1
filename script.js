const API_BASE_URL = 'https://pokeapi.co/api/v2/';
const POKEMON_SPRITE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-i/red-blue/';

let allPokemonData = []; 
let displayedPokemon = []; 
let currentGenerationId = 'all'; 
let currentSearchQuery = '';
let currentFilterType = 'all';
let typesCache = []; 

const generationSelect = document.getElementById('generation-select');
const pokemonListContainer = document.getElementById('pokemon-list');
const pokemonDetailModal = document.getElementById('pokemon-detail-modal');
const modalContentArea = document.getElementById('modal-content-area');
const closeModalButton = document.getElementById('close-modal');
const loadingScreen = document.getElementById('loading-screen');
const searchInput = document.getElementById('search-input');
const typeFilterSelect = document.getElementById('type-filter-select');
const noResultsMessage = document.getElementById('no-results-message');
const cookiesBanner = document.getElementById('cookies-banner');
const acceptCookiesButton = document.getElementById('accept-cookies');
const closeCookiesButton = document.getElementById('close-cookies');

function showLoading() {
    loadingScreen.classList.remove('hidden');
}

function hideLoading() {
    loadingScreen.classList.add('hidden');
}

function capitalize(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function getPokemonIdFromUrl(url) {
    const parts = url.split('/');
    return parts[parts.length - 2];
}

function getPokemonImageUrl(id) {
    return `${POKEMON_SPRITE_BASE_URL}${id}.png`;
}

function getTypeColorClass(type) {
    return `type-${type.toLowerCase()}`;
}

function checkCookieConsent() {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
        cookiesBanner.classList.remove('hidden');
    }
}

function setCookieConsent() {
    localStorage.setItem('cookieConsent', 'true');
    cookiesBanner.classList.add('hidden');
}

async function fetchGenerations() {
    try {
        const response = await fetch(`${API_BASE_URL}generation/`);
        if (!response.ok) throw new Error('Generaties niet gevonden.');
        const data = await response.json();

        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'Alle Pokémon';
        generationSelect.appendChild(allOption);

        data.results.forEach((gen, index) => {
            const option = document.createElement('option');
            option.value = gen.url; 
            option.textContent = `Generatie ${index + 1}`;
            generationSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Fout bij het laden van generaties:", error);
        alert("Kon de Pokémon generaties niet laden. Probeer het later opnieuw.");
    }
}

async function fetchAllPokemonBasic() {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}pokemon?limit=10000`); 
        if (!response.ok) throw new Error('Alle Pokémon niet gevonden.');
        const data = await response.json();
        allPokemonData = data.results.map(p => ({
            id: getPokemonIdFromUrl(p.url),
            name: p.name,
            url: p.url,
            types: [] 
        }));
    } catch (error) {
        console.error("Fout bij het laden van alle Pokémon:", error);
        alert("Kon alle Pokémon niet laden. Probeer het later opnieuw.");
        allPokemonData = [];
    } finally {
        hideLoading();
    }
}

async function fetchPokemonByGeneration(generationUrl) {
    showLoading();
    try {
        const response = await fetch(generationUrl);
        if (!response.ok) throw new Error(`Pokémon voor generatie niet gevonden: ${generationUrl}`);
        const data = await response.json();
        allPokemonData = data.pokemon_species.map(p => ({
            id: getPokemonIdFromUrl(p.url),
            name: p.name,
            url: `${API_BASE_URL}pokemon/${p.name}/`, 
            types: []
        })).sort((a, b) => a.id - b.id); 
        applyFiltersAndSort();
    } catch (error) {
        console.error("Fout bij het laden van Pokémon per generatie:", error);
        alert("Kon Pokémon voor deze generatie niet laden. Probeer het later opnieuw.");
        allPokemonData = [];
    } finally {
        hideLoading();
    }
}

async function fetchPokemonTypes() {
    try {
        const response = await fetch(`${API_BASE_URL}type/`);
        if (!response.ok) throw new Error('Types niet gevonden.');
        const data = await response.json();
        typesCache = data.results.filter(type => type.name !== 'unknown' && type.name !== 'shadow'); 
        typesCache.forEach(type => {
            const option = document.createElement('option');
            option.value = type.name;
            option.textContent = capitalize(type.name);
            typeFilterSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Fout bij het laden van Pokémon types:", error);
    }
}

async function fetchPokemonDetails(pokemonName) {
    showLoading();
    try {

        const pokemonResponse = await fetch(`${API_BASE_URL}pokemon/${pokemonName}/`);
        if (!pokemonResponse.ok) throw new Error(`Details van Pokémon ${pokemonName} niet gevonden.`);
        const pokemonData = await pokemonResponse.json();


        const speciesResponse = await fetch(`${API_BASE_URL}pokemon-species/${pokemonName}/`);
        if (!speciesResponse.ok) throw new Error(`Soort details van Pokémon ${pokemonName} niet gevonden.`);
        const speciesData = await speciesResponse.json();

        hideLoading();
        return { pokemonData, speciesData };
    } catch (error) {
        console.error("Fout bij het laden van Pokémon details:", error);
        alert(`Kon details van Pokémon ${pokemonName} niet laden. Probeer het later opnieuw.`);
        hideLoading();
        return null;
    }
}
function renderPokemonList(pokemonArray) {
    pokemonListContainer.innerHTML = ''; 
    if (pokemonArray.length === 0) {
        noResultsMessage.classList.remove('hidden');
        return;
    } else {
        noResultsMessage.classList.add('hidden');
    }

    pokemonArray.forEach(pokemon => {
        const pokemonCard = document.createElement('div');
        pokemonCard.className = 'pokemon-card flex flex-col items-center p-4 text-center transform hover:scale-105 transition-transform duration-300 ease-in-out';
        pokemonCard.setAttribute('role', 'button');
        pokemonCard.setAttribute('aria-label', `Bekijk details van ${capitalize(pokemon.name)}`);
        pokemonCard.tabIndex = 0; 
        const imageUrl = getPokemonImageUrl(pokemon.id);
        const fallbackImageUrl = `https://placehold.co/150x150/EEEEEE/333333?text=${pokemon.id}`;

        pokemonCard.innerHTML = `
            <img src="${imageUrl}" alt="${capitalize(pokemon.name)} officiële kunstwerk" class="w-28 h-28 object-contain mb-2" onerror="this.onerror=null; this.src='${fallbackImageUrl}'">
            <p class="text-xs text-gray-500 font-semibold mb-1">#${String(pokemon.id).padStart(3, '0')}</p>
            <h2 class="text-xl font-bold text-gray-800 mb-2">${capitalize(pokemon.name)}</h2>
            <div class="flex flex-wrap justify-center gap-2">
                <!-- Types will be fetched and added on demand -->
            </div>
        `;

        if (pokemon.types && pokemon.types.length > 0) {
            const typesDiv = pokemonCard.querySelector('.flex.flex-wrap');
            pokemon.types.forEach(typeInfo => {
                const typeBadge = document.createElement('span');
                typeBadge.className = `type-badge ${getTypeColorClass(typeInfo.type.name)}`;
                typeBadge.textContent = capitalize(typeInfo.type.name);
                typesDiv.appendChild(typeBadge);
            });
        }

        pokemonCard.addEventListener('click', () => showPokemonDetail(pokemon.name));
        pokemonCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { 
                e.preventDefault();
                showPokemonDetail(pokemon.name);
            }
        });
        pokemonListContainer.appendChild(pokemonCard);
    });
}

async function showPokemonDetail(pokemonName) {
    const data = await fetchPokemonDetails(pokemonName);
    if (!data) return;

    const { pokemonData, speciesData } = data;

    const flavorTextEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'nl') ||
                            speciesData.flavor_text_entries.find(entry => entry.language.name === 'en');
    const flavorText = flavorTextEntry ? flavorTextEntry.flavor_text.replace(/\n/g, ' ').replace(/\f/g, ' ') : 'Geen beschrijving beschikbaar.';

    const abilities = pokemonData.abilities.map(ability => capitalize(ability.ability.name)).join(', ');

    const typesHtml = pokemonData.types.map(typeInfo => `
        <span class="type-badge ${getTypeColorClass(typeInfo.type.name)}">${capitalize(typeInfo.type.name)}</span>
    `).join('');

    modalContentArea.innerHTML = `
        <img src="${getPokemonImageUrl(pokemonData.id)}" alt="${capitalize(pokemonData.name)} officiële kunstwerk" class="w-48 h-48 md:w-64 md:h-64 object-contain mb-4 md:mb-0 rounded-lg shadow-md" onerror="this.onerror=null; this.src='https://placehold.co/200x200/EEEEEE/333333?text=${pokemonData.id}'">
        <div class="flex-grow text-gray-800">
            <h2 class="text-4xl font-bold mb-2 text-red-600">${capitalize(pokemonData.name)}</h2>
            <p class="text-lg text-gray-600 mb-4">#${String(pokemonData.id).padStart(3, '0')}</p>

            <div class="flex flex-wrap gap-2 mb-4">
                ${typesHtml}
            </div>

            <p class="text-base mb-2"><strong class="font-semibold">Gewicht:</strong> ${pokemonData.weight / 10} kg</p>
            <p class="text-base mb-2"><strong class="font-semibold">Hoogte:</strong> ${pokemonData.height / 10} m</p>
            <p class="text-base mb-4"><strong class="font-semibold">Vaardigheden:</strong> ${abilities}</p>

            <p class="text-sm italic text-gray-700 leading-relaxed">${flavorText}</p>

            <h3 class="text-xl font-bold mt-6 mb-3 text-red-500">Statistieken:</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                ${pokemonData.stats.map(stat => `
                    <div class="flex justify-between items-center bg-gray-100 p-2 rounded-md">
                        <span class="font-semibold text-gray-700">${capitalize(stat.stat.name.replace('-', ' '))}</span>
                        <span class="text-gray-900">${stat.base_stat}</span>
                        <div class="w-1/2 bg-gray-300 rounded-full h-2">
                            <div class="bg-blue-400 h-2 rounded-full" style="width: ${Math.min(100, (stat.base_stat / 255) * 100)}%;"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    pokemonDetailModal.classList.remove('hidden');
    pokemonDetailModal.setAttribute('aria-hidden', 'false');
    pokemonDetailModal.focus(); 
}

async function updateAllPokemonWithTypes() {
    showLoading();
    const fetchPromises = allPokemonData.map(async p => {
        try {
            const response = await fetch(`${API_BASE_URL}pokemon/${p.id}/`);
            if (!response.ok) {
                console.warn(`Could not fetch types for ${p.name}. Status: ${response.status}`);
                return { ...p, types: [] };
            }
            const data = await response.json();
            return { ...p, types: data.types };
        } catch (error) {
            console.warn(`Error fetching types for ${p.name}:`, error);
            return { ...p, types: [] };
        }
    });

    allPokemonData = await Promise.all(fetchPromises);

    hideLoading();
    applyFiltersAndSort(); 
}

function applyFiltersAndSort() {
    let filteredPokemon = [...allPokemonData];

    if (currentSearchQuery) {
        const searchLower = currentSearchQuery.toLowerCase();
        filteredPokemon = filteredPokemon.filter(p =>
            p.name.toLowerCase().includes(searchLower) ||
            String(p.id).padStart(3, '0').includes(searchLower)
        );
    }

    if (currentFilterType !== 'all') {
        filteredPokemon = filteredPokemon.filter(p =>
            p.types.some(typeInfo => typeInfo.type.name === currentFilterType)
        );
    }

    switch (localStorage.getItem('sortOrder') || 'index-asc') {
        case 'index-asc':
            filteredPokemon.sort((a, b) => a.id - b.id);
            break;
        case 'index-desc':
            filteredPokemon.sort((a, b) => b.id - a.id);
            break;
        case 'name-asc':
            filteredPokemon.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            filteredPokemon.sort((a, b) => b.name.localeCompare(a.name));
            break;
    }

    displayedPokemon = filteredPokemon;
    renderPokemonList(displayedPokemon);
}

generationSelect.addEventListener('change', async (e) => {
    currentGenerationId = e.target.value;
    if (currentGenerationId === 'all') {
        await fetchAllPokemonBasic(); 
        await updateAllPokemonWithTypes(); 
    } else {
        await fetchPokemonByGeneration(currentGenerationId);
        await updateAllPokemonWithTypes(); 
    }
});

searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.trim();
    applyFiltersAndSort();
});

typeFilterSelect.addEventListener('change', (e) => {
    currentFilterType = e.target.value;
    applyFiltersAndSort();
});

document.getElementById('sort-index-asc').addEventListener('click', () => {
    localStorage.setItem('sortOrder', 'index-asc');
    applyFiltersAndSort();
});
document.getElementById('sort-index-desc').addEventListener('click', () => {
    localStorage.setItem('sortOrder', 'index-desc');
    applyFiltersAndSort();
});
document.getElementById('sort-name-asc').addEventListener('click', () => {
    localStorage.setItem('sortOrder', 'name-asc');
    applyFiltersAndSort();
});
document.getElementById('sort-name-desc').addEventListener('click', () => {
    localStorage.setItem('sortOrder', 'name-desc');
    applyFiltersAndSort();
});

closeModalButton.addEventListener('click', () => {
    pokemonDetailModal.classList.add('hidden');
    pokemonDetailModal.setAttribute('aria-hidden', 'true');
});

pokemonDetailModal.addEventListener('click', (e) => {
    if (e.target === pokemonDetailModal) {
        pokemonDetailModal.classList.add('hidden');
        pokemonDetailModal.setAttribute('aria-hidden', 'true');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pokemonDetailModal.classList.contains('hidden')) {
        pokemonDetailModal.classList.add('hidden');
        pokemonDetailModal.setAttribute('aria-hidden', 'true');
    }
});

acceptCookiesButton.addEventListener('click', setCookieConsent);
closeCookiesButton.addEventListener('click', setCookieConsent);

window.onload = async () => {
    checkCookieConsent();
    await fetchGenerations();
    await fetchPokemonTypes();
    await fetchAllPokemonBasic();
    await updateAllPokemonWithTypes();
};
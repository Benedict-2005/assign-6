console.log('Checking Frappe Charts:', typeof frappe !== 'undefined' ? 'Frappe is loaded' : 'Frappe is NOT loaded');

const API_URL = 'https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px';
let chartInstance = null; // Store the chart instance globally
let originalData = null; // Store the original API data
let predictedYears = [];
let predictedValues = [];
let validCodes = []; // Store valid municipality codes fetched from API
let validNames = []; // Store valid municipality names fetched from API
let codeToNameMap = {}; // Map codes to names
let nameToCodeMap = {}; // Map names to codes

// Fetch valid municipality codes and names from the API
async function fetchValidCodes() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        
        // Extract the Area (Alue) codes and names from the API response
        const areaVariable = data.variables.find(variable => variable.code === "Alue");
        if (areaVariable && areaVariable.values && areaVariable.valueTexts) {
            validCodes = areaVariable.values;
            validNames = areaVariable.valueTexts;
            
            // Create mapping between codes and names
            for (let i = 0; i < validCodes.length; i++) {
                codeToNameMap[validCodes[i]] = validNames[i];
                nameToCodeMap[validNames[i].toLowerCase()] = validCodes[i];
            }
            
            console.log('Valid municipality codes and names loaded:', validCodes.length, 'entries');
        } else {
            console.error('Could not find Area codes/names in API response');
        }
    } catch (error) {
        console.error('Error fetching valid codes:', error);
        // Fallback: allow "whole country" and basic validation
        validCodes = ["SSS"];
        validNames = ["WHOLE COUNTRY"];
        codeToNameMap = {"SSS": "WHOLE COUNTRY"};
        nameToCodeMap = {"whole country": "SSS"};
    }
}

function validateMunicipalityCode(municipality) {
    const input = municipality.trim().toLowerCase();
    
    // Check if it's "whole country" (case insensitive)
    if (input === "whole country") {
        return true;
    }
    
    // Check if valid codes have been loaded
    if (validCodes.length === 0) {
        console.warn('Valid codes not loaded yet, allowing input');
        return true; // Allow if codes haven't been loaded yet
    }
    
    // Check if it's a valid municipality code (case insensitive)
    if (validCodes.includes(municipality.toUpperCase())) {
        return true;
    }
    
    // Check if it's a valid municipality name (case insensitive)
    if (nameToCodeMap.hasOwnProperty(input)) {
        return true;
    }
    
    return false;
}

// Convert municipality name to code for API calls
function getMunicipalityCode(municipality) {
    const input = municipality.trim().toLowerCase();
    
    // Handle "whole country" case
    if (input === "whole country") {
        return "SSS";
    }
    
    // If it's already a code, return it uppercase
    if (validCodes.includes(municipality.toUpperCase())) {
        return municipality.toUpperCase();
    }
    
    // If it's a name, convert to code
    if (nameToCodeMap.hasOwnProperty(input)) {
        return nameToCodeMap[input];
    }
    
    // Fallback: return input as-is
    return municipality.toUpperCase();
}

async function fetchData(municipality) {
    const requestBody = {
        "query": [
            {
                "code": "Vuosi",
                "selection": {
                    "filter": "item",
                    "values": ["2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021"]
                }
            },
            {
                "code": "Alue",
                "selection": {
                    "filter": "item",
                    "values": [municipality === "SSS" || municipality.toLowerCase() === "whole country" ? "SSS" : municipality]
                }
            },
            {
                "code": "Tiedot",
                "selection": {
                    "filter": "item",
                    "values": ["vaesto"]
                }
            }
        ],
        "response": {
            "format": "json-stat"
        }
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        console.log('API Response:', data);
        originalData = data; // Store the data for reuse
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

function renderChart(data, predictedYears = [], predictedValues = []) {
    if (!window.frappe) {
        console.error('Frappe Charts is not available');
        alert('Error: Chart library failed to load. Please check your setup.');
        return;
    }

    if (!data || !data.dataset || !data.dataset.value) {
        console.error('Invalid data structure:', data);
        alert('Error: Failed to load population data.');
        return;
    }

    const labels = ["2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021", ...predictedYears];
    const chartData = {
        labels: labels,
        datasets: [
            {
                name: "Population",
                values: [...data.dataset.value, ...predictedValues]
            }
        ]
    };

    // Get display name for chart title
    const inputValue = document.getElementById('input-area').value || "whole country";
    const municipalityCode = getMunicipalityCode(inputValue);
    const displayName = codeToNameMap[municipalityCode] || inputValue;

    chartInstance = new frappe.Chart("#chart", {
        title: "Population growth in " + displayName,
        data: chartData,
        type: 'line',
        height: 450,
        colors: ['#eb5146'],
        lineOptions: {
            regionFill: 0,
            dotSize: 4,
            hideDots: 0
        },
        valuesOverPoints: 0
    });
}

document.getElementById('dataForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const municipalityInput = document.getElementById('input-area').value.trim() || "whole country";
    
    // Validate the municipality code or name
    if (!validateMunicipalityCode(municipalityInput)) {
        alert(`Error: Invalid municipality code or name "${municipalityInput}". Please enter a valid municipality code, name, or "whole country".`);
        return;
    }
    
    // Convert to proper code for API call
    const municipalityCode = getMunicipalityCode(municipalityInput);
    predictedYears = []; // Reset predictions on new submission
    predictedValues = [];
    const data = await fetchData(municipalityCode);
    if (data) renderChart(data);
});

document.getElementById('add-data').addEventListener('click', () => {
    if (!chartInstance) {
        console.error('Chart not initialized');
        alert('Error: Please submit the form to load a chart before adding data.');
        return;
    }

    if (!originalData || !originalData.dataset || !originalData.dataset.value) {
        console.error('No original data available');
        alert('Error: No data available to predict.');
        return;
    }

    const values = [...originalData.dataset.value, ...predictedValues];
    if (values.length < 2) {
        console.error('Not enough data to predict');
        alert('Error: Not enough data to make a prediction.');
        return;
    }

    let deltaSum = 0;
    for (let i = 1; i < values.length; i++) {
        deltaSum += values[i] - values[i - 1];
    }
    const meanDelta = deltaSum / (values.length - 1);
    const newValue = values[values.length - 1] + meanDelta; // Subtract mean delta

    const lastYear = parseInt(predictedYears[predictedYears.length - 1] || '2021') || 2021;
    if (predictedYears.length >= 5) {
        alert('Maximum of 5 predicted years reached.');
        return;
    }

    predictedYears.push((lastYear + 1).toString());
    predictedValues.push(newValue);

    renderChart(originalData, predictedYears, predictedValues);
});

// Automatically query "whole country" on page load and fetch valid codes
document.addEventListener('DOMContentLoaded', async () => {
    // First, fetch the valid municipality codes
    await fetchValidCodes();
    
    // Then load the default chart
    document.getElementById('input-area').value = "whole country"; // Set input value
    const data = await fetchData("whole country");
    if (data) renderChart(data);
});
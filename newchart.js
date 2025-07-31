console.log('Checking Frappe Charts in newchart:', typeof frappe !== 'undefined' ? 'Frappe is loaded' : 'Frappe is NOT loaded');

const API_URL = 'https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px';

// Get municipality from URL parameters
function getMunicipalityFromURL() {
    const params = new URLSearchParams(window.location.search);
    const municipality = params.get('municipality') || 'SSS';
    const name = params.get('name') || 'whole country';
    return { code: municipality, name: name };
}

async function fetchBirthDeathData(type, municipalityCode) {
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
                    "values": [municipalityCode]
                }
            },
            {
                "code": "Tiedot",
                "selection": {
                    "filter": "item",
                    "values": [type === 'birth' ? "vm01" : "vm11"]
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
        console.log(`API Response for ${type}:`, data);
        return data.dataset.value;
    } catch (error) {
        console.error(`Error fetching ${type} data:`, error);
        return null;
    }
}

async function renderBirthDeathChart() {
    if (!window.frappe) {
        console.error('Frappe Charts is not available');
        alert('Error: Chart library failed to load. Please check your setup.');
        return;
    }

    const municipality = getMunicipalityFromURL();
    console.log('Rendering chart for municipality:', municipality);

    const birthData = await fetchBirthDeathData('birth', municipality.code);
    const deathData = await fetchBirthDeathData('death', municipality.code);

    if (!birthData || !deathData) {
        console.error('Failed to load birth or death data');
        alert('Error: Failed to load birth or death data.');
        return;
    }

    const chartData = {
        labels: ["2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021"],
        datasets: [
            { name: "Births", values: birthData, chartType: 'bar' },
            { name: "Deaths", values: deathData, chartType: 'bar' }
        ]
    };

    new frappe.Chart("#birthChart", {
        title: "Births and deaths in " + municipality.name,
        data: chartData,
        type: 'bar',
        height: 450,
        colors: ['#63d0ff', '#363636']
    });
}

renderBirthDeathChart();
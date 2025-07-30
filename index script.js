
        async function fetchData(areaCode) {
            const response = await fetch('https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
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
                                "values": [areaCode || "SSS"]
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
                        "format": "json-stat2"
                    }
                })
            });
            const data = await response.json();
            return data.dataset.value;
        }

        async function updateChart() {
            const input = document.getElementById('input-area').value.toLowerCase();
            let areaCode = "SSS"; // Default to whole country
            if (input && input !== "whole country") {
                const codesResponse = await fetch('https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px');
                const codesData = await codesResponse.json();
                const areas = codesData.variables[1].values;
                const names = codesData.variables[1].valueTexts;
                const index = names.findIndex(name => name.toLowerCase() === input);
                if (index !== -1) areaCode = areas[index];
            }
            const data = await fetchData(areaCode);
            const years = Array.from({length: 22}, (_, i) => 2000 + i);
            const chartData = {
                labels: years,
                datasets: [{ values: data }]
            };
            new frappe.Chart("#chart", {
                title: "Population growth in " + (input || "whole country"),
                data: chartData,
                type: 'line',
                height: 450,
                colors: ['#eb5146']
            });
        }

        document.getElementById('submit-data').addEventListener('click', updateChart);

        updateChart();

        document.getElementById('add-data').addEventListener('click', async () => {
            const data = await fetchData(document.getElementById('input-area').value.toLowerCase() === "whole country" ? "SSS" : undefined);
            const deltas = data.slice(1).map((v, i) => v - data[i]);
            const meanDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
            const newValue = data[data.length - 1] + meanDelta;
            data.push(newValue);
            updateChart();
        });
  
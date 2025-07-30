
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
                                "values": ["vm01", "vm11"]
                            }
                        }
                    ],
                    "response": {
                        "format": "json-stat2"
                    }
                })
            });
            const data = await response.json();
            const births = data.dataset.value.filter((_, i) => i % 2 === 0);
            const deaths = data.dataset.value.filter((_, i) => i % 2 === 1);
            return { births, deaths };
        }

        async function updateChart() {
            const input = document.getElementById('input-area') ? document.getElementById('input-area').value.toLowerCase() : "whole country";
            let areaCode = "SSS"; // Default to whole country
            if (input && input !== "whole country") {
                const codesResponse = await fetch('https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px');
                const codesData = await codesResponse.json();
                const areas = codesData.variables[1].values;
                const names = codesData.variables[1].valueTexts;
                const index = names.findIndex(name => name.toLowerCase() === input);
                if (index !== -1) areaCode = areas[index];
            }
            const { births, deaths } = await fetchData(areaCode);
            const years = Array.from({length: 22}, (_, i) => 2000 + i);
            const chartData = {
                labels: years,
                datasets: [
                    { name: 'Births', values: births, chartType: 'bar' },
                    { name: 'Deaths', values: deaths, chartType: 'bar' }
                ]
            };
            new frappe.Chart("#chart", {
                title: "Births and deaths in " + (input || "whole country"),
                data: chartData,
                type: 'bar',
                height: 450,
                colors: ['#63d0ff', '#363636']
            });
        }

        updateChart();

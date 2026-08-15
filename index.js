const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000 ;
 ///https://s1.chess-results.com/tnr1431248.aspx?lan=2&art=9&fed=ARG&turdet=YES&snr=17&SNode=S0
const baseUrl =  'https://s1.chess-results.com/tnr1431248.aspx?lan=2&art=9&fed=ARG&turdet=YES&snr=';
const baseUrl1 ='&SNode=S0';
//'https://archive.chess-results.com/tnr774957.aspx?lan=2&art=9&fed=ARG&turdet=YES&flag=30&snr=';
const playerPositions = [17,20,22,27,29,30,31,35,36,37,41,45,46,47,48,49,50,53,56,59,60,61,62,63,65,66,67,68,69,70,71,72,73,74];

const fetchPlayerDetails = async (position) => {
    try{
        const { data } = await axios.get(`${baseUrl}${position}${baseUrl1}`);
        const $ = cheerio.load(data);
        const table = $('table.CRs1');

        const extractData = (label) => table.find(`td.CR:contains(${label})`).next().text().trim();

        return {
            name: extractData('Nombre'),
            initialRanking: extractData('Ranking inicial'),
            internationalElo: extractData('Elo internacional'),
            points: extractData('Puntos'),
            position: extractData('Puesto'),
            federation: extractData('Federación')
        };
    } catch (error) {
        console.error('Error fetching player details:', error);
        return null;
    }
};

const fetchTableData = async (position) => {
    try {
        const { data } = await axios.get(`${baseUrl}${position}${baseUrl1}`);
        const $ = cheerio.load(data);
        const rows = $('table.CRs1 tr.CRng1, table.CRs1 tr.CRng2');
        const tableData = [];

        rows.each((index, element) => {
            const cells = $(element).find('td');

            // la celda de resultado incluye el div con el color
            const resultCell = $(cells[8]);
            let color = '';
            if (resultCell.find('.FarbewT').length) {
                color = 'Blancas';
            } else if (resultCell.find('.FarbesT').length) {
                color = 'Negras';
            }

            // el resultado es el texto después del div
            const result = resultCell.text().trim();

            tableData.push({
                round: $(cells[0]).text().trim(),
                board: $(cells[1]).text().trim(),
                initialNo: $(cells[2]).text().trim(),
                name: $(cells[4]).text().trim(),
                elo: $(cells[5]).text().trim(),
                federation: $(cells[6]).text().trim(),
                points: $(cells[7]).text().trim(),
                color,   // 👈 nuevo campo
                result,  // 👈 ya limpio
                kFactor: $(cells[9]).text().trim(),
                eloChange: $(cells[10]).text().trim()
            });
        });

        return tableData;
    } catch (error) {
        console.error('Error fetching table data:', error);
        return [];
    }
};

app.use(express.static(path.join(__dirname, 'public')));

app.get('/jugadores', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/api/jugadores', async (req, res) => {
    try {
        const players = await Promise.all(playerPositions.map(fetchPlayerDetails));
        const validPlayers = players.filter(player => player !== null);

        validPlayers.sort((a, b) => parseInt(a.position, 10) - parseInt(b.position, 10));

        res.json(validPlayers);
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ error: 'Error fetching players' });
    }
});

app.get('/fetch-data', async (req, res) => {
    const position = req.query.position;
    if (position) {
        const tableData = await fetchTableData(position);
        res.json(tableData);
    } else {
        res.status(400).json({ error: 'Invalid position' });
    }
});

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

const baseUrl =  'https://chess-results.com/tnr952958.aspx?lan=2&art=9&fed=ARG&turdet=YES&flag=30&snr=';
//'https://archive.chess-results.com/tnr774957.aspx?lan=2&art=9&fed=ARG&turdet=YES&flag=30&snr=';
const playerPositions = [71,74, 85, 90, 93, 97, 101, 104, 110,119,120,121,122, 123, 124,125,126 ];

const fetchPlayerDetails = async (position) => {
    try {
        const { data } = await axios.get(`${baseUrl}${position}`);
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
        const { data } = await axios.get(`${baseUrl}${position}`);
        const $ = cheerio.load(data);
        const rows = $('table.CRs1 tr.CRng1, table.CRs1 tr.CRng2');
        const tableData = [];

        rows.each((index, element) => {
            const cells = $(element).find('td');
            tableData.push({
                round: $(cells[0]).text().trim(),
                board: $(cells[1]).text().trim(),
                initialNo: $(cells[2]).text().trim(),
                name: $(cells[4]).text().trim(),
                elo: $(cells[5]).text().trim(),
                federation: $(cells[6]).text().trim(),
                points: $(cells[7]).text().trim(),
                result: $(cells[8]).text().trim(),
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

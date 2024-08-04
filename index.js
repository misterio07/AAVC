const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Base URL de la página de resultados, con un marcador de posición para el número de jugador
const baseUrl = 'https://chess-results.com/tnr952958.aspx?lan=2&art=9&fed=ARG&turdet=YES&flag=30&snr=';
//https://archive.chess-results.com/tnr774957.aspx?lan=2&art=9&fed=ARG&turdet=YES&flag=30&snr=';

//https://chess-results.com/tnr952958.aspx?lan=2&art=9&fed=ARG&turdet=YES&flag=30&snr='
// Lista de posiciones de los jugadores
const playerPositions = [76,78,87,91,92,95,97,100,101,103,110,111,113]; // Actualiza esta lista con las posiciones de jugadores que deseas consultar


const fetchPlayerDetails = async (position) => {
    try {
        const { data } = await axios.get(`${baseUrl}${position}`);
        const $ = cheerio.load(data);

        // Seleccionar la tabla con la clase "CRs1"
        const table = $('table.CRs1');

        // Función para extraer datos de la tabla
        const extractData = (label) => {
            return table.find(`td.CR:contains(${label})`).next().text().trim();
        };

        const player = {
            name: extractData('Nombre'),
            title: extractData('Título'),
            initialRanking: extractData('Ranking inicial'),
            elo: extractData('Elo'),
            nationalElo: extractData('Elo nacional'),
            internationalElo: extractData('Elo internacional'),
            points: extractData('Puntos'),
            position: extractData('Puesto'),
            federation: extractData('Federación'),
            nationalCode: extractData('Código nacional'),
            fideCode: extractData('Código FIDE'),
            birthYear: extractData('Fecha de nacimiento')
        };

        return player;
    } catch (error) {
        console.error('Error fetching player details:', error);
        return null;
    }
};

// Servir archivos estáticos (como el archivo HTML)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/jugadores', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/api/jugadores', async (req, res) => {
    try {
        const players = await Promise.all(playerPositions.map(pos => fetchPlayerDetails(pos)));
        const validPlayers = players.filter(player => player !== null);

        // Ordenar por puesto, convirtiendo la cadena a número entero para comparación
        validPlayers.sort((a, b) => parseInt(a.position, 10) - parseInt(b.position, 10));

        res.json(validPlayers);
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ error: 'Error fetching players' });
    }
});
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

require('dotenv').config()
const { WebSocket, WebSocketServer } = require('ws');
var SpotifyWebApi = require('spotify-web-api-node')
let tokenExpirationEpoch;

var spotifyApi = new SpotifyWebApi({
	clientId: process.env.SPOTIFY_CLIENT_ID,
	clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
	redirectUri: process.env.SPOTIFY_REDIRECT_URI
})

spotifyApi.setRefreshToken(process.env.REFRESH_TOKEN);

function newToken() {
	console.log('Refreshing token')
	spotifyApi.setRefreshToken(process.env.REFRESH_TOKEN);
	spotifyApi.refreshAccessToken().then(
		function(data) {
			console.log('The access token has been refreshed!');
	  
			// Save the access token so that it's used in future calls
			spotifyApi.setAccessToken(data.body['access_token']);
	
			tokenExpirationEpoch =
				new Date().getTime() / 1000 + data.body['expires_in'];
	
			console.log(
				'Refreshed token. It expires in ' +
				Math.floor(tokenExpirationEpoch - new Date().getTime() / 1000) +
				' seconds!'
			);
		},
		function(err) {
			console.log('Could not refresh access token', err);
		}
	);
}

newToken();

var lastSongs = ["", ""];

module.exports = {
	spotifyApi,
	newToken,
	lastSongs
}

var funcs = require('./funcs')

tokenRefreshInterval = setInterval(newToken, 1000 * 60 * 59);

const wss = new WebSocketServer({
	port: 35678
});

async function songLoop() {
	try {
		let name = await funcs.getPlayingSongName()
		if (name != lastSongs[1]) {
			wss.clients.forEach(function each(client) {
				if (client.readyState === WebSocket.OPEN) {
					client.send(JSON.stringify({type: 'updatedSong', song: name}));
				}
			});
		}
	} catch(e) {}
}

wss.on('connection', async function connection(ws) {
	ws.on('message', function incoming(message) {
		console.log('received: %s', message);
	});

	ws.send(await funcs.getPlayingSongName())
});

tokenRefreshInterval = setInterval(async () => { songLoop() }, 5 * 10 * 60);
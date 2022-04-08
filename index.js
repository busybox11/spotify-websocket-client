// Initialize the .env file and the environment variables of the user
require('dotenv').config()

const { WebSocket, WebSocketServer } = require('ws')
var SpotifyWebApi = require('spotify-web-api-node')

let tokenExpirationEpoch

// Set all constants of the API from the .env file (or environment variables)
var spotifyApi = new SpotifyWebApi({
	clientId: process.env.SPOTIFY_CLIENT_ID,
	clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
	redirectUri: process.env.SPOTIFY_REDIRECT_URI
})

// Set the refresh token from the .env file (or environment variables)
// If that doesn't work, it means that the user either hasn't logged in
// properly, or at all, and thus needs to do it to set the refresh token
spotifyApi.setRefreshToken(process.env.REFRESH_TOKEN)

function newToken() {
	// Function that refreshes the access token
	// Called every 59 minutes, and when needed (startup, some errors)
	console.log('Refreshing token')

	// Set the refresh token from the environment, just in case
	spotifyApi.setRefreshToken(process.env.REFRESH_TOKEN)
	spotifyApi.refreshAccessToken().then(
		function(data) {	  
			// Save the access token so that it's used in future calls
			spotifyApi.setAccessToken(data.body['access_token'])
	
			/* 
			// Save the expiration time to know when is the token expiring,
			// just in case
			tokenExpirationEpoch =
				new Date().getTime() / 1000 + data.body['expires_in']
	
			// Logs that the token has been refreshed, with the expiration time
			// showed in seconds
			console.log(
				'Refreshed token. It expires in ' +
				Math.floor(tokenExpirationEpoch - new Date().getTime() / 1000) +
				' seconds!'
			)
			*/
		},
		function(err) {
			console.log('Could not refresh access token', err)
		}
	)
}

// Renew the token at each startup
newToken()

// Initialize an empty last songs array containing the last played track
// and its artist
var lastSongs = ["", ""]

module.exports = {
	spotifyApi,
	newToken,
	lastSongs
}

var funcs = require('./funcs')

// Refreshes the access token every 59 minutes, the limit of use being
// at 60 (1 hour)
tokenRefreshInterval = setInterval(newToken, 1000 * 60 * 59)

// Host the server's websocket on the port 35678
const wss = new WebSocketServer({
	port: 35678
})

async function songLoop() {
	// Function called every 3 seconds to check the currently playing song
	try {
		// Tries to get the song, if it doesn't work, skip the request
		let data = await funcs.getPlayingData()
		let name = await funcs.getPlayingSongName(data)
		if (name != lastSongs[1]) {
			wss.clients.forEach(function each(client) {
				// Send to every websocket client the song formatted in JSON with the
				// type 'updatedSong', recognized as a periodic check
				if (client.readyState === WebSocket.OPEN) {
					client.send(JSON.stringify(
						{
							type: 'updatedSong',
							song: name,
							artist: data.item.artists[0].name,
							name: data.item.name,
							albumArt: data.item.album.images[0].url,
							id: data.item.id
						}
					))
				}
			})
		}
	} catch(e) {}
}

wss.on('connection', async function connection(ws) {
	// When a new client is connecting
	ws.on('message', async function incoming(message) {
		// When a client sends a message to the websocket
		console.log('received: %s', message)
		msg = JSON.parse(message)

		// If the message type is a control action,
		// use the controls handler to trigger the wanted action
		if (msg.type == "controls") {
			// Awaiting the controls handler because we need to send the
			// new song info right after it, thus we want the handler to
			// be blocking
			await funcs.controls(msg.data)
			songLoop()
		}
	})

	// Send the currently playing song to the new client only
	let data = await funcs.getPlayingData()
	ws.send(JSON.stringify(
		{
			type: 'updatedSong',
			song: await funcs.getPlayingSongName(data),
			artist: data.item.artists[0].name,
			name: data.item.name,
			albumArt: data.item.album.images[0].url,
			id: data.item.id
		}
	))
})

songLoopInterval = setInterval(async () => { songLoop() }, 5 * 10 * 60)

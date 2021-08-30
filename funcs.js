const { spotifyApi, newToken, lastSongs } = require('./index')

async function getPlayingData() {
	try {
		let data = await spotifyApi.getMyCurrentPlaybackState()
		return data.body
	} catch(e) {
		console.log('Something went wrong!', e);
		try {
			newToken();
		} catch(e) {}
	}
}

async function getPlayingSongName() {
	let data = await getPlayingData()
	try {
		songName = `${data.item.name} - ${data.item.artists[0].name}`
	} catch(e) {
		songName = 'No song currently playing'
	}

	lastSongs[1] = lastSongs[0]
	lastSongs[0] = songName

	return songName
}

module.exports = {
	getPlayingData,
	getPlayingSongName
}
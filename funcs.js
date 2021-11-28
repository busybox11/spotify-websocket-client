const { spotifyApi, newToken, lastSongs } = require('./index')

async function getPlayingData() {
	try {
		// We try to get the currently playing state, and to return it
		let data = await spotifyApi.getMyCurrentPlaybackState()
		return data.body
	} catch(e) {
		// If it didn't worked, that means that the token might be expired,
		// thus we're renewing it.
		console.log('Something went wrong!', e)
		try {
			newToken()
		} catch(e) {}
	}
}

async function getPlayingSongName() {
	let data = await getPlayingData()

	// If we cannot get the playing track, that means there is no player
	// so we're returning a generic "Not playing" message
	try {
		songName = `${data.item.name} - ${data.item.artists[0].name}`
	} catch(e) {
		songName = 'No song currently playing'
	}

	lastSongs[1] = lastSongs[0]
	lastSongs[0] = songName

	return songName
}

async function controls(type) {
	// Music controls handler function
	try {
		// We're using a switch statement to handle all the controls
		// It is possible to go to the next and previous song, play/pause the
		// current one, and more to come later (like shuffle, repeat, volume)
		switch (type) {
			case "next":
				await spotifyApi.skipToNext()
				break
			case "previous":
				await spotifyApi.skipToPrevious()
				break
			case "playpause":
				let playbackState = await spotifyAPI.getMyCurrentPlaybackState()
				if (playbackState.body && playbackState.body.is_playing) {
					await spotifyApi.pause()
				} else {
					await spotifyApi.play()
				}
				break
		}
	} catch (e) {
		console.error(e)
	}
}

module.exports = {
	getPlayingData,
	getPlayingSongName,
	controls
}
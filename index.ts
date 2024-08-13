import "dotenv/config";
import { WebSocket, WebSocketServer } from "ws";
import SpotifyWebApi from "spotify-web-api-node";

// let tokenExpirationEpoch;

// Set all constants of the API from the .env file (or environment variables)
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

async function getPlayingData() {
  try {
    // We try to get the currently playing state, and to return it
    const data = await spotifyApi.getMyCurrentPlaybackState();
    return data.body;
  } catch (e) {
    // If it didn't worked, that means that the token might be expired,
    // thus we're renewing it.
    console.log("Something went wrong!", e);
    try {
      newToken();
    } catch (e) {
      console.error(e);
    }
  }
}

function getPlayingSongName(
  data: SpotifyApi.CurrentPlaybackResponse | undefined
) {
  // If we cannot get the playing track, that means there is no player
  // so we're returning a generic "Not playing" message
  let songName: string;

  if (!data || !data.item || data.item.type === "episode") {
    songName = "No song currently playing";
    return songName;
  }

  try {
    songName = `${data.item?.name} - ${data.item.artists[0].name}`;
  } catch (e) {
    console.error(e);
    songName = "No song currently playing";
  }

  lastSongs[1] = lastSongs[0];
  lastSongs[0] = songName;

  return songName;
}

async function controls(type) {
  // Music controls handler function
  try {
    // We're using a switch statement to handle all the controls
    // It is possible to go to the next and previous song, play/pause the
    // current one, and more to come later (like shuffle, repeat, volume)
    switch (type) {
      case "next":
        await spotifyApi.skipToNext();
        break;
      case "previous":
        await spotifyApi.skipToPrevious();
        break;
      case "playpause": {
        const playbackState = await spotifyApi.getMyCurrentPlaybackState();
        if (playbackState.body && playbackState.body.is_playing) {
          await spotifyApi.pause();
        } else {
          await spotifyApi.play();
        }
        break;
      }
    }
  } catch (e) {
    console.error(e);
  }
}

// Set the refresh token from the .env file (or environment variables)
// If that doesn't work, it means that the user either hasn't logged in
// properly, or at all, and thus needs to do it to set the refresh token
if (!process.env.REFRESH_TOKEN) {
  console.error("REFRESH_TOKEN not set");
  process.exit(1);
}
spotifyApi.setRefreshToken(process.env.REFRESH_TOKEN);

function newToken() {
  // Function that refreshes the access token
  // Called every 59 minutes, and when needed (startup, some errors)
  console.log("Refreshing token");

  // Set the refresh token from the environment, just in case
  if (!process.env.REFRESH_TOKEN) {
    console.error("REFRESH_TOKEN not set");
    process.exit(1);
  }
  spotifyApi.setRefreshToken(process.env.REFRESH_TOKEN);
  spotifyApi.refreshAccessToken().then(
    function (data) {
      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body["access_token"]);

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
    function (err) {
      console.log("Could not refresh access token", err);
    }
  );
}

// Renew the token at each startup
newToken();

// Initialize an empty last songs array containing the last played track
// and its artist, and the last playing position
const lastSongs = ["", ""];
let lastPosition = 0;
let lastIsPlaying = false;

// Refreshes the access token every 59 minutes, the limit of use being
// at 60 (1 hour)
// tokenRefreshInterval = setInterval(newToken, 1000 * 60 * 59);

// Host the server's websocket on the port 35678
const wss = new WebSocketServer({
  port: 35678,
});

function getOutputPlaybackObj(
  data: SpotifyApi.CurrentPlaybackResponse | undefined
) {
  if (!data || !data.item || data.item.type === "episode") {
    return null;
  }

  const song = getPlayingSongName(data);
  const albumArt = data.item.album.images[1]
    ? data.item.album.images[1].url
    : data.item.album.images[0].url;
  const artists = data.item.artists.map((artist) => artist.name).join(", ");

  return {
    type: "updatedSong",
    song,
    artist: artists,
    name: data.item.name,
    album: data.item.album.name,
    albumArt,
    id: data.item.id,
    preview: data.item.preview_url,
    progress: {
      playing: data.is_playing,
      current: data.progress_ms,
      duration: data.item.duration_ms,
    },
  };
}

async function songLoop() {
  // Function called every 3 seconds to check the currently playing song
  try {
    // Tries to get the song, if it doesn't work, skip the request
    const data = await getPlayingData();
    const playbackObj = getOutputPlaybackObj(data);

    if (!data) {
      return;
    }

    if (
      playbackObj?.song != lastSongs[1] ||
      Math.abs((data.progress_ms || 0) - lastPosition) > 5000 ||
      lastIsPlaying != data.is_playing
    ) {
      wss.clients.forEach(function each(client) {
        if (!data.item || data.item.type === "episode") {
          return;
        }

        // Send to every websocket client the song formatted in JSON with the
        // type 'updatedSong', recognized as a periodic check
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(playbackObj));
        } else {
          client.close();
        }
      });
    }

    // Register last playing position
    lastPosition = data.progress_ms || 0;
    lastIsPlaying = data.is_playing;
  } catch (e) {
    console.error(e);
  }
}

wss.on("connection", async function connection(ws) {
  // When a new client is connecting
  console.log("New client connected");

  ws.on("message", async function incoming(message) {
    // When a client sends a message to the websocket
    console.log("received: %s", message);
    const msg = JSON.parse(message.toString());

    // If the message type is a control action,
    // use the controls handler to trigger the wanted action
    if (msg.type == "controls") {
      // Awaiting the controls handler because we need to send the
      // new song info right after it, thus we want the handler to
      // be blocking
      await controls(msg.data);
      songLoop();
    }
  });

  // Send the currently playing song to the new client only
  const data = await getPlayingData();

  ws.send(JSON.stringify(getOutputPlaybackObj(data)));
});

setInterval(async () => {
  songLoop();
}, 5 * 10 * 60);

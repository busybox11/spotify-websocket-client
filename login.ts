// Initialize the .env file and the environment variables of the user
import "dotenv/config";

import readline from "readline";

import SpotifyWebApi from "spotify-web-api-node";

// Defines all scopes used by the server
const scopes = [
  "user-read-recently-played",
  "user-read-playback-position",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-follow-read",
  "user-follow-modify",
  "user-library-read",
  "user-library-modify",
  "playlist-modify-public",
  "playlist-modify-private",
];
const state = "login";

// Set all constants of the API from the .env file (or environment variables)
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

// Initialize a console input interface to get the user's inputs
// when needed
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log(
  "To login with your Spotify account, you have to open the following URL in a web browser:\n"
);
// Create an authorization URL for the user to access with their browser
// and then permits the server to get its refresh token
const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
console.log(authorizeURL);

console.log();
console.log(
  "Then, after granting the permissions and logging in, paste the URl you've been redirected to here:\n"
);
// Retrieve user input to get the URL they've been redirected to, containing
// the access code that permits to create a refresh token
rl.question("URL: ", (url) => {
  const urlcode = new URL(url);

  console.log();

  spotifyApi
    .authorizationCodeGrant(urlcode.searchParams.get("code") || "")
    .then(
      function (data) {
        // The refresh token has been created, and we're prompting the user
        // to paste it on the .env file
        console.log(
          `Paste this after REFRESH_TOKEN in the .env file:\n${data.body["refresh_token"]}`
        );
      },
      function (err) {
        // The refresh token wasn't able to be created, and we're showing
        // the error message of the request to the user, that permits the dev to
        // know what's going on for further debugging
        console.log("Something went wrong!", err);
      }
    );

  // Close the console input interface since it's not needed anymore
  rl.close();
});

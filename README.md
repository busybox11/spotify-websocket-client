# spotify-websocket-client

## How to use?

1. Create an app on [Spotify's developer portal](https://developer.spotify.com/). [Instructions on Spotify's official developer documentation and guides website}(https://developer.spotify.com/documentation/web-api/concepts/apps).

- You must set `http://localhost:35679/callback` as a valid Redirect URI.

2. Fill the required initial environment variables for login: `SPOTIFY_REDIRECT_URI`, `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`. Instructions below.
3. Install the dependencies.

- With NodeJS (most common) : `npm i`
- With pnpm : `pnpm i`
- With bun (recommended for high efficiency) : `bun i`

4. Run the login script (`login.js`) with node or bun and follow the instructions.
5. After filling the `REFRESH_TOKEN` environment variable, you can now run the `index.js` file to host the websocket server. Enjoy!

## Environment variables

- `SPOTIFY_REDIRECT_URI`: Keep the default - `http://localhost:35679/callback`. You must set this up as part of your app for the initial login process. (No callback server needs to be hosted at all times)
- `SPOTIFY_CLIENT_ID`: Your Spotify app Client ID. Can be found inside your app's page on Spotify's developer portal.
- `SPOTIFY_CLIENT_SECRET`: Your Spotify app Client Secret. Can be found below the Client ID inside your app's page on Spotify's developer portal. It will never be exposed to the clients.
- `REFRESH_TOKEN`: Will be setup as part of the initial login process when executing the `login.js` script.

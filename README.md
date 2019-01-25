# basecamp3-dumper

A simple node.js module to download all resources available to a basecamp 3 user.

```
export BC3_CLIENT_ID=<theintegrationclientid>
export BC3_CLIENT_SECRET=<theintegrationclientsecret>
export BC3_CLIENT_REDIRECT=<theintegrationredirecturl>

open "https://launchpad.37signals.com/authorization/new?type=web_server&response_type=code&redirect_uri=$BC3_CLIENT_REDIRECT&client_id=$BC3_CLIENT_ID"

export BC3_CODE=<thecodevisibleintheredirecturl>

export BC3_TOKEN=`curl -X POST "https://launchpad.37signals.com/authorization/token?type=web_server&client_id=$BC3_CLIENT_ID&redirect_uri=$BC3_CLIENT_REDIRECT&client_secret=$BC3_CLIENT_SECRET&code=$BC_CODE" | jq '.access_token'` ; echo "The token is $BC3_TOKEN"
```

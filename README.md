# WordleX

## How to start

```bash
# One-time setup
npm install
```

To start a tmux session (called `wordlex`) with everything you need:

```bash
make start
```

The game is now available at <http://(machine-name):8088/> and the admin screen is available at <http://(machine-name):8089/>

To stop the tmux session:

```bash
make stop
```

If you want to run each piece individually:

```bash
# Front-end
cd www
npx http-server -p 8088
```

```bash
# Front-end Admin
cd www-admin
npx http-server -p 8089
```

Be sure to update the admin password before running `main.js` below:

```bash
# Back-end
node main.js
```

## To Do

* Show modal to refresh the page if websocket connection can't be made/disconnects
* Can someone cheat by refreshing after knowing all the answers? (warn before page refresh)

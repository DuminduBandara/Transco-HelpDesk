// Entry point for cPanel's "Setup Node.js App" (Phusion Passenger).
// Passenger requires a plain Node.js file it can `require()` directly —
// it does not run `npm run start` for you. Passenger also injects the
// PORT it wants your app to listen on via process.env.PORT, so don't
// hardcode a port here.

const next = require("next");

const dev = false; // always production on cPanel
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app
  .prepare()
  .then(() => {
    require("http")
      .createServer((req, res) => handle(req, res))
      .listen(port, (err) => {
        if (err) throw err;
        console.log(`> Ready on port ${port}`);
      });
  })
  .catch((err) => {
    console.error("Error starting Next.js server:", err);
    process.exit(1);
  });
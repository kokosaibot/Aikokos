const http = require("http");

const PORT = Number(process.env.PORT || 3000);
const HOST = "0.0.0.0";

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, port: PORT }));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WORKING 🚀");
});

server.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

server.on("error", (err) => {
  console.error("SERVER ERROR:", err);
});

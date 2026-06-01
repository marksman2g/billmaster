const http = require("http");
const fs = require("fs");
const path = require("path");

const argPortIndex = process.argv.indexOf("--port");
const port = Number(process.env.PORT || (argPortIndex >= 0 ? process.argv[argPortIndex + 1] : 4176)) || 4176;
const host = process.env.HOST || "0.0.0.0";
const root = path.resolve(__dirname, "..");

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".md": "text/plain; charset=utf-8"
};

http.createServer((request, response) => {
  let pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname);
  if (pathname === "/") pathname = "/index.html";
  const file = path.resolve(root, `.${pathname}`);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  fs.readFile(file, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(data);
  });
}).listen(port, host, () => {
  console.log(`BillMaster preview: http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
});

const http = require("node:http");
const { spawn } = require("node:child_process");

function isPort3000Serving() {
  return new Promise((resolve) => {
    const req = http.get("http://localhost:3000", (res) => {
      res.resume();
      resolve(true);
    });

    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const running = await isPort3000Serving();

  if (running) {
    console.log("Ya hay un servidor respondiendo en http://localhost:3000");
    console.log("Usa esa instancia para trabajar localmente.");
    process.exit(0);
  }

  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(npmCmd, ["run", "dev:raw"], {
    stdio: "inherit",
    shell: false,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error("Error en local:dev:", error.message);
  process.exit(1);
});

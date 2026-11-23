async function main() {
  const [sRes, cRes] = await Promise.all([
    fetch("http://localhost:8080/api/v1/settings"),
    fetch("http://localhost:8080/api/v1/content"),
  ]);
  const s = await sRes.json();
  const c = await cRes.json();

  console.log("--- SETTINGS ---");
  console.log("logoUrl:", s.data?.logoUrl);
  console.log("builderEnabled:", s.data?.builderEnabled);

  console.log("\n--- CONTENT REFERENCES ---");
  const str = JSON.stringify(c, null, 2);
  const lines = str.split("\n");
  for (const line of lines) {
    if (
      line.includes("combined") ||
      line.includes("badge") ||
      line.includes("banner") ||
      line.includes("builder") ||
      line.includes("configurateur")
    ) {
      console.log(line.trim());
    }
  }
}
main().catch(console.error);

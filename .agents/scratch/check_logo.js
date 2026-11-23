async function check() {
  const res = await fetch("http://localhost:8080/api/v1/content");
  const c = await res.json();
  const raw = JSON.stringify(c);
  console.log("logoUrl in content?", raw.includes("logoUrl"));
  const m = raw.match(/"logoUrl":\s*"[^"]+"/g);
  console.log("Matches:", m);
}
check().catch(console.error);

/**
 * Bundles src/main.ts and inlines it with the stylesheet into one self-contained
 * HTML file: dist/index.html (no runtime dependencies besides Google Fonts).
 */
const result = await Bun.build({ entrypoints: ["src/main.ts"], minify: true, target: "browser", format: "iife" });
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
const js = await result.outputs[0].text();
const css = await Bun.file("src/styles/main.css").text();
const tpl = await Bun.file("index.html").text();
// Function replacers so "$" sequences in the bundle are not treated as patterns.
const html = tpl
  .replace("/*__CSS__*/", () => css)
  .replace("/*__JS__*/", () => js.replace(/<\/script/gi, "<\\/script"));
await Bun.write("dist/index.html", html);
console.log(`dist/index.html ${(html.length / 1024).toFixed(1)} kB`);

const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withFmtFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let podfile = fs.readFileSync(podfilePath, "utf8");

      if (podfile.includes("patch_fmt_consteval")) return config;

      const patchMethod = `
def patch_fmt_consteval(installer)
  fmt_base = File.join(__dir__, 'Pods', 'fmt', 'include', 'fmt', 'base.h')
  return unless File.exist?(fmt_base)
  content = File.read(fmt_base)
  return if content.include?('PATCHED_XCODE26')
  patched = content.sub(
    /#elif defined\\(__cpp_consteval\\)\\n#  define FMT_USE_CONSTEVAL 1/,
    "#elif defined(__cpp_consteval) \/\/ PATCHED_XCODE26\\n#  define FMT_USE_CONSTEVAL 0"
  )
  File.write(fmt_base, patched) if patched != content
end
`;

      // Add the method definition before the target block
      podfile = podfile.replace(
        /^(target\s)/m,
        patchMethod + "\n$1"
      );

      // Add the call inside post_install, before the closing "end"
      const lines = podfile.split("\n");
      const result = [];
      let inPostInstall = false;
      let inserted = false;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/post_install\s+do\s+\|installer\|/)) {
          inPostInstall = true;
        }
        if (inPostInstall && !inserted && lines[i].match(/^\s{2}end\s*$/)) {
          result.push("    patch_fmt_consteval(installer)");
          inserted = true;
          inPostInstall = false;
        }
        result.push(lines[i]);
      }

      fs.writeFileSync(podfilePath, result.join("\n"));
      return config;
    },
  ]);
}

module.exports = withFmtFix;

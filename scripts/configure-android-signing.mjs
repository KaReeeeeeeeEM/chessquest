import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const androidRoot = join("src-tauri", "gen", "android");
const gradlePath = join(androidRoot, "app", "build.gradle.kts");
const password = process.env.ANDROID_KEY_PASSWORD;
const alias = process.env.ANDROID_KEY_ALIAS;
const storeFile = process.env.ANDROID_KEYSTORE_PATH;

if (!password || !alias || !storeFile) {
  throw new Error("Android signing environment is incomplete.");
}

writeFileSync(
  join(androidRoot, "keystore.properties"),
  `storePassword=${password}\nkeyPassword=${password}\nkeyAlias=${alias}\nstoreFile=${storeFile}\n`,
  { mode: 0o600 },
);

let gradle = readFileSync(gradlePath, "utf8");
if (!gradle.includes('create("release")')) {
  gradle = `import java.io.FileInputStream\nimport java.util.Properties\n${gradle}`;
  const buildTypesAnchor = "    buildTypes {";
  const signingConfig = `    signingConfigs {\n        create("release") {\n            val propertiesFile = rootProject.file("keystore.properties")\n            val properties = Properties().apply {\n                FileInputStream(propertiesFile).use { load(it) }\n            }\n            keyAlias = properties["keyAlias"] as String\n            keyPassword = properties["keyPassword"] as String\n            storeFile = file(properties["storeFile"] as String)\n            storePassword = properties["storePassword"] as String\n        }\n    }\n\n`;
  if (!gradle.includes(buildTypesAnchor)) throw new Error("Android buildTypes block was not found.");
  gradle = gradle.replace(buildTypesAnchor, `${signingConfig}${buildTypesAnchor}`);
  const releaseAnchor = '        getByName("release") {';
  if (!gradle.includes(releaseAnchor)) throw new Error("Android release build type was not found.");
  gradle = gradle.replace(releaseAnchor, `${releaseAnchor}\n            signingConfig = signingConfigs.getByName("release")`);
  writeFileSync(gradlePath, gradle);
}

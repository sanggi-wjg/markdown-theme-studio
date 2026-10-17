// 버그성 규칙만(@eslint/js recommended). mts.js는 JCEF preview에 그대로 서빙되는 ES5 스타일 스크립트,
// tools/*.js는 CDP Runtime.evaluate로 주입되는 표현식이다. 저장소 루트에서 --config로 실행한다
// (package.json 스크립트) — 대상이 이 디렉터리 밖이라 루트를 기준 경로로 써야 한다
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";

export default defineConfig([
  {
    files: ["src/main/resources/themes/*.js", "tools/*.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2017,
      sourceType: "script",
      globals: { ...globals.browser },
    },
    rules: {
      // catch (e) { /* 저장 불가 무시 */ } 관례
      "no-unused-vars": ["error", { caughtErrors: "none" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
]);

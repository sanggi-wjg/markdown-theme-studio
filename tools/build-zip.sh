#!/usr/bin/env bash
# 배포 zip 빌드 + 패키징 검증.
# 사용법: tools/build-zip.sh
# 하는 일: test → buildPlugin → zip 안의 plugin.xml/리소스가 기대와 맞는지 검사 → 경로 출력.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain)" ]; then
  echo "경고: 커밋되지 않은 변경이 있음 — zip이 저장소 상태와 다를 수 있다" >&2
fi

./gradlew test buildPlugin

ver=$(sed -n 's/^version = "\(.*\)"$/\1/p' build.gradle.kts)
zip="build/distributions/markdown-theme-studio-${ver}.zip"
[ -f "$zip" ] || { echo "FAIL: ${zip} 없음 (build.gradle.kts version과 산출물 불일치)" >&2; exit 1; }

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
unzip -p "$zip" "markdown-theme-studio/lib/markdown-theme-studio-${ver}.jar" > "$tmp"
xml=$(unzip -p "$tmp" META-INF/plugin.xml)
entries=$(unzip -l "$tmp")

fail=0
check() { # check <설명> <패턴> <대상>
  if printf '%s' "$3" | grep -q "$2"; then
    printf '  OK   %s\n' "$1"
  else
    printf '  FAIL %s\n' "$1"
    fail=1
  fi
}

echo "패키징 검증:"
check "plugin.xml version=${ver}" "<version>${ver}</version>" "$xml"
check "since-build=251" 'since-build="251"' "$xml"
check "until-build 존재" 'until-build=' "$xml"
check "change-notes 존재" '<change-notes>' "$xml"
check "vendor url 존재" '<vendor url=' "$xml"
check "pluginIcon.svg" 'META-INF/pluginIcon\.svg' "$entries"
check "pluginIcon_dark.svg" 'META-INF/pluginIcon_dark\.svg' "$entries"
check "themes/mts.css" 'themes/mts\.css' "$entries"
check "themes/mts.js" 'themes/mts\.js' "$entries"

if [ "$fail" -ne 0 ]; then
  echo "패키징 검증 실패" >&2
  exit 1
fi
echo "zip 준비 완료: $(pwd)/${zip}"

#!/bin/bash
# 정적 렌더 하네스 스냅샷 갱신 — 번들 Markdown 렌더가 바뀌었을 때(compat 이슈 등) 다시 찍는다.
# 사용법: tools/static-harness/capture-all.sh <light|dark> [fixtures/x.md ...]
#   환경변수: LATEST_IDE_PATH(로컬 IDE 설치 경로, 없으면 runIdeLatest가 2026.2를 받는다),
#             MTS_CDP_PORT(기본 9223 — 다른 worktree 샌드박스와 병렬이면 바꾼다)
# 픽스처마다 샌드박스를 새로 띄운다 — IDE는 활성 탭의 preview만 만들고, 프로젝트를 열면 README가
# 활성 탭을 가져가며, 파일만 주면 LightEdit(preview 없음)로 열리기 때문에 픽스처 하나만 든 임시
# 프로젝트로 연다. 종료는 이 worktree의 샌드박스만 한다(설정 경로 인자 매칭).
set -u
LAF=${1:?light|dark}; shift
[ "$LAF" = light ] || [ "$LAF" = dark ] || { echo "LaF는 light|dark"; exit 2; }
ROOT=$(git -C "$(dirname "$0")" rev-parse --show-toplevel) || exit 1
PORT=${MTS_CDP_PORT:-9223}
PY=${PYTHON:-$ROOT/tools/.venv/bin/python}
[ -x "$PY" ] || { echo "python 없음: $PY (PYTHON=… 로 지정 — websocket-client 필요)"; exit 2; }
FIXTURES=("$@"); [ ${#FIXTURES[@]} -gt 0 ] || FIXTURES=(fixtures/elements.md fixtures/sample.md fixtures/english.md)
PAT="${ROOT:?}/.intellijPlatform/"
OPT=$ROOT/.intellijPlatform/sandbox-latest/config_runIdeLatest/options
TMP=$(mktemp -d "${TMPDIR:-/tmp}"/mts-capture.XXXXXX)
TMP=$(cd "$TMP" && pwd)  # macOS TMPDIR은 /로 끝나 경로에 //가 생긴다 — 브라우저 쪽 표기와 맞춘다
IDE_ARG=(); [ -n "${LATEST_IDE_PATH:-}" ] && IDE_ARG=(-PlatestIdePath="$LATEST_IDE_PATH")

stop_sandbox() {
  pkill -f "$PAT"
  for _ in $(seq 1 90); do pgrep -f "$PAT" >/dev/null || break; sleep 1; done
  pgrep -f "$PAT" >/dev/null && pkill -9 -f "$PAT"
  # 디버깅 포트가 빌 때까지 — 이전 IDE와 겹치면 새 IDE가 바로 종료된다
  for _ in $(seq 1 30); do curl -s -m 1 "localhost:$PORT/json" >/dev/null 2>&1 || break; sleep 1; done
  # 이 worktree 샌드박스를 다 내렸는데도 응답하면 다른 작업의 샌드박스다 — 그 preview를 캡처하거나
  # 새 IDE가 포트 충돌로 바로 죽기 전에 멈춘다(MTS_CDP_PORT로 빈 포트를 쓸 것)
  if curl -s -m 1 "localhost:$PORT/json" >/dev/null 2>&1; then
    echo "포트 $PORT 점유(다른 작업의 샌드박스) — 중단. MTS_CDP_PORT로 다른 포트를 지정할 것"
    exit 2
  fi
}

fail=0
for f in "${FIXTURES[@]}"; do
  stop_sandbox; sleep 2
  mkdir -p "$OPT"
  if [ "$LAF" = light ]; then
    # LaF 전환 후 종료하면 IDE가 기본값(다크)과 같은 laf.xml을 지우므로 매번 쓴다
    printf '<application>\n  <component name="LafManager" autodetect="false">\n    <laf themeId="ExperimentalLight" />\n  </component>\n</application>\n' > "$OPT/laf.xml"
    printf '<application>\n  <component name="EditorColorsManagerImpl">\n    <global_color_scheme name="Light" />\n  </component>\n</application>\n' > "$OPT/colors.scheme.xml"
  else
    rm -f "$OPT/laf.xml" "$OPT/colors.scheme.xml"
  fi
  name=$(basename "$f" .md); P=$TMP/$name; mkdir -p "$P"; cp "$ROOT/$f" "$P/"
  # 실행마다 별도 로그 — 종료된 이전 Gradle 프로세스가 공용 로그에 뒤늦게 BUILD FAILED를 쓴다
  LOG=$TMP/runIde-$name-$LAF.log
  (cd "$ROOT" && ./gradlew runIdeLatest -PcdpPort="$PORT" ${IDE_ARG[@]+"${IDE_ARG[@]}"} --args="$P $P/$(basename "$f")" > "$LOG" 2>&1 < /dev/null &)
  ready=0
  for _ in $(seq 1 300); do
    if curl -s "localhost:$PORT/json" 2>/dev/null | grep -q markdown-preview-index; then ready=1; break; fi
    grep -qE 'BUILD FAILED|FAILURE:' "$LOG" 2>/dev/null && break
    sleep 1
  done
  if [ $ready = 0 ]; then echo "FAIL $f — preview 안 뜸 ($LOG)"; tail -15 "$LOG"; fail=1; continue; fi
  sleep 2 # 본문 렌더 대기는 capture.py가 H1을 기다린다
  (cd "$ROOT" && MTS_CDP_PORT=$PORT MTS_CAPTURE_PROJECT=$P "$PY" tools/static-harness/capture.py "$LAF") || { echo "CAPTURE_FAIL $f"; fail=1; }
done
stop_sandbox
exit $fail

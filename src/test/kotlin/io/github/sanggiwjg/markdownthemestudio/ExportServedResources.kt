package io.github.sanggiwjg.markdownthemestudio

import java.io.File

/**
 * 연동 검사(tools/static-harness/run.mjs `auditBridge`)의 IDE 상태. 필드마다 기본값(gh/auto/0/0)과 달라야
 * 어느 한 필드의 연결이 끊겨도(위젯이 기본값으로 강등돼도) 드러난다. appearance=light는 다크 LaF 조합에서
 * 기본값(auto → 다크)과 갈린다. run.mjs의 `BRIDGE_STATE`와 같아야 한다
 */
internal val BRIDGE_PREFS = PreviewPrefs(theme = "nt", appearance = "light", fontSizeOffset = 1, widthOffset = -1, revision = 7)

/**
 * CI 정적 렌더 하네스(tools/static-harness)용 — IDE가 preview에 서빙하는 것과 같은 바이트를 내보낸다.
 * `./gradlew exportServedResources` → build/served/{mts.css, mts.light.js, mts.dark.js, mts-ide.stored.js, mts-ide.unset.js}
 *
 * 설정 동기화 브리지(IDE에선 mts-ide-<토큰>.js — 프리루드가 세션의 IDE 상태라 매번 달라진다)는 고정 상태로 두 벌
 * 내보낸다. 하네스는 이를 연동 검사 한 조합에서만 mts.js 앞에 싣고, 나머지 조합은 브리지 없이 localStorage 강등
 * 경로로 돈다. 둘 다 pipe=false(하네스에는 BrowserPipe가 없다)
 * - stored: [BRIDGE_PREFS] — IDE 값이 위젯 초기 상태·localStorage 미러로 가는지
 * - unset: 같은 값에 revision 0(IDE에 값 없음) — 값이 실려 와도 무시하고 로컬(빈 저장소 = 기본값)로 시작하는지.
 *   기본값을 실으면 이 규칙이 깨져도 결과가 같아 대조가 안 된다
 */
fun main(args: Array<String>) {
    val out = File(args.single()).apply { mkdirs() }
    fun read(path: String) = requireNotNull(object {}.javaClass.getResourceAsStream("/$path")) { path }
        .use { it.readBytes() }
    val style = read(ThemeStudioPreviewExtension.STYLE_PATH)
    val script = read(ThemeStudioPreviewExtension.SCRIPT_PATH)
    val bridge = read(PreviewSettingsSync.BRIDGE_PATH)
    File(out, "mts.css").writeBytes(servedStyle(style))
    File(out, "mts.light.js").writeBytes(servedScript(script, isDark = false))
    File(out, "mts.dark.js").writeBytes(servedScript(script, isDark = true))
    File(out, "mts-ide.stored.js").writeBytes(PreviewProtocol.servedBridge(bridge, BRIDGE_PREFS, pipe = false))
    File(out, "mts-ide.unset.js").writeBytes(PreviewProtocol.servedBridge(bridge, BRIDGE_PREFS.copy(revision = 0), pipe = false))
    println("served resources → ${out.path}")
}

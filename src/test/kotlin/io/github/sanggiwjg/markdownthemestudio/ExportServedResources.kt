package io.github.sanggiwjg.markdownthemestudio

import java.io.File

/**
 * CI 정적 렌더 하네스(tools/static-harness)용 — IDE가 preview에 서빙하는 것과 같은 바이트를 내보낸다.
 * `./gradlew exportServedResources` → build/served/{mts.css, mts.light.js, mts.dark.js}
 * 설정 동기화 브리지(mts-ide-<토큰>.js — IDE 상태 프리루드가 세션마다 달라짐)는 내보내지 않는다. 하네스의 위젯은
 * localStorage 강등 경로로 동작한다
 */
fun main(args: Array<String>) {
    val out = File(args.single()).apply { mkdirs() }
    fun read(path: String) = requireNotNull(object {}.javaClass.getResourceAsStream("/$path")) { path }
        .use { it.readBytes() }
    val style = read(ThemeStudioPreviewExtension.STYLE_PATH)
    val script = read(ThemeStudioPreviewExtension.SCRIPT_PATH)
    File(out, "mts.css").writeBytes(servedStyle(style))
    File(out, "mts.light.js").writeBytes(servedScript(script, isDark = false))
    File(out, "mts.dark.js").writeBytes(servedScript(script, isDark = true))
    println("served resources → ${out.path}")
}

package io.github.sanggiwjg.markdownthemestudio

import com.intellij.openapi.util.Disposer
import com.intellij.ui.JBColor
import org.intellij.plugins.markdown.extensions.MarkdownBrowserPreviewExtension
import org.intellij.plugins.markdown.ui.preview.MarkdownHtmlPanel
import org.intellij.plugins.markdown.ui.preview.ResourceProvider

/**
 * 번들 Markdown 플러그인의 JCEF preview에 테마 CSS와 스위처 JS를 주입한다.
 * 스타일 재정의가 전부이며 파싱·렌더링 파이프라인은 건드리지 않는다.
 *
 * AFTER_ALL: 스타일시트가 cascade 마지막에 로드되어 기본 스타일(BaseStylesExtension,
 * BEFORE_ALL)을 이긴다. LaF 변경 시 패널이 파기·재생성되므로 이 확장도 다시 만들어진다.
 * 설정 상태의 IDE 동기화(프리루드·BrowserPipe)는 [PreviewSettingsSync]가 맡는다.
 */
class ThemeStudioPreviewExtension(panel: MarkdownHtmlPanel? = null) : MarkdownBrowserPreviewExtension, ResourceProvider {
    // 패널 생성 시점(EDT)의 LaF를 캡처한다. 서빙 스레드(netty)에서 UI 상태를 읽지
    // 않기 위함이며, LaF 변경은 패널 재생성을 유발하므로 수명 내내 유효하다.
    private val isDark = !JBColor.isBright()

    private val sync = PreviewSettingsSync(panel).also { Disposer.register(this, it) }

    override val priority: MarkdownBrowserPreviewExtension.Priority
        get() = MarkdownBrowserPreviewExtension.Priority.AFTER_ALL

    override val styles: List<String> = listOf(STYLE_PATH)
    // 동기화 브리지가 먼저 — mts.js가 로드될 때 window.__mtsSync가 있어야 한다
    override val scripts: List<String> = listOf(sync.scriptPath, SCRIPT_PATH)

    override val resourceProvider: ResourceProvider = this

    override fun canProvide(resourceName: String): Boolean =
        resourceName == STYLE_PATH || resourceName == SCRIPT_PATH || sync.canProvide(resourceName)

    override fun loadResource(resourceName: String): ResourceProvider.Resource? = when (resourceName) {
        STYLE_PATH -> readResource(STYLE_PATH)?.let {
            ResourceProvider.Resource(servedStyle(it), "text/css; charset=utf-8")
        }
        SCRIPT_PATH -> readResource(SCRIPT_PATH)?.let {
            ResourceProvider.Resource(servedScript(it, isDark), "text/javascript; charset=utf-8")
        }
        else -> sync.loadResource(resourceName)
    }

    private fun readResource(path: String): ByteArray? =
        javaClass.getResourceAsStream("/$path")?.use { it.readBytes() }

    override fun dispose() = Unit

    class Provider : MarkdownBrowserPreviewExtension.Provider {
        override fun createBrowserExtension(panel: MarkdownHtmlPanel): MarkdownBrowserPreviewExtension =
            ThemeStudioPreviewExtension(panel)
    }

    companion object {
        internal const val STYLE_PATH = "themes/mts.css"
        internal const val SCRIPT_PATH = "themes/mts.js"
    }
}

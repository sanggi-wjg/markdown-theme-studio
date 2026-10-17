package io.github.sanggiwjg.markdownthemestudio

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.diagnostic.ControlFlowException
import com.intellij.openapi.diagnostic.logger
import org.intellij.plugins.markdown.ui.preview.BrowserPipe
import org.intellij.plugins.markdown.ui.preview.MarkdownHtmlPanel
import org.intellij.plugins.markdown.ui.preview.ResourceProvider
import java.util.concurrent.ThreadLocalRandom

/**
 * preview 패널 하나와 IDE 설정([ThemeStudioSettings]) 사이의 동기화. 확장 인스턴스와 수명이 같다
 * (패널은 페이지를 새로 읽을 때마다 확장을 파기·재생성한다).
 *
 * - IDE→JS 초기값: 서빙 시점 프리루드(`window.__mtsIde`)를 mts-ide.js 앞에 붙인다. 스크립트 경로에 인스턴스마다
 *   다른 토큰을 넣는다 — PreviewStaticServer는 Last-Modified를 IDE 빌드 날짜로 고정하고 조건부 요청에 304를
 *   주므로, 같은 패널이 페이지를 다시 읽으면(reloadWithOffset) 같은 URL의 스크립트는 캐시본(옛 프리루드)이 쓰인다.
 *   263은 이 때문에 캐시 무시 재로드를 넣었지만 251~262는 그대로다
 * - IDE→JS 실시간: 설정 변경 방송([ThemeStudioSettings.TOPIC])을 받아 BrowserPipe.send로 밀어 넣는다
 * - JS→IDE: BrowserPipe 구독(`mts:set`·`mts:ready`). JS가 IdeReady 뒤에만 post할 수 있는 것은 JS 쪽이 맞춘다
 *
 * BrowserPipe(`MarkdownHtmlPanel.getBrowserPipe`, @ApiStatus.Experimental)가 없거나 실패하면 프리루드에
 * pipe=false를 실어 위젯이 localStorage로 강등되게 한다. BrowserPipe를 참조하는 코드는 [PipeLink]에만 있어
 * 그 타입이 사라진 버전에서도 이 클래스와 확장은 로드된다(링크 오류를 여기서 잡는다).
 */
internal class PreviewSettingsSync(panel: MarkdownHtmlPanel?) : Disposable {
    val scriptPath: String = "themes/mts-ide-" + java.lang.Long.toHexString(ThreadLocalRandom.current().nextLong()) + ".js"

    @Volatile
    private var disposed = false

    private val link: PipeLink? = open(panel)

    init {
        if (link != null) {
            ApplicationManager.getApplication().messageBus.connect(this).subscribe(
                ThemeStudioSettings.TOPIC,
                PrefsListener { change -> send(change.prefs, if (change.source === this) change.seq else null) },
            )
        }
    }

    fun canProvide(resourceName: String): Boolean = resourceName == scriptPath

    fun loadResource(resourceName: String): ResourceProvider.Resource? {
        if (resourceName != scriptPath) return null
        val script = javaClass.getResourceAsStream("/$BRIDGE_PATH")?.use { it.readBytes() } ?: return null
        val prefs = try {
            ThemeStudioSettings.getInstance().prefs
        } catch (e: Exception) {
            if (e is ControlFlowException) throw e
            LOG.warn("Markdown Theme Studio settings are unavailable; the preview falls back to local storage", e)
            null
        }
        return ResourceProvider.Resource(
            PreviewProtocol.servedBridge(script, prefs, pipe = link != null),
            "text/javascript; charset=utf-8",
        )
    }

    /** BrowserPipe 핸들러 스레드(JCEF) — 검증만 하고 EDT로 넘긴다 */
    fun onSet(data: String) {
        val message = PreviewProtocol.parseSet(data)
        if (message == null) {
            LOG.debug("Ignored an invalid preview settings message: $data")
            return
        }
        onEdt {
            when (ThemeStudioSettings.getInstance().update(message.patch, message.base, this, message.seq)) {
                // Changed는 방송이 보낸 쪽에 seq를 실어 확인해 준다
                is UpdateResult.Changed -> Unit
                UpdateResult.Unchanged -> send(ThemeStudioSettings.getInstance().prefs, message.seq)
                // 조건부 변경 거절 — 현재 상태를 일반 상태로 보내 위젯이 IDE 값으로 맞추게 한다
                UpdateResult.Rejected -> send(ThemeStudioSettings.getInstance().prefs, null)
            }
        }
    }

    fun onReady() {
        onEdt { send(ThemeStudioSettings.getInstance().prefs, null) }
    }

    private fun onEdt(action: () -> Unit) {
        // ModalityState.any(): 모달 대화상자가 떠 있어도 preview 상태 반영이 밀리지 않게(PSI·VFS를 건드리지 않는다)
        ApplicationManager.getApplication().invokeLater({ if (!disposed) action() }, ModalityState.any())
    }

    private fun send(prefs: PreviewPrefs, seq: Int?) {
        if (disposed || prefs.revision == 0L) return
        try {
            link?.send(PreviewProtocol.stateJson(prefs, seq))
        } catch (e: Exception) {
            if (e is ControlFlowException) throw e
            // 페이지가 아직 없거나 브라우저가 내려가는 중 — 다음 로드의 프리루드·ready 응답이 맞춘다
            LOG.debug("Could not push Markdown Theme Studio settings to the preview", e)
        }
    }

    override fun dispose() {
        disposed = true
        try {
            link?.close()
        } catch (e: Exception) {
            if (e is ControlFlowException) throw e
            LOG.debug(e)
        }
    }

    private fun open(panel: MarkdownHtmlPanel?): PipeLink? {
        if (panel == null) return null
        // 강등 경로 재현·비상 스위치: -DmarkdownThemeStudio.browserPipe.disabled=true(Help | Edit Custom VM Options)
        if (java.lang.Boolean.getBoolean(DISABLE_PIPE_PROPERTY)) return null
        return try {
            PipeLink.open(panel, this)
        } catch (e: LinkageError) {
            LOG.warn("Markdown preview BrowserPipe API is unavailable; settings stay in the preview's local storage", e)
            null
        } catch (e: Exception) {
            if (e is ControlFlowException) throw e
            LOG.warn("Could not connect to the Markdown preview BrowserPipe; settings stay in the preview's local storage", e)
            null
        }
    }

    companion object {
        private val LOG = logger<PreviewSettingsSync>()
        const val BRIDGE_PATH = "themes/mts-ide.js"
        const val DISABLE_PIPE_PROPERTY = "markdownThemeStudio.browserPipe.disabled"
    }
}

/** BrowserPipe를 직접 참조하는 유일한 Kotlin 클래스(핸들러는 [PipeHandler] — Java인 이유는 그쪽 주석) */
private class PipeLink(private val pipe: BrowserPipe, owner: PreviewSettingsSync) {
    private val setHandler = PipeHandler { owner.onSet(it) }
    private val readyHandler = PipeHandler { owner.onReady() }

    init {
        pipe.subscribe(PreviewProtocol.TAG_SET, setHandler)
        pipe.subscribe(PreviewProtocol.TAG_READY, readyHandler)
    }

    fun send(data: String) = pipe.send(PreviewProtocol.TAG_STATE, data)

    fun close() {
        pipe.removeSubscription(PreviewProtocol.TAG_SET, setHandler)
        pipe.removeSubscription(PreviewProtocol.TAG_READY, readyHandler)
    }

    companion object {
        fun open(panel: MarkdownHtmlPanel, owner: PreviewSettingsSync): PipeLink? =
            panel.browserPipe?.let { PipeLink(it, owner) }
    }
}

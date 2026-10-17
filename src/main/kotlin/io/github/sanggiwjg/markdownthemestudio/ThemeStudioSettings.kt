package io.github.sanggiwjg.markdownthemestudio

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.components.SerializablePersistentStateComponent
import com.intellij.openapi.components.SettingsCategory
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.components.service
import com.intellij.util.messages.Topic

/**
 * preview 설정의 원천 — 앱 레벨이라 모든 프로젝트 창·모든 preview가 같은 값을 본다.
 *
 * Settings Sync: 앱 레벨 + 로밍 가능한 저장소(기본 RoamingType.DEFAULT) + category가 OTHER가 아니어야 동기화
 * 대상이다(251 settingsSync `isSyncCategoryEnabled`·`getRoamableCategory` — OTHER는 무조건 제외). UI로 두어
 * "UI settings" 카테고리와 함께 켜고 끈다. IDE 제품 간(IDEA↔PyCharm 등) 동기화는 Backup and Sync의
 * "Sync settings across"에서 전 제품(2025.1 "All JetBrains IDE products", 2025.2+ "JetBrains IDE products and
 * Android Studio")을 골랐을 때만이다 — 기본값은 제품별 스냅샷(`<product>/settings.sync.snapshot.zip`)이라 같은
 * 제품의 다른 설치본끼리만 맞춰진다.
 *
 * 등록: plugin.xml `applicationService`로 한다(@Service 경량 서비스 금지). Settings Sync는 파일의 카테고리를
 * 컴포넌트 목록(`processAllImplementationClasses`)에서 찾는데, 경량 서비스는 그 세션에서 처음 `service()`로
 * 불리기 전엔 목록에 없다 — preview를 아직 안 연 IDE가 원격 값을 건너뛰고(`writeStatesToAppConfig`), 동기화
 * 최초 스냅샷·Export Settings에서도 빠진다(251·263 settingsSync 소스, PluginDescriptorTest가 고정).
 *
 * 스레드: 상태는 불변 스냅샷([PreviewPrefs])이라 어느 스레드에서 읽어도 된다(리소스 서빙은 netty 스레드).
 * 변경([update])과 방송은 EDT에서 한다 — preview 파기(EDT)와 BrowserPipe.send가 엇갈리지 않게.
 */
@State(
    name = "MarkdownThemeStudio",
    storages = [Storage("markdownThemeStudio.xml")],
    category = SettingsCategory.UI,
)
class ThemeStudioSettings : SerializablePersistentStateComponent<PreviewPrefs>(PreviewPrefs()) {
    // 초기 로드(loadState/noStateLoaded 첫 호출)는 방송하지 않는다 — 그 뒤의 loadState는 외부 변경(Settings Sync 적용 등)
    @Volatile
    private var loaded = false

    val prefs: PreviewPrefs get() = state

    /** EDT에서 호출한다. [source]·[seq]는 방송에 실려 변경을 보낸 preview가 자기 확인 응답을 알아보게 한다 */
    internal fun update(patch: PrefsPatch, base: Long? = null, source: Any? = null, seq: Int = 0): UpdateResult {
        var result: UpdateResult = UpdateResult.Unchanged
        updateState { current ->
            result = transition(current, patch, base, System.currentTimeMillis())
            (result as? UpdateResult.Changed)?.prefs ?: current
        }
        (result as? UpdateResult.Changed)?.let { publish(PrefsChange(it.prefs, source, seq)) }
        return result
    }

    override fun loadState(state: PreviewPrefs) {
        val previous = this.state
        val next = state.sanitized()
        super.loadState(next)
        if (loaded && next != previous) {
            // Settings Sync는 EDT(invokeAndWait)에서 reloadComponents를 부르지만 다른 경로는 보장이 없다
            val app = ApplicationManager.getApplication()
            if (app.isDispatchThread) publish(PrefsChange(next, null, 0))
            else app.invokeLater({ publish(PrefsChange(next, null, 0)) }, ModalityState.any())
        }
        loaded = true
    }

    override fun noStateLoaded() {
        loaded = true
    }

    private fun publish(change: PrefsChange) {
        ApplicationManager.getApplication().messageBus.syncPublisher(TOPIC).prefsChanged(change)
    }

    companion object {
        @Topic.AppLevel
        val TOPIC: Topic<PrefsListener> = Topic(PrefsListener::class.java, Topic.BroadcastDirection.NONE)

        fun getInstance(): ThemeStudioSettings = service()
    }
}

class PrefsChange(val prefs: PreviewPrefs, val source: Any?, val seq: Int)

fun interface PrefsListener {
    fun prefsChanged(change: PrefsChange)
}

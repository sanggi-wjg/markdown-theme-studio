package io.github.sanggiwjg.markdownthemestudio

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.util.Disposer
import com.intellij.testFramework.junit5.TestApplication
import com.intellij.testFramework.runInEdtAndWait
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertSame
import kotlin.test.assertTrue

/** 실제 애플리케이션 메시지 버스로 방송 규칙을 확인한다 — 열린 preview가 받는 경로 */
@TestApplication
class ThemeStudioSettingsTest {
    private val disposable = Disposer.newDisposable()
    private val received = mutableListOf<PrefsChange>()

    @BeforeTest
    fun subscribe() {
        ApplicationManager.getApplication().messageBus.connect(disposable)
            .subscribe(ThemeStudioSettings.TOPIC, PrefsListener { received += it })
    }

    @AfterTest
    fun dispose() = Disposer.dispose(disposable)

    @Test
    fun `변경은 보낸 쪽과 순번을 실어 방송된다 — 값이 같으면 방송하지 않는다`() {
        val settings = ThemeStudioSettings()
        val origin = Any()
        runInEdtAndWait {
            assertIs<UpdateResult.Changed>(settings.update(PrefsPatch(theme = "rd"), source = origin, seq = 4))
            assertEquals(UpdateResult.Unchanged, settings.update(PrefsPatch(theme = "rd")))
        }
        val change = received.single()
        assertSame(origin, change.source)
        assertEquals(4, change.seq)
        assertEquals("rd", change.prefs.theme)
        assertTrue(change.prefs.revision > 0)
        assertEquals(change.prefs, settings.prefs)
    }

    @Test
    fun `조건부 변경 거절은 상태를 바꾸지 않고 방송하지 않는다`() {
        val settings = ThemeStudioSettings()
        runInEdtAndWait {
            settings.update(PrefsPatch(theme = "nt"))
            val before = settings.prefs
            assertEquals(UpdateResult.Rejected, settings.update(PrefsPatch(theme = "dc"), base = 0))
            assertEquals(before, settings.prefs)
        }
        assertEquals(1, received.size)
    }

    @Test
    fun `첫 로드는 방송하지 않고, 그 뒤의 loadState(Settings Sync 적용)는 방송한다`() {
        val settings = ThemeStudioSettings()
        runInEdtAndWait {
            settings.loadState(PreviewPrefs("nt", revision = 10))
            assertEquals(0, received.size)
            settings.loadState(PreviewPrefs("rd", "dark", 1, -1, revision = 20))
            settings.loadState(PreviewPrefs("rd", "dark", 1, -1, revision = 20)) // 같은 값 — 방송 없음
        }
        val change = received.single()
        assertEquals(PreviewPrefs("rd", "dark", 1, -1, 20), change.prefs)
        assertEquals(null, change.source)
    }

    @Test
    fun `저장 파일의 허용 밖 값은 읽을 때 정리된다`() {
        val settings = ThemeStudioSettings()
        settings.noStateLoaded()
        runInEdtAndWait { settings.loadState(PreviewPrefs("<script>", "sepia", 9, -9, 30)) }
        assertEquals(PreviewPrefs(revision = 30), settings.prefs)
    }
}

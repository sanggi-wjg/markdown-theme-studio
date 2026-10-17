package io.github.sanggiwjg.markdownthemestudio

import com.intellij.openapi.components.SettingsCategory
import com.intellij.openapi.components.State
import com.intellij.openapi.util.JDOMUtil
import com.intellij.util.xmlb.SkipDefaultsSerializationFilter
import com.intellij.util.xmlb.XmlSerializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertTrue

class PreviewPrefsTest {
    private val stored = PreviewPrefs("nt", "dark", 1, -2, revision = 1000)

    @Test
    fun `변경은 바꾼 필드만 덮고 새 revision을 매긴다`() {
        val result = transition(stored, PrefsPatch(theme = "rd"), base = null, now = 5000)
        assertEquals(UpdateResult.Changed(stored.copy(theme = "rd", revision = 5000)), result)
    }

    @Test
    fun `같은 IDE 안에서 revision은 시계가 뒤로 가도 늘어난다`() {
        val result = transition(stored, PrefsPatch(fontSizeOffset = 3), base = null, now = 10)
        assertEquals(1001, assertIs<UpdateResult.Changed>(result).prefs.revision)
    }

    @Test
    fun `값이 같으면 저장·방송하지 않는다`() {
        assertEquals(UpdateResult.Unchanged, transition(stored, PrefsPatch(theme = "nt"), base = null, now = 5000))
    }

    @Test
    fun `IDE에 값이 없을 때는 같은 값이어도 revision을 매긴다 — 명시적 선택과 마이그레이션`() {
        val empty = PreviewPrefs()
        assertIs<UpdateResult.Changed>(transition(empty, PrefsPatch(theme = "gh"), base = null, now = 5000))
        assertIs<UpdateResult.Changed>(transition(empty, PrefsPatch(theme = "gh"), base = 0, now = 5000))
    }

    @Test
    fun `조건부 변경은 기준 revision이 같을 때만 적용된다`() {
        val migrate = PrefsPatch("rd", "light", 2, 1)
        assertEquals(UpdateResult.Rejected, transition(stored, migrate, base = 0, now = 5000))
        assertEquals(UpdateResult.Rejected, transition(stored, migrate, base = 999, now = 5000))
        assertEquals(
            UpdateResult.Changed(PreviewPrefs("rd", "light", 2, 1, 5000)),
            transition(stored, migrate, base = 1000, now = 5000),
        )
        assertEquals(
            UpdateResult.Changed(PreviewPrefs("rd", "light", 2, 1, 5000)),
            transition(PreviewPrefs(), migrate, base = 0, now = 5000),
        )
    }

    @Test
    fun `저장 파일의 허용 밖 값은 필드별로 기본값으로 돌린다`() {
        assertEquals(
            PreviewPrefs("gh", "auto", 0, 0, 0),
            PreviewPrefs("evil", "sepia", 7, -9, -5).sanitized(),
        )
        assertEquals(stored, stored.sanitized())
        assertEquals(PreviewPrefs("off"), PreviewPrefs("off").sanitized())
    }

    @Test
    fun `XML 왕복 — 기본값 필드는 쓰지 않고 읽으면 같은 값이다`() {
        // 컴포넌트 저장소와 같은 기본값 생략 필터
        val element = XmlSerializer.serialize(stored, SkipDefaultsSerializationFilter())
        val xml = JDOMUtil.writeElement(element)
        assertTrue("revision" in xml && "\"nt\"" in xml && "widthOffset" in xml, xml)
        assertEquals(stored, XmlSerializer.deserialize(element, PreviewPrefs::class.java))

        val defaults = JDOMUtil.writeElement(XmlSerializer.serialize(PreviewPrefs(theme = "rd"), SkipDefaultsSerializationFilter()))
        assertTrue("\"rd\"" in defaults && "appearance" !in defaults && "fontSizeOffset" !in defaults, defaults)
    }

    @Test
    fun `Settings Sync 대상 — 앱 레벨 로밍 저장소, category가 OTHER가 아니다`() {
        val state = ThemeStudioSettings::class.java.getAnnotation(State::class.java)
        assertEquals(SettingsCategory.UI, state.category)
        assertEquals("markdownThemeStudio.xml", state.storages.single().value)
        assertTrue(state.storages.single().roamingType.isRoamable)
    }
}

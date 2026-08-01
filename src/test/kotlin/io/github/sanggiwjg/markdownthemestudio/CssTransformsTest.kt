package io.github.sanggiwjg.markdownthemestudio

import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class CssTransformsTest {
    @Test
    fun `선언을 important로 승격한다`() {
        assertEquals("a { color: red !important; }", importantify("a { color: red; }"))
    }

    @Test
    fun `주석은 세미콜론이나 important를 포함해도 제거된다`() {
        assertEquals(
            "a { color: red !important; }",
            importantify("/* x; !important; y */a { color: red; }"),
        )
    }

    @Test
    fun `번들 mts_css가 작성 계약을 지킨다`() {
        val source = requireNotNull(javaClass.getResourceAsStream("/themes/mts.css"))
            .use { it.readBytes().decodeToString() }
        val stripped = source.replace(Regex("/\\*.*?\\*/", RegexOption.DOT_MATCHES_ALL), "")

        // 계약: 수동 !important 금지, url()·문자열 내부 세미콜론 금지
        assertFalse(stripped.contains("!important"), "mts.css에 수동 !important가 있으면 이중 승격됨")
        assertFalse(stripped.contains("url("), "url()은 내부 세미콜론 파손 위험 — 계약 위반")

        val transformed = importantify(source)
        assertFalse(transformed.contains("!important !important"), "이중 승격 발생")
        assertContains(transformed, "font-size: var(--mts-fs) !important;")
        // 괄호 균형(치환이 구조를 깨지 않았는지)
        assertTrue(transformed.count { it == '{' } == transformed.count { it == '}' })
        assertTrue(transformed.count { it == '(' } == transformed.count { it == ')' })
    }
}

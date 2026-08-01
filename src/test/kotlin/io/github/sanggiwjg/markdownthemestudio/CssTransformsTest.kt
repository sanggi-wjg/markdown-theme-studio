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
    fun `문자열 내부 세미콜론은 치환하지 않는다`() {
        assertEquals(
            """a::before { content: "a;b" !important; }""",
            importantify("""a::before { content: "a;b"; }"""),
        )
        assertEquals(
            "a::before { content: 'x;y' !important; }",
            importantify("a::before { content: 'x;y'; }"),
        )
    }

    @Test
    fun `문자열 내부의 주석·이스케이프 표기는 보존된다`() {
        assertEquals(
            """a { content: "/* x */" !important; }""",
            importantify("""a { content: "/* x */"; }"""),
        )
        assertEquals(
            """a { content: "quote\";semi" !important; }""",
            importantify("""a { content: "quote\";semi"; }"""),
        )
    }

    @Test
    fun `url 내부 세미콜론은 치환하지 않는다`() {
        assertEquals(
            "a { background: url(data:image/png;base64,AA==) !important; }",
            importantify("a { background: url(data:image/png;base64,AA==); }"),
        )
        assertEquals(
            """a { background: URL("data:image/svg+xml;utf8,<svg/>") !important; }""",
            importantify("""a { background: URL("data:image/svg+xml;utf8,<svg/>"); }"""),
        )
    }

    @Test
    fun `이미 important인 선언은 이중 승격하지 않는다`() {
        assertEquals(
            "a { color: red !important; }",
            importantify("a { color: red !important; }"),
        )
        assertEquals(
            "a { color: red !IMPORTANT; }",
            importantify("a { color: red !IMPORTANT; }"),
        )
        // CSS 스펙상 유효한 공백 분리형과 important 뒤 주석
        assertEquals(
            "a { color: red ! important; }",
            importantify("a { color: red ! important; }"),
        )
        assertEquals(
            "a { color: red !important ; }",
            importantify("a { color: red !important /* x */; }"),
        )
    }

    @Test
    fun `닫히지 않은 주석은 EOF까지 제거된다`() {
        assertEquals(
            "a { color: red !important; } ",
            importantify("a { color: red; } /* trailing"),
        )
    }

    @Test
    fun `비인용 url 내부의 이스케이프된 괄호를 존중한다`() {
        assertEquals(
            """a { background: url(a\);b.png) !important; }""",
            importantify("""a { background: url(a\);b.png); }"""),
        )
    }

    @Test
    fun `번들 mts_css가 작성 계약을 지킨다`() {
        val source = requireNotNull(javaClass.getResourceAsStream("/themes/mts.css"))
            .use { it.readBytes().decodeToString() }
        val stripped = source.replace(Regex("/\\*.*?\\*/", RegexOption.DOT_MATCHES_ALL), "")

        // 관례: 전 선언이 서빙 시 일괄 승격되므로 수동 !important는 두지 않는다 (파손은 아님)
        assertFalse(stripped.contains("!important"), "mts.css에 수동 !important — 일괄 승격 관례 위반")

        val transformed = importantify(source)
        assertFalse(transformed.contains("!important !important"), "이중 승격 발생")
        assertContains(transformed, "--default-font-size: calc(var(--mts-fs) + var(--mts-fs-offset, 0px)) !important;")
        // 괄호 균형(치환이 구조를 깨지 않았는지)
        assertTrue(transformed.count { it == '{' } == transformed.count { it == '}' })
        assertTrue(transformed.count { it == '(' } == transformed.count { it == ')' })
    }
}

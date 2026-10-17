package io.github.sanggiwjg.markdownthemestudio

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class PreviewProtocolTest {
    @Test
    fun `바꾼 필드만 담긴 변경을 읽는다`() {
        assertEquals(
            SetMessage(3, null, PrefsPatch(theme = "nt")),
            PreviewProtocol.parseSet("seq=3&theme=nt"),
        )
        assertEquals(
            SetMessage(1, 0, PrefsPatch("off", "dark", -3, 3)),
            PreviewProtocol.parseSet("seq=1&base=0&theme=off&appearance=dark&fs=-3&w=3"),
        )
        assertEquals(
            SetMessage(7, 1760000000000, PrefsPatch(fontSizeOffset = 0)),
            PreviewProtocol.parseSet("seq=7&base=1760000000000&fs=0"),
        )
    }

    @Test
    fun `허용 밖 값이 하나라도 있으면 메시지 전체를 버린다`() {
        listOf(
            "seq=1&theme=evil",
            "seq=1&theme=GH",
            "seq=1&appearance=sepia",
            "seq=1&fs=4",
            "seq=1&fs=-4",
            "seq=1&w=1.5",
            "seq=1&w=%31",
            "seq=1&fs=+1",
            "seq=1&fs=01",
            "seq=1&theme=nt&fs=x",
        ).forEach { assertNull(PreviewProtocol.parseSet(it), it) }
    }

    @Test
    fun `형식이 어긋난 메시지를 버린다`() {
        listOf(
            "",
            "theme=nt", // seq 없음
            "seq=0&theme=nt", // seq는 1부터
            "seq=-1&theme=nt",
            "seq=1234567890&theme=nt", // 10자리
            "seq=1", // 바꾼 필드 없음
            "seq=1&base=-1&theme=nt",
            "seq=1&base=01&theme=nt",
            "seq=1&theme=nt&theme=rd", // 키 중복
            "seq=1&theme=nt&extra=1", // 모르는 키
            "seq=1&theme", // = 없음
            "seq=1&=nt",
            "seq=1&theme=nt&", // 빈 쌍
            "seq=1&theme=nt;alert(1)",
            "seq=1&theme=" + "a".repeat(300), // 길이 상한
        ).forEach { assertNull(PreviewProtocol.parseSet(it), it) }
    }

    @Test
    fun `상태 JSON은 검증된 값으로만 만든다`() {
        assertEquals(
            """{"rev":42,"theme":"nt","appearance":"dark","fs":-1,"w":2}""",
            PreviewProtocol.stateJson(PreviewPrefs("nt", "dark", -1, 2, 42)),
        )
        assertEquals(
            """{"rev":42,"theme":"gh","appearance":"auto","fs":0,"w":0,"seq":5}""",
            PreviewProtocol.stateJson(PreviewPrefs(revision = 42), seq = 5),
        )
        // 저장 파일에서 온 허용 밖 값은 내보내기 전에 기본값으로 — 문자열이 JS로 그대로 새지 않는다
        assertEquals(
            """{"rev":42,"theme":"gh","appearance":"auto","fs":0,"w":0}""",
            PreviewProtocol.stateJson(PreviewPrefs("\"};alert(1);//", "x", 99, -99, 42)),
        )
    }

    @Test
    fun `프리루드는 pipe 가능 여부와 IDE 상태를 싣고, 설정을 못 읽으면 비운다`() {
        assertEquals(
            "window.__mtsIde = {\"pipe\":true,\"rev\":0,\"theme\":\"gh\",\"appearance\":\"auto\",\"fs\":0,\"w\":0};\n",
            PreviewProtocol.prelude(PreviewPrefs(), pipe = true),
        )
        assertTrue(PreviewProtocol.prelude(PreviewPrefs(revision = 9), pipe = false).startsWith("window.__mtsIde = {\"pipe\":false,\"rev\":9,"))
        assertEquals("", PreviewProtocol.prelude(null, pipe = true))
    }

    @Test
    fun `서빙되는 브리지는 프리루드 뒤에 스크립트 원본이다`() {
        val script = "(function () {})();\n".toByteArray()
        assertEquals(
            PreviewProtocol.prelude(PreviewPrefs(revision = 9), pipe = false) + "(function () {})();\n",
            PreviewProtocol.servedBridge(script, PreviewPrefs(revision = 9), pipe = false).decodeToString(),
        )
        assertEquals("(function () {})();\n", PreviewProtocol.servedBridge(script, null, pipe = true).decodeToString())
    }
}

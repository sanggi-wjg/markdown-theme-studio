package io.github.sanggiwjg.markdownthemestudio

/** 위젯이 보낸 변경 — [seq]는 그 preview 안에서의 순번(확인 응답에 되돌려 준다), [base]는 조건부 변경의 기준 revision */
internal data class SetMessage(val seq: Int, val base: Long?, val patch: PrefsPatch)

/**
 * preview(mts-ide.js) ↔ IDE 메시지 형식. 번들 Markdown의 BrowserPipe(문자열 type + 문자열 data) 위에 얹는다.
 *
 * - JS→IDE `mts:set`: `seq=3&base=0&theme=nt&appearance=dark&fs=1&w=-2` — 바꾼 필드만. base는 선택
 * - JS→IDE `mts:ready`: 데이터 없음 — 페이지가 메시지를 받을 준비가 됐으니 현재 상태를 보내 달라는 요청
 * - IDE→JS `mts:state`: `{"rev":…,"theme":…,"appearance":…,"fs":…,"w":…}` (+ 보낸 preview에게만 `"seq":n`)
 *
 * JS에서 온 문자열은 신뢰하지 않는다: 길이 상한, 알려진 키만, 키 중복 금지, 값은 허용 목록·범위 —
 * 하나라도 어긋나면 메시지 전체를 버린다. 내보내는 JSON은 검증된 값으로만 만든다(이스케이프가 필요 없는 토큰·정수).
 */
internal object PreviewProtocol {
    const val TAG_SET = "mts:set"
    const val TAG_READY = "mts:ready"
    const val TAG_STATE = "mts:state"

    private const val MAX_MESSAGE_LENGTH = 256
    private val SEQ = Regex("[1-9][0-9]{0,8}")
    private val REVISION = Regex("0|[1-9][0-9]{0,17}")
    private val OFFSET = Regex("-?[0-9]")

    fun parseSet(data: String): SetMessage? {
        if (data.isEmpty() || data.length > MAX_MESSAGE_LENGTH) return null
        val fields = HashMap<String, String>()
        for (pair in data.split('&')) {
            val eq = pair.indexOf('=')
            if (eq <= 0) return null
            val key = pair.substring(0, eq)
            if (fields.put(key, pair.substring(eq + 1)) != null) return null
        }
        if (!fields.keys.all { it in KEYS }) return null
        val seq = fields["seq"]?.takeIf { SEQ.matches(it) }?.toInt() ?: return null
        val base = fields["base"]?.let { if (REVISION.matches(it)) it.toLong() else return null }
        val patch = PrefsPatch(
            theme = fields["theme"]?.let { if (it in PrefValues.THEME_IDS) it else return null },
            appearance = fields["appearance"]?.let { if (it in PrefValues.APPEARANCES) it else return null },
            fontSizeOffset = fields["fs"]?.let { offset(it) ?: return null },
            widthOffset = fields["w"]?.let { offset(it) ?: return null },
        )
        if (patch.isEmpty) return null
        return SetMessage(seq, base, patch)
    }

    private fun offset(raw: String): Int? =
        raw.takeIf { OFFSET.matches(it) }?.toInt()?.takeIf { it in PrefValues.OFFSETS }

    private val KEYS = setOf("seq", "base", "theme", "appearance", "fs", "w")

    fun stateJson(prefs: PreviewPrefs, seq: Int? = null): String = buildString {
        val p = prefs.sanitized()
        append("{\"rev\":").append(p.revision)
        append(",\"theme\":\"").append(p.theme).append('"')
        append(",\"appearance\":\"").append(p.appearance).append('"')
        append(",\"fs\":").append(p.fontSizeOffset)
        append(",\"w\":").append(p.widthOffset)
        if (seq != null) append(",\"seq\":").append(seq)
        append('}')
    }

    /**
     * 서빙 시점 프리루드 — mts-ide.js 앞에 붙는다. [pipe]=false면 JS→IDE 경로가 없다는 뜻이라 위젯은
     * IDE 상태를 읽기만 하고 변경은 localStorage에 미확인(pending)으로 남긴다. [prefs]가 null이면
     * (설정 서비스를 못 읽음) 프리루드를 비워 위젯이 localStorage만으로 동작하게 한다.
     */
    fun prelude(prefs: PreviewPrefs?, pipe: Boolean): String {
        if (prefs == null) return ""
        val state = stateJson(prefs)
        return "window.__mtsIde = {\"pipe\":$pipe," + state.substring(1) + ";\n"
    }

    /** 서빙되는 mts-ide.js 바이트 — [prelude]를 앞에 붙인다. CI 정적 렌더 하네스도 이 함수로 같은 바이트를 만든다 */
    fun servedBridge(script: ByteArray, prefs: PreviewPrefs?, pipe: Boolean): ByteArray =
        prelude(prefs, pipe).toByteArray() + script
}

package io.github.sanggiwjg.markdownthemestudio

/**
 * 모든 CSS 선언에 !important를 부여한다. 프로젝트 Custom CSS(전 선언 !important가 흔한
 * Typora 이식 스니펫 등)를 특이도 우위로 이기기 위한 조치.
 *
 * 주석·문자열·url()을 인지하는 단일 패스 변환:
 * - 주석은 제거한다 (문자열 내부의 주석 표기는 보존)
 * - 문자열('…', "…")과 url(…) 내부의 세미콜론은 선언 구분자가 아니므로 치환하지 않는다
 * - 이미 !important로 끝나는 선언은 이중 승격하지 않는다
 */
internal fun importantify(css: String): String {
    val out = StringBuilder(css.length + css.length / 3)
    var i = 0

    // 여는 따옴표부터 닫는 따옴표까지 이스케이프를 존중하며 그대로 복사한다
    fun copyQuoted() {
        val quote = css[i]
        out.append(quote)
        i++
        while (i < css.length) {
            val c = css[i]
            out.append(c)
            i++
            if (c == '\\' && i < css.length) {
                out.append(css[i])
                i++
            } else if (c == quote) {
                return
            }
        }
    }

    while (i < css.length) {
        val c = css[i]
        if (c == '/' && css.startsWith("/*", i)) {
            val end = css.indexOf("*/", i + 2)
            i = if (end == -1) css.length else end + 2
            continue
        }
        if (c == '\'' || c == '"') {
            copyQuoted()
            continue
        }
        if (css.regionMatches(i, "url(", 0, 4, ignoreCase = true) &&
            (i == 0 || !(css[i - 1].isLetterOrDigit() || css[i - 1] == '-' || css[i - 1] == '_'))
        ) {
            out.append(css, i, i + 4)
            i += 4
            while (i < css.length && css[i] != ')') {
                when {
                    css[i] == '\\' && i + 1 < css.length -> {
                        out.append(css[i]).append(css[i + 1])
                        i += 2
                    }
                    css[i] == '\'' || css[i] == '"' -> copyQuoted()
                    else -> {
                        out.append(css[i])
                        i++
                    }
                }
            }
            continue // 닫는 ')'는 일반 문자로 처리
        }
        if (c == ';') {
            out.append(if (endsWithImportant(out)) ";" else " !important;")
            i++
            continue
        }
        out.append(c)
        i++
    }
    return out.toString()
}

private const val IMPORTANT = "important"

private fun endsWithImportant(out: StringBuilder): Boolean {
    var end = out.length
    while (end > 0 && out[end - 1].isWhitespace()) end--
    val start = end - IMPORTANT.length
    if (start < 1) return false
    for (k in IMPORTANT.indices) {
        if (out[start + k].lowercaseChar() != IMPORTANT[k]) return false
    }
    // CSS는 '!'와 important 사이 공백을 허용한다 (`! important`)
    var j = start - 1
    while (j >= 0 && out[j].isWhitespace()) j--
    return j >= 0 && out[j] == '!'
}

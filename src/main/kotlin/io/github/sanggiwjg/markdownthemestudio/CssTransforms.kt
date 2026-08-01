package io.github.sanggiwjg.markdownthemestudio

private val COMMENT_PATTERN = Regex("/\\*.*?\\*/", RegexOption.DOT_MATCHES_ALL)

/**
 * 모든 CSS 선언에 !important를 부여한다. 프로젝트 Custom CSS(전 선언 !important가 흔한
 * Typora 이식 스니펫 등)를 특이도 우위로 이기기 위한 조치.
 *
 * 작성 계약(CLAUDE.md): 주석 제거 후 단순 세미콜론 치환이므로 mts.css에는
 * 문자열/url() 내부 세미콜론과 수동 !important 표기를 넣지 않는다.
 * 이 계약은 CssTransformsTest가 번들 mts.css에 대해 강제한다.
 */
internal fun importantify(css: String): String =
    css.replace(COMMENT_PATTERN, "").replace(";", " !important;")

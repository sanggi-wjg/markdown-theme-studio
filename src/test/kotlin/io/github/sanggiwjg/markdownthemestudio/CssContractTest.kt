package io.github.sanggiwjg.markdownthemestudio

import kotlin.test.Test
import kotlin.test.assertTrue

/**
 * mts.css 변수 계약 — 리뷰어가 매번 손으로 하던 검사를 테스트로 고정한다.
 * 위반은 라이트에선 멀쩡해 보이고 다크(또는 외관 강제로 LaF와 엇갈린 조합)에서만 깨지는
 * 유형이라 렌더 감사 전에 잡는다. 형식을 인식 못하는 루트 블록은 건너뛰지 않고 실패시킨다.
 */
class CssContractTest {
    private val css: String = requireNotNull(javaClass.getResourceAsStream("/themes/mts.css"))
        .use { it.readBytes().decodeToString() }
        .replace(Regex("/\\*.*?\\*/", RegexOption.DOT_MATCHES_ALL), "")

    /** 규칙 블록(셀렉터 → 선언부). @media 안 규칙도 내부 블록 단위로 잡힌다 */
    private val blocks: List<Pair<String, String>> =
        Regex("([^{}]+)\\{([^{}]*)\\}").findAll(css)
            .map { it.groupValues[1].trim().replace(Regex("\\s+"), " ") to it.groupValues[2] }
            .toList()

    /** 테마 루트 스코프: html(.mts-dark|.mts-laf-dark)?[data-mts-theme(="id")] */
    private val scope = Regex("^html(\\.mts-(?:laf-)?dark)?\\[data-mts-theme(?:=\"(\\w+)\")?]$")

    /** 코드펜스 배경·기본 글자색은 외관이 아니라 실제 LaF(mts-laf-dark)를 따른다 — CLAUDE.md 플랫폼 제약 */
    private val lafDomain = setOf("--mts-code-bg", "--mts-pre-fg")

    /** 라이트 색을 다크에서 일부러 그대로 쓰는 변수 → 근거. 추가할 때는 근거를 반드시 남긴다 */
    private val sharedByDesign = mapOf<String, String>()

    private val isColor = Regex(
        "#[0-9a-f]{3,8}\\b|\\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|light-dark|color)\\(" +
            "|\\b(?:white|black|gr[ae]y|silver|red|green|blue|yellow|orange|purple|pink|brown|navy|teal)\\b",
        RegexOption.IGNORE_CASE,
    )

    private fun declaredVars(body: String): Map<String, String> =
        Regex("(--[\\w-]+)\\s*:\\s*([^;]+)").findAll(body)
            .associate { it.groupValues[1] to it.groupValues[2].trim() }

    private fun usedWithoutFallback(body: String): Set<String> =
        Regex("var\\(\\s*(--[\\w-]+)\\s*\\)").findAll(body).map { it.groupValues[1] }.toSet()

    /** 결합자 없는 셀렉터 파트에 테마·외관 스코프 표식이 있으면 루트 블록 후보 (:root·접두 없는 형태 포함) */
    private fun rootLike(part: String) = !part.trim().contains(' ') &&
        listOf("data-mts-theme", "mts-dark", "mts-laf-dark").any { it in part }

    @Test
    fun `테마 루트 블록은 모두 인식 가능한 형식이다`() {
        val unknown = blocks.filter { (sel, body) ->
            declaredVars(body).isNotEmpty() &&
                (sel.contains(',') && sel.split(',').any { rootLike(it) } ||
                    !sel.contains(',') && rootLike(sel) && scope.matchEntire(sel) == null)
        }.map { it.first }
        assertTrue(unknown.isEmpty(), "변수를 선언하는 루트 셀렉터를 인식 못함(목록·작은따옴표·순서 변형) — 계약 검사가 건너뛴다: $unknown")
    }

    @Test
    fun `fallback 없이 쓰는 변수는 그 스코프에서 정의돼 있다`() {
        // 셀렉터 파트 단위로 본다 — 목록의 각 파트가 서로 다른 테마일 수 있다
        val themeIdInSelector = Regex("data-mts-theme=\"(\\w+)\"")
        val themeDefs = mutableMapOf<String, MutableSet<String>>() // 테마 id → 그 테마 셀렉터에서 정의한 변수
        val globalDefs = mutableSetOf<String>() // 테마 id에 묶이지 않은 정의(공용 루트·요소 규칙·위젯)
        for ((sel, body) in blocks) {
            val vars = declaredVars(body).keys
            if (vars.isEmpty()) continue
            for (part in sel.split(',').map { it.trim() }) {
                // 다크 루트는 정의 출처로 치지 않는다 — 라이트에 없는 변수가 다크에만 있으면 라이트에서 미정의다
                if (scope.matchEntire(part)?.groupValues?.get(1)?.isNotEmpty() == true) continue
                val id = themeIdInSelector.find(part)?.groupValues?.get(1)
                if (id != null) themeDefs.getOrPut(id) { mutableSetOf() } += vars else globalDefs += vars
            }
        }
        val problems = blocks.flatMap { (sel, body) ->
            val used = usedWithoutFallback(body)
            sel.split(',').map { it.trim() }.flatMap { part ->
                val id = themeIdInSelector.find(part)?.groupValues?.get(1)
                used.mapNotNull { v ->
                    when {
                        v in globalDefs -> null
                        id != null -> if (v in themeDefs[id].orEmpty()) null else "[$part] $v — $id 테마에 정의 없음"
                        else -> themeDefs.filterValues { v !in it }.keys.takeIf { it.isNotEmpty() }
                            ?.let { "[$part] $v — 공용 규칙인데 ${it.sorted()} 테마에 정의 없음" }
                    }
                }
            }
        }.distinct()
        assertTrue(problems.isEmpty(), "미정의 변수(fallback 없음):\n${problems.joinToString("\n")}")
    }

    @Test
    fun `라이트 블록의 색 변수는 올바른 다크 도메인에서 재정의된다`() {
        // 외관 도메인(mts-dark) 변수는 mts-dark에, LaF 도메인(코드펜스) 변수는 mts-laf-dark에만 있어야 한다.
        // 잘못된 도메인에 두면 외관을 강제해 LaF와 엇갈린 조합에서만 깨진다(mts_audit는 이 조합을 못 본다)
        val light = mutableMapOf<String, MutableMap<String, String>>()
        val appDark = mutableMapOf<String, MutableSet<String>>()
        val lafDark = mutableMapOf<String, MutableSet<String>>()
        for ((sel, body) in blocks) {
            val m = scope.matchEntire(sel) ?: continue
            val key = m.groupValues[2] // "" = 공용 루트
            val vars = declaredVars(body)
            when (m.groupValues[1]) {
                "" -> light.getOrPut(key) { mutableMapOf() }.putAll(vars)
                ".mts-dark" -> appDark.getOrPut(key) { mutableSetOf() } += vars.keys
                else -> lafDark.getOrPut(key) { mutableSetOf() } += vars.keys
            }
        }
        val problems = light.flatMap { (key, vars) ->
            val where = key.ifEmpty { "(공용)" }
            vars.filterValues { isColor.containsMatchIn(it) }.keys
                .filterNot { it in sharedByDesign }
                .flatMap { v ->
                    val (home, other) = if (v in lafDomain) lafDark to appDark else appDark to lafDark
                    val homeName = if (v in lafDomain) "mts-laf-dark" else "mts-dark"
                    listOfNotNull(
                        "$where $v — $homeName 재정의 누락".takeIf { v !in home[key].orEmpty() },
                        "$where $v — 잘못된 도메인에 재정의됨".takeIf { v in other[key].orEmpty() },
                    )
                }
        }
        assertTrue(problems.isEmpty(), "다크 계약 위반:\n${problems.joinToString("\n")}")
    }

    @Test
    fun `스위처 견본 색은 테마 블록 색과 같다`() {
        // 견본은 테마 스코프 밖(Default에서도 보여야 함)이라 테마 변수를 참조할 수 없어 값을 복제한다 —
        // 테마 색을 바꾸고 견본을 잊으면 패널이 다른 테마를 보여 준다. 견본 포인트는 테마마다 대표 변수가 다르다
        val accentVar = mapOf("gh" to "--mts-link", "nt" to "--mts-icode-fg", "dc" to "--mts-link", "rd" to "--mts-border")
        fun themeVars(dark: Boolean, id: String): Map<String, String> {
            val sel = if (dark) "html.mts-dark[data-mts-theme=\"$id\"]" else "html[data-mts-theme=\"$id\"]"
            return blocks.filter { it.first == sel }.flatMap { declaredVars(it.second).entries }.associate { it.key to it.value }
        }
        fun swatchVars(dark: Boolean, id: String): Map<String, String> {
            val sel = (if (dark) "html.mts-dark " else "") + "#mts-root .mts-card[data-mts-id=\"$id\"]"
            return blocks.filter { it.first == sel }.flatMap { declaredVars(it.second).entries }.associate { it.key to it.value }
        }
        val problems = accentVar.flatMap { (id, accent) ->
            listOf(false, true).flatMap { dark ->
                val t = themeVars(dark, id)
                val sw = swatchVars(dark, id)
                val mode = if (dark) "다크" else "라이트"
                listOf("--mts-sw-bg" to "--mts-bg", "--mts-sw-fg" to "--mts-fg", "--mts-sw-accent" to accent)
                    .mapNotNull { (swVar, themeVar) ->
                        val want = t[themeVar]?.lowercase()
                        val got = sw[swVar]?.lowercase()
                        if (want != null && want == got) null else "$id $mode $swVar=$got ≠ 테마 $themeVar=$want"
                    }
            }
        }
        assertTrue(problems.isEmpty(), "견본 색 불일치:\n${problems.joinToString("\n")}")
    }
}

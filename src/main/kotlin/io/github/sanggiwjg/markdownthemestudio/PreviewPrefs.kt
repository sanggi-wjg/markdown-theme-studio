package io.github.sanggiwjg.markdownthemestudio

/**
 * preview 설정 값의 허용 목록·범위 — 위젯(mts.js)과 같아야 한다.
 * JS나 저장 파일(Settings Sync로 다른 IDE에서 온 값 포함)에서 들어온 값은 이 검증을 통과해야만 상태가 된다.
 */
internal object PrefValues {
    /** 견본 순서(위젯 카드·액션 팝업 공통). 'off'(Default)는 별도 항목 */
    val THEMES: List<String> = listOf("gh", "nt", "dc", "rd")
    const val OFF = "off"
    val THEME_IDS: Set<String> = THEMES.toSet() + OFF
    val APPEARANCES: Set<String> = setOf("auto", "light", "dark")
    val OFFSETS: IntRange = -3..3
    const val DEFAULT_THEME = "gh"
    const val DEFAULT_APPEARANCE = "auto"
}

/**
 * IDE가 원천인 preview 설정 — 위젯이 localStorage에 두던 값 전부(테마·외관·글자 크기·본문 폭 오프셋).
 * 그대로 앱 레벨 PersistentStateComponent의 상태라 XML로 저장되고 Settings Sync로 IDE 간에 동기화된다.
 *
 * [revision]은 변경마다 바뀌는 불투명한 값(epoch ms 기반, 같은 IDE에선 단조 증가)이다. 0이면 이 IDE에
 * 아직 값이 저장된 적이 없다는 뜻 — preview가 localStorage에 가진 기존 선택을 올리는(마이그레이션) 기준이다.
 * preview는 동등 비교만 한다(크기 비교 없음 — IDE 간 시계 차이에 무관).
 *
 * 직렬화: XmlSerializer는 final 필드를 건너뛴다(`@JvmField val`이면 빈 `<PreviewPrefs />`로 저장된다 — 단위
 * 테스트로 확인) — 그래서 public 가변 필드(`@JvmField var`) + 전 필드 기본값(무인자 생성자)이다. 코드에서는 불변처럼
 * 다룬다: 바꿀 때는 항상 copy()로 새 인스턴스를 만들어 통째로 교체한다(SerializablePersistentStateComponent.updateState).
 */
data class PreviewPrefs(
    @JvmField var theme: String = PrefValues.DEFAULT_THEME,
    @JvmField var appearance: String = PrefValues.DEFAULT_APPEARANCE,
    @JvmField var fontSizeOffset: Int = 0,
    @JvmField var widthOffset: Int = 0,
    @JvmField var revision: Long = 0,
) {
    /** 저장 파일은 사용자가 고치거나 다른 버전·IDE에서 올 수 있다 — 허용 밖 값은 필드별로 기본값으로 돌린다 */
    fun sanitized(): PreviewPrefs = PreviewPrefs(
        theme = theme.takeIf { it in PrefValues.THEME_IDS } ?: PrefValues.DEFAULT_THEME,
        appearance = appearance.takeIf { it in PrefValues.APPEARANCES } ?: PrefValues.DEFAULT_APPEARANCE,
        fontSizeOffset = fontSizeOffset.takeIf { it in PrefValues.OFFSETS } ?: 0,
        widthOffset = widthOffset.takeIf { it in PrefValues.OFFSETS } ?: 0,
        revision = revision.coerceAtLeast(0),
    )

    fun sameValues(other: PreviewPrefs): Boolean =
        theme == other.theme && appearance == other.appearance &&
            fontSizeOffset == other.fontSizeOffset && widthOffset == other.widthOffset
}

/** 일부 필드만 바꾸는 변경 — 위젯은 바꾼 값만 보내 동시에 다른 경로(액션 등)에서 바뀐 필드를 덮지 않는다 */
internal data class PrefsPatch(
    val theme: String? = null,
    val appearance: String? = null,
    val fontSizeOffset: Int? = null,
    val widthOffset: Int? = null,
) {
    val isEmpty: Boolean get() = theme == null && appearance == null && fontSizeOffset == null && widthOffset == null

    fun applyTo(prefs: PreviewPrefs): PreviewPrefs = prefs.copy(
        theme = theme ?: prefs.theme,
        appearance = appearance ?: prefs.appearance,
        fontSizeOffset = fontSizeOffset ?: prefs.fontSizeOffset,
        widthOffset = widthOffset ?: prefs.widthOffset,
    )
}

internal sealed interface UpdateResult {
    /** 값이 바뀌어 새 revision으로 저장됐다 — 구독 중인 모든 preview에 방송된다 */
    data class Changed(val prefs: PreviewPrefs) : UpdateResult
    /** 이미 같은 값 — 저장·방송 없음 */
    data object Unchanged : UpdateResult
    /** 조건부 변경(base)이 현재 revision과 달라 거절됐다 — 보낸 쪽이 현재 상태로 맞춰야 한다 */
    data object Rejected : UpdateResult
}

/**
 * 순수 상태 전이 — [current]에 [patch]를 적용한 결과. [base]가 있으면 현재 revision과 같을 때만 적용한다
 * (compare-and-set: 마이그레이션·미확인 로컬 변경 재전송이 그 사이 다른 IDE·액션에서 바뀐 값을 덮지 않게).
 */
internal fun transition(current: PreviewPrefs, patch: PrefsPatch, base: Long?, now: Long): UpdateResult {
    if (base != null && base != current.revision) return UpdateResult.Rejected
    val next = patch.applyTo(current)
    // IDE에 아직 값이 없으면(revision 0) 같은 값이어도 revision을 매긴다 — 마이그레이션이든 명시적 선택이든
    // "이 IDE에 값이 생겼다"는 사실 자체가 변경이다(다른 IDE의 미이전 로컬 값이 이 선택을 덮지 못하게)
    if (next.sameValues(current) && current.revision != 0L) return UpdateResult.Unchanged
    return UpdateResult.Changed(next.copy(revision = maxOf(now, current.revision + 1)))
}

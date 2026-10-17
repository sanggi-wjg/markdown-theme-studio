package io.github.sanggiwjg.markdownthemestudio

import com.intellij.DynamicBundle
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.DefaultActionGroup
import com.intellij.openapi.project.DumbAwareAction
import com.intellij.openapi.project.DumbAwareToggleAction
import com.intellij.openapi.ui.popup.JBPopupFactory
import org.jetbrains.annotations.Nls
import org.jetbrains.annotations.PropertyKey

/**
 * Find Action "Switch Markdown Theme" — 테마 목록 팝업(현재 테마에 체크). 고르면 IDE 설정이 바뀌고,
 * 열린 preview 전부에 BrowserPipe로 바로 반영된다(Settings Sync로 다른 IDE에도). preview가 없어도 동작한다 —
 * 다음에 여는 preview가 이 값으로 뜬다. 단축키는 Keymap에서 이 액션에 지정할 수 있다.
 */
class SwitchThemeAction : DumbAwareAction() {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val group = DefaultActionGroup(themeChoices().map(::ThemeChoice))
        val current = ThemeStudioSettings.getInstance().prefs.theme
        JBPopupFactory.getInstance()
            .createActionGroupPopup(
                MtsBundle.message("popup.switch.theme.title"),
                group,
                e.dataContext,
                JBPopupFactory.ActionSelectionAid.SPEEDSEARCH,
                false,
                null,
                -1,
                // 현재 테마에 커서를 둔다 — 방향키 한 번으로 이웃 테마, Enter로 유지
                { it is ThemeChoice && it.id == current },
                null,
            )
            .showInBestPositionFor(e.dataContext)
    }

    private class ThemeChoice(val id: String) : DumbAwareToggleAction(MtsBundle.message("theme.$id")) {
        override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

        override fun isSelected(e: AnActionEvent): Boolean = ThemeStudioSettings.getInstance().prefs.theme == id

        // 라디오 의미 — 이미 선택된 항목을 다시 골라도(state=false) 그 테마로 둔다
        override fun setSelected(e: AnActionEvent, state: Boolean) {
            ThemeStudioSettings.getInstance().update(PrefsPatch(theme = id))
        }
    }

    companion object {
        /** 위젯과 같은 순서: 견본 4종 다음 Default */
        internal fun themeChoices(): List<String> = PrefValues.THEMES + PrefValues.OFF
    }
}

private const val BUNDLE = "messages.MarkdownThemeStudioBundle"

internal object MtsBundle : DynamicBundle(MtsBundle::class.java, BUNDLE) {
    @Nls
    fun message(@PropertyKey(resourceBundle = BUNDLE) key: String, vararg params: Any): String = getMessage(key, *params)
}

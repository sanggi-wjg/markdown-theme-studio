package io.github.sanggiwjg.markdownthemestudio

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
import com.intellij.serviceContainer.ComponentManagerImpl
import com.intellij.testFramework.junit5.TestApplication
import kotlin.test.Test
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * 설정 서비스는 plugin.xml `applicationService`로 등록해야 한다 — Settings Sync는 파일의 카테고리를 컴포넌트
 * 목록(`processAllImplementationClasses`)에서 찾는데, @Service 경량 서비스는 그 세션에서 처음 `service()`로
 * 불리기 전엔 목록에 없어 preview를 안 연 IDE가 원격 값을 건너뛴다(ThemeStudioSettings KDoc).
 */
@TestApplication
class PluginDescriptorTest {
    // 테스트들이 애플리케이션을 공유해 다른 테스트가 먼저 서비스를 만들면 아래 런타임 검사는 회귀를 놓칠 수
    // 있다 — 디스크립터·애노테이션을 직접 보는 이 검사가 순서와 무관하게 고정한다
    @Test
    fun `설정 서비스는 plugin xml에 등록되고 경량 서비스가 아니다`() {
        val xml = javaClass.classLoader.getResource("META-INF/plugin.xml")!!.readText()
        assertTrue(
            Regex("""<applicationService\s+serviceImplementation="${ThemeStudioSettings::class.java.name}"""").containsMatchIn(xml),
            "plugin.xml에 applicationService 등록이 없다",
        )
        assertNull(ThemeStudioSettings::class.java.getAnnotation(Service::class.java), "@Service 경량 서비스로 바뀌었다")
    }

    @Test
    fun `서비스가 만들어지기 전에도 Settings Sync가 보는 컴포넌트 목록에 있다`() {
        var found = false
        (ApplicationManager.getApplication() as ComponentManagerImpl).processAllImplementationClasses { c, _ ->
            if (c == ThemeStudioSettings::class.java) found = true
        }
        assertTrue(found)
    }
}

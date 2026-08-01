import org.jetbrains.intellij.platform.gradle.IntelliJPlatformType

plugins {
    id("org.jetbrains.kotlin.jvm") version "2.2.21"
    id("org.jetbrains.intellij.platform") version "2.18.1"
}

group = "io.github.sanggiwjg"
version = "0.1.0"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    intellijPlatform {
        // 최소 지원 버전(2025.1) 기준으로 컴파일해 상위 버전 호환성을 보장한다
        intellijIdeaCommunity("2025.1")
        bundledPlugin("org.intellij.plugins.markdown")
    }
    testImplementation(kotlin("test"))
    // IPGP가 주입하는 플랫폼 테스트 실행기가 JUnit4 클래스를 요구한다
    testRuntimeOnly("junit:junit:4.13.2")
}

kotlin {
    jvmToolchain(21)
    compilerOptions {
        // 251 번들 stdlib(2.1)과 언어 수준을 맞춘다
        apiVersion = org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_2_1
        languageVersion = org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_2_1
    }
}

tasks.test {
    useJUnitPlatform()
}

tasks.runIde {
    // 샌드박스 첫 실행 시 EUA/데이터 공유 다이얼로그가 크래시를 유발하므로 건너뛴다
    jvmArgs(
        "-Djb.consents.confirmation.enabled=false",
        "-Djb.privacy.policy.text=<!--999.999-->",
        "-Deap.require.definitive.answers=false",
        // preview 렌더링을 CDP로 직접 검증하기 위한 JCEF 원격 디버깅
        "-Dide.browser.jcef.debug.port=9223",
    )
}

intellijPlatform {
    buildSearchableOptions = false

    pluginConfiguration {
        id = "io.github.sanggiwjg.markdownthemestudio"
        name = "Markdown Theme Studio"
        version = project.version.toString()
        description = """
            Readable Markdown preview themes for JetBrains IDEs.
            Replaces the default Markdown preview styling with four polished themes
            (GitHub, Soft, Docs, Reader) tuned for typography, code blocks, tables and
            CJK text. Switch themes from a floating picker at the top-right corner of
            the preview panel; your choice is remembered. Light and dark variants
            follow the IDE theme automatically.
        """.trimIndent()

        changeNotes = """
            <h3>0.1.0</h3>
            <ul>
                <li>Initial release</li>
                <li>Four preview themes: GitHub, Soft, Docs, Reader</li>
                <li>Floating theme switcher in the preview panel (collapses to a dot while scrolling)</li>
                <li>Light/dark follows the IDE theme, with a manual override (auto/light/dark)</li>
                <li>Theme and appearance choices are remembered</li>
            </ul>
        """.trimIndent()

        vendor {
            name = "sanggi-wjg"
            url = "https://github.com/sanggi-wjg/markdown-theme-studio"
        }

        ideaVersion {
            sinceBuild = "251"
            untilBuild = "262.*"
        }
    }

    pluginVerification {
        ides {
            recommended()
            // recommended()가 최신 메이저를 아직 안 주는 경우 대비 — 사용자 실기기(2026.1)와
            // 최신 GA(2026.2) 명시. 253부터 IC 단독 배포가 없어 통합 IntelliJ IDEA 타입을 쓴다
            create(IntelliJPlatformType.IntellijIdea, "2026.1.1")
            create(IntelliJPlatformType.IntellijIdea, "2026.2")
        }
    }
}

import org.jetbrains.intellij.platform.gradle.IntelliJPlatformType

plugins {
    id("org.jetbrains.kotlin.jvm") version "2.2.21"
    id("org.jetbrains.intellij.platform") version "2.18.1"
}

group = "io.github.sanggiwjg"
version = "1.1.2"

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

// runIde·runIdeLatest 공용 — 두 샌드박스가 같은 조건으로 뜨게 한다
val sandboxJvmArgs = listOf(
    // 샌드박스 첫 실행 시 EUA/데이터 공유 다이얼로그가 크래시를 유발하므로 건너뛴다
    "-Djb.consents.confirmation.enabled=false",
    "-Djb.privacy.policy.text=<!--999.999-->",
    "-Deap.require.definitive.answers=false",
    // 클린 샌드박스에서 --args로 프로젝트를 열 때 신뢰 다이얼로그가 모달로 막는 것을 스킵
    "-Didea.trust.all.projects=true",
    // preview 렌더링을 CDP로 직접 검증하기 위한 JCEF 원격 디버깅
    "-Dide.browser.jcef.debug.port=9223",
)

tasks.runIde {
    jvmArgs(sandboxJvmArgs)
}

intellijPlatformTesting {
    runIde {
        // 실사용 최신 IDE 실렌더 검증용 — 2025.1 샌드박스에선 안 보이는 번들 Markdown 변화
        // (GitHub Alert·Compose 렌더러 선택 등)를 확인한다. 같은 디버깅 포트를 쓰므로 runIde와 동시 실행 불가.
        // -PlatestIdePath=<IDE 설치 경로>를 주면 다운로드 대신 로컬 설치본을 쓴다
        register("runIdeLatest") {
            val latestIdePath = providers.gradleProperty("latestIdePath")
            if (latestIdePath.isPresent) {
                localPath = file(latestIdePath.get())
            } else {
                type = IntelliJPlatformType.IntellijIdea
                version = "2026.2"
            }
            // 기본값이면 runIde(IC-2025.1) 샌드박스 디렉터리를 접미어만 바꿔 공유한다 — 분리
            sandboxDirectory = layout.projectDirectory.dir(".intellijPlatform/sandbox-latest")
            plugins {
                // 통합 IntelliJ IDEA를 라이선스 없이 무료 모드로 고정 — 체험판/로그인 창 방지
                disablePlugin("com.intellij.modules.ultimate")
            }
            task {
                jvmArgs(sandboxJvmArgs)
            }
        }
    }
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
            the preview panel, adjust the font size (A-/A+), or pick Default to keep
            the stock preview styling; your choices are remembered. Light and dark
            variants follow the IDE theme automatically.
        """.trimIndent()

        changeNotes = """
            <h3>1.1.2</h3>
            <ul>
                <li>Emoji with a text fallback (⚠️ and similar) now render in color instead of monochrome on macOS</li>
                <li>Docs theme: table borders fit the table instead of stretching across the page</li>
                <li>Dark appearance: unchecked task-list boxes render dark instead of a light filled square</li>
                <li>Reader theme: Korean headings use a Gothic fallback instead of Apple Myungjo, quotes use the body font, and justified text is gone</li>
                <li>Tables: short code tokens (String, Boolean, …) no longer break mid-word in wide tables</li>
                <li>Theme switcher stays readable at rest; code block scrollbars are thinner</li>
            </ul>
            <h3>1.1.1</h3>
            <ul>
                <li>Highlighted text and keyboard keys (mark/kbd) now get themed styling — readable in dark mode and resistant to custom CSS overrides</li>
                <li>Task list checkboxes follow the theme accent color for better dark-mode visibility</li>
            </ul>
            <h3>1.1.0</h3>
            <ul>
                <li>Code blocks now follow the IDE color scheme even when the appearance is manually overridden — syntax tokens stay readable in every combination</li>
                <li>Brighter light-mode code backgrounds tuned for syntax token contrast (Soft, Docs, Reader)</li>
                <li>Stable table column widths for CJK text — columns no longer collapse into vertical strips; long identifiers and URLs wrap instead of hogging width</li>
                <li>Content width adjustment (W- / W+) in the switcher, remembered like font size</li>
            </ul>
            <h3>1.0.0</h3>
            <ul>
                <li>Initial release</li>
                <li>Four preview themes: GitHub, Soft, Docs, Reader — plus Default to keep the stock preview styling</li>
                <li>Floating theme switcher in the preview panel (collapses to a dot while scrolling)</li>
                <li>Font size adjustment (A- / A+)</li>
                <li>Light/dark follows the IDE theme, with a manual override (auto/light/dark)</li>
                <li>Theme, appearance and font size choices are remembered</li>
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

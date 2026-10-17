#!/usr/bin/env python3
"""번들 Markdown 플러그인 계약 감시 — 테마가 암묵적으로 의존하는 업스트림 요소를 추출·비교한다.

테마는 기본 preview CSS(default.css), 번들 확장이 만드는 DOM 클래스(.run-icon, copy 버튼,
Alert 등), 확장점 선언, 렌더러 선택(JCEF/Compose)에 기대고 있다. 업스트림이 이걸 바꾸면 테마가
조용히 깨지므로, IDE 설치본에서 계약을 뽑아 커밋된 메이저별 스냅샷과 diff한다.

사용법:
  upstream_contract.py extract <출력 디렉터리> <IDE 루트 또는 상위 디렉터리>...
      → 찾은 IntelliJ IDEA(IU/IC) 메이저마다(최고 빌드) <출력>/markdown-contract-<메이저>.txt 생성
  upstream_contract.py compare <추출 디렉터리> <스냅샷 디렉터리>
      → 같은 메이저 스냅샷과 비교. 새 메이저면 가장 최근 스냅샷과 비교.
        exit 0 변화 없음 / 3 계약 변화 / 2 감시 불능(스냅샷 없음·최신 메이저 미추출).
        1은 쓰지 않는다 — 파이썬 크래시·사용법 오류가 1이라 drift와 섞이면 고장이 경고로 묻힌다
"""
import difflib
import hashlib
import glob
import json
import os
import re
import sys
import zipfile

# 테마(mts.css)와 하네스가 직접 겨냥하는 번들 DOM 클래스·변수·요소 — 사라지면 해당 규칙이 죽는다.
# 생성 코드(.class/.js, GFM 라이브러리 포함)에서 단어 경계로 찾는다 — CSS 셀렉터는 아래 css 섹션이 따로 본다
MARKERS = [
    "--default-font-size",  # mts.css가 재정의해 body font-size !important를 우회한다
    "code-fence",
    "code-fence-highlighter-copy-button",
    "run-icon",
    "run-icon-line",  # 2026.1+ 인라인 코드·펜스 줄 실행 링크 (2025.1은 run-icon)
    "code-block",
    "data-command",  # 실행 링크 공통 속성 — mts.css 숨김 안전망 a[data-command]가 기댄다
    "frontmatter-header",
    "markdown-alert",
    "markdown-alert-title",
    "markdown-alert-icon",
    "task-list-item",
    # 마크다운 취소선 span.user-del — mts.css 취소선 흐림·색·배경 리셋이 기댄다. 클래스 이름이 아니라 GFM 라이브러리가
    # 다는 속성 리터럴로 찾는다: 이름만으로는 2026.3 에디터 라이브 프리뷰(HeadingPainter CSS)에도 있어 GFM 렌더가
    # 바뀌어도 늘 present가 된다
    'class="user-del"',
    "mjx-container",
]
EP = "org.intellij.markdown.browserPreviewExtensionProvider"


def ide_roots(base):
    """base 아래에서 plugins/markdown/lib를 가진 IDE 루트를 찾는다 (macOS .app/Contents 포함)."""
    roots = set()
    for lib in glob.glob(os.path.join(base, "**", "plugins", "markdown", "lib"), recursive=True):
        roots.add(os.path.dirname(os.path.dirname(os.path.dirname(lib))))
    return sorted(roots)


def product_info(root):
    for p in (os.path.join(root, "product-info.json"), os.path.join(root, "Resources", "product-info.json")):
        if os.path.exists(p):
            with open(p) as f:
                info = json.load(f)
            return info.get("productCode", "?"), info.get("buildNumber", "?")
    return "?", "?"


def normalize_css(text):
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    # 인라인 폰트 등 data URL은 diff를 못 읽게 만든다 — 내용 해시로 줄인다
    text = re.sub(r"url\(\s*['\"]?data:[^)]*\)",
                  lambda m: "url(data:sha256:%s)" % hashlib.sha256(m.group(0).encode()).hexdigest()[:12], text)
    rules = []
    for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", text):
        sel = " ".join(m.group(1).split())
        decls = [" ".join(d.split()) for d in m.group(2).split(";") if d.strip()]
        rules.append("%s { %s }" % (sel, "; ".join(decls)))
    return rules


def extract(root):
    plugin_jars = sorted(glob.glob(os.path.join(root, "plugins", "markdown", "lib", "**", "*.jar"), recursive=True))
    # GFM 렌더(task-list-item·체크박스 등)는 IDE lib의 마크다운 라이브러리(org.intellij.markdown)가 만든다.
    # 담긴 jar 이름이 버전마다 다르다(251 lib-client.jar, 262+ intellij.libraries.markdown.jar) — 패키지로 고른다
    library_jars = sorted(glob.glob(os.path.join(root, "lib", "*.jar")))
    css, resources, xml_texts, blobs = {}, set(), [], []
    for jar in plugin_jars + library_jars:
        in_plugin = jar in plugin_jars
        with zipfile.ZipFile(jar) as z:
            for name in z.namelist():
                if not in_plugin and not name.startswith("org/intellij/markdown/"):
                    continue
                if in_plugin and name.endswith(".css") and not name.startswith("META-INF/"):
                    css[os.path.basename(name)] = normalize_css(z.read(name).decode("utf-8", "replace"))
                if in_plugin and name.endswith((".css", ".js")) and not name.startswith("META-INF/"):
                    resources.add(os.path.basename(name))
                if in_plugin and name.endswith(".xml"):
                    xml_texts.append(z.read(name).decode("utf-8", "replace"))
                if name.endswith((".class", ".js")):
                    blobs.append(z.read(name))
    blob = b"\n".join(blobs)
    xml = "\n".join(xml_texts)

    out = ["[extension point]"]
    m = re.search(r'<extensionPoint[^>]*qualifiedName="%s"[^>]*/?>' % re.escape(EP), xml)
    out.append(" ".join(m.group(0).split()) if m else "MISSING " + EP)

    out.append("[html panel providers]")
    out += sorted(set(re.findall(r'<html\.panel\.provider\s+implementation="([^"]+)"', xml)))

    out.append("[markdown registry defaults]")
    regs = set()
    for tag in re.findall(r"<registryKey\b[^>]*>", xml):  # 속성 순서와 무관하게 읽는다
        key = re.search(r'\bkey="([^"]*)"', tag)
        val = re.search(r'\bdefaultValue="([^"]*)"', tag)
        if key and "markdown" in key.group(1):
            regs.add("%s=%s" % (key.group(1), val.group(1) if val else "?"))
    out += sorted(regs)

    out.append("[dom markers]")
    for mk in MARKERS:
        # 부분 문자열이면 markdown-alert가 markdown-alert-title 덕에 늘 present가 된다 — 경계로 찾는다
        found = re.search(rb"(?<![\w-])" + re.escape(mk.encode()) + rb"(?![\w-])", blob)
        out.append("%s: %s" % (mk, "present" if found else "ABSENT"))

    out.append("[preview resources]")
    out += sorted(resources)

    if "default.css" not in css:
        out += ["[css default.css]", "MISSING default.css"]
    for name in sorted(css):
        out.append("[css %s]" % name)
        out += css[name]
    return out


def major(build):
    return build.split(".")[0]


def build_key(build):
    return [int(x) if x.isdigit() else 0 for x in build.split(".")]


def cmd_extract(outdir, bases):
    # 메이저마다 가장 높은 빌드 하나를 대표로 — 다른 IDE도 같은 번들 Markdown을 쓰므로 IntelliJ IDEA만 본다
    best = {}
    for base in bases:
        for root in ide_roots(base):
            code, build = product_info(root)
            if code not in ("IU", "IC"):
                continue
            mj = major(build)
            if mj not in best or build_key(build) > build_key(best[mj][1]):
                best[mj] = (code, build, root)
    if not best:
        print("IntelliJ IDEA 설치본을 찾지 못함: %s" % " ".join(bases), file=sys.stderr)
        sys.exit(2)
    os.makedirs(outdir, exist_ok=True)
    for mj, (code, build, root) in sorted(best.items()):
        path = os.path.join(outdir, "markdown-contract-%s.txt" % mj)
        with open(path, "w") as f:
            f.write("# %s-%s\n" % (code, build))
            f.write("\n".join(extract(root)) + "\n")
        print("extracted %s-%s → %s" % (code, build, path))


def body(path):
    with open(path) as f:
        return [line for line in f.read().splitlines() if not line.startswith("# ")]


def cmd_compare(extracted, snapshots):
    """exit 0 = 변화 없음, 3 = 계약 변화(drift), 2 = 감시 불능(스냅샷·추출 누락). 1(크래시)과 겹치지 않게 한다."""
    snaps = {re.search(r"-(\d+)\.txt$", p).group(1): p
             for p in glob.glob(os.path.join(snapshots, "markdown-contract-*.txt"))}
    if not snaps:
        print("## 비교할 스냅샷 없음: %s" % snapshots)
        sys.exit(2)
    newest = int(max(snaps))
    changed, compared = False, 0
    for cur in sorted(glob.glob(os.path.join(extracted, "markdown-contract-*.txt"))):
        mj = re.search(r"-(\d+)\.txt$", cur).group(1)
        # 스냅샷보다 오래된 메이저는 이미 지나간 버전 — 캐시에 남은 IDE가 섞여도 감시하지 않는다
        if mj not in snaps and int(mj) < newest:
            continue
        compared += 1
        base = snaps.get(mj) or snaps[max(snaps)]
        label = "새 메이저 %s — 직전 스냅샷과 비교" % mj if mj not in snaps else "메이저 %s" % mj
        diff = list(difflib.unified_diff(body(base), body(cur), os.path.basename(base), os.path.basename(cur), lineterm="", n=0))
        if diff or mj not in snaps:
            changed = True
            print("## %s (%s)" % (label, open(cur).readline().strip("# \n")))
            print("```diff")
            print("\n".join(diff) if diff else "(내용 동일 — 새 메이저 스냅샷만 추가하면 됨)")
            print("```")
        else:
            print("## %s: 변화 없음" % label)
    # 감시 대상(최신 스냅샷 이상)이 하나도 추출되지 않았으면 녹색이 아니라 감시 불능이다 —
    # IDE 해석 버그 등으로 EAP가 빠지면 Verifier와 계약 감시가 함께 조용히 통과해 버린다
    if not any(int(re.search(r"-(\d+)\.txt$", c).group(1)) >= newest
               for c in glob.glob(os.path.join(extracted, "markdown-contract-*.txt"))):
        print("## 감시 불능: 메이저 %d 이상의 IntelliJ IDEA가 추출되지 않음 (비교 %d건)" % (newest, compared))
        sys.exit(2)
    sys.exit(3 if changed else 0)


if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == "extract":
        cmd_extract(sys.argv[2], sys.argv[3:])
    elif len(sys.argv) == 4 and sys.argv[1] == "compare":
        cmd_compare(sys.argv[2], sys.argv[3])
    else:
        sys.exit(__doc__)

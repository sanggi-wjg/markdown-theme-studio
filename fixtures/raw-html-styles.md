# Raw HTML 인라인 style 픽스처

문서 안 raw HTML의 인라인 `style`·표현 속성(#63 단계적 존중) — 배치·조판 속성은 작성자 값, 글자색·배경은 **둘 다** 정했을 때만 작성자 값이다. 한쪽만 정하면 다크 외관에서도 읽히도록 테마가 맡는다. MkDocs·VitePress·Typora에서 옮겨 온 문서에 흔한 패턴이다.

## Markdown만 쓴 대조군

평범한 문단과 [링크](https://example.com), `인라인 코드`, **굵게**, ~~취소선~~.

> 평범한 인용문

| 키 | 값 |
|----|----|
| 첫 행 | 1 |
| 둘째 행 | `chip` |

---

## 배치·조판 — 작성자 값을 따른다

<p align="center">가운데 정렬 문단 — align="center"</p>

<p style="text-align: right">오른쪽 정렬 문단 — style="text-align: right"</p>

<h2 style="border-bottom:none">밑줄 없는 제목 — border-bottom:none</h2>

<h1 align="center">가운데 정렬 h1 — README 머리 패턴</h1>

<p style="font-size:12px">작은 각주 — font-size:12px. 본문보다 작게 보여야 한다.</p>

<p style="line-height:1.2; margin-top:0">줄 간격 1.2 문단 — 여러 줄로 접히도록 충분히 긴 문장을 둔다. 테마 줄 간격(1.6~1.85)보다 촘촘해야 한다. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>

<table border="1">
<tr><th>키</th><th>값</th></tr>
<tr><td>border="1"</td><td>표 바깥 테두리는 작성자 값</td></tr>
</table>

<table align="center">
<tr><th>가운데</th><th>표</th></tr>
<tr><td>align="center"</td><td>표 위치는 작성자 값</td></tr>
</table>

<table>
<tr><th style="text-align:right">오른쪽 머리글</th><th style="white-space:normal">줄바꿈 허용 머리글 — white-space: normal이라 접힌다</th></tr>
<tr><td style="padding:2px 4px; border:2px dashed #888">dashed 셀·좁은 안쪽 여백</td><td style="font-size:12px">작은 셀</td></tr>
</table>

<p><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" width="48" height="48" style="border-radius:50%"> 둥근 아바타 — width·height 속성 + border-radius:50%</p>

<blockquote style="border-left:6px double #888; padding:4px 12px; margin-left:24px">작성자 인용 테두리 — 6px double, 들여쓰기 24px</blockquote>

<hr style="border-top:2px dashed #888; height:0; background:none">

<p><del style="opacity:0.4">작성자 흐림 취소선 — opacity:0.4</del> · <a href="#" style="text-decoration:underline wavy">물결 밑줄 링크</a> · <code style="font-size:13px; border:1px solid #aaa">테두리 코드</code></p>

## 글자색·배경 — 둘 다 정했을 때만 작성자 값

<p style="color:#333">짙은 회색 안내 문구 — 글자색만(color:#333): 테마 글자색이라 다크에서도 읽힌다</p>

<p style="background:#fff3b0">문단 배경만(background:#fff3b0) — 테마가 맡는다(배경 없음)</p>

<p style="background:#fff3b0; color:#000">문단 배경 + 글자(둘 다) — 노란 배경 검정 글자. 안의 <a href="#">링크</a>, <code>코드</code>, <kbd>Ctrl</kbd>, <mark>마크</mark>, <strong>굵게</strong>는 작성자 색에 맞춘다</p>

<p>span(테마가 다루지 않는 요소): <span style="background:#fff3b0">배경만</span> · <span style="background:#fff3b0; color:#000">배경 + 글자</span> · <span style="color:#000000;background-color:transparent;font-size:11pt">Google Docs 붙여넣기 형태</span></p>

<table style="color:#000; background:#fff">
<thead><tr><th>작성자 색 표</th><th>값</th></tr></thead>
<tbody><tr><td>첫 행</td><td>1</td></tr><tr><td>둘째 행 <code>chip</code></td><td><a href="#">링크</a></td></tr></tbody>
</table>

<table>
<tr><th>셀 배경만</th><th>셀 배경 + 글자</th></tr>
<tr><td style="background:#ffd6d6">background만 — 테마</td><td style="background:#ffd6d6; color:#000">둘 다 — 작성자</td></tr>
<tr><td bgcolor="#ffd6d6">bgcolor 속성 — 테마</td><td style="background-color:#fff">background-color만 — 테마</td></tr>
</table>

<div style="background:#272822; color:#f8f8f2; padding:8px 12px">
<h3>어두운 작성자 블록</h3>
<p>안의 <a href="#">링크</a>와 <code>코드</code>, <strong>굵게</strong> — 라이트 외관에서도 읽혀야 한다</p>
</div>

<pre style="background:#272822; color:#f8f8f2">작성자 pre — 배경과 글자를 둘 다 정했다</pre>

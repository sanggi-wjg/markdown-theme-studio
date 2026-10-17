// Markdown Theme Studio — IDE 설정 동기화 브리지. mts.js보다 먼저 로드되고 mts.js가 window.__mtsSync로 붙는다.
// 서빙 시 Kotlin(PreviewSettingsSync)이 IDE 상태 프리루드를 앞에 붙인다:
//   window.__mtsIde = {"pipe":true,"rev":<IDE revision>,"theme":"gh","appearance":"auto","fs":0,"w":0};
// 이 파일이나 프리루드가 없으면(정적 하네스·서빙 실패) mts.js는 localStorage만으로 동작한다.
//
// 상태 원천은 IDE 설정(앱 레벨 → Settings Sync로 IDE 간 동기화)이고 localStorage는 미러이자 강등 경로다.
// 초기값 우선순위(connect):
//   1. IDE에 값이 없으면(rev 0) 로컬 값을 쓴다. 기본값이 아니면 IDE로 올린다 — 마이그레이션(조건부: base=0)
//   2. 로컬에 IDE가 확인하지 않은 변경(pending)이 있고 그 뒤로 IDE 값이 바뀌지 않았으면(rev 같음) 로컬을 쓰고
//      다시 올린다(조건부: base=rev) — JS→IDE 경로가 없거나 실패하는 환경에서도 위젯 선택이 유지된다
//   3. 그 밖에는 IDE 값을 쓰고 로컬 미러를 맞춘다
// 이후: 위젯 변경은 로컬에 미확인으로 적고 IDE로 보낸다. IDE가 보낸 상태(다른 preview·액션·Settings Sync)는 바로 적용한다.
//
// 메시지(BrowserPipe — JS는 IdeReady 뒤에만 post할 수 있어 그 전에는 큐에 쌓는다):
//   JS→IDE mts:set   "seq=3&base=0&theme=nt&fs=1"  바꾼 필드만. base가 있으면 IDE revision이 같을 때만 적용
//   JS→IDE mts:ready ""                            보낼 변경이 없을 때 현재 상태를 요청(서빙~로드 사이 변경 보정)
//   IDE→JS mts:state {"rev":…,"theme":…,…[,"seq":n]}  seq는 이 preview가 보낸 변경의 확인
(function () {
  'use strict';

  var REV_KEY = 'mts-ide-rev'; // 로컬 미러가 마지막으로 맞춰진 IDE revision
  var PENDING_KEY = 'mts-pending'; // '1' = IDE가 아직 확인하지 않은 로컬 변경이 있다
  var FIELDS = ['theme', 'appearance', 'fs', 'w'];

  var ide = window.__mtsIde;
  var tools = window.__IntelliJTools;
  var pipe = tools && tools.messagePipe;
  var canPost = !!(ide && ide.pipe === true && pipe && typeof pipe.post === 'function');

  var normalize = null; // mts.js가 준다 — 값 허용 목록·범위는 위젯이 소유한다
  var onRemote = null;
  var shownRev = null; // 지금 보이는 값이 기준으로 삼는 IDE revision
  var lastSeq = 0;
  var ready = false;
  var queue = [];

  function validRev(v) {
    return typeof v === 'number' && v >= 0 && Math.floor(v) === v && v <= Number.MAX_SAFE_INTEGER;
  }

  function readMeta() {
    try {
      var rev = localStorage.getItem(REV_KEY);
      return {
        rev: rev !== null && /^\d{1,16}$/.test(rev) ? parseInt(rev, 10) : null,
        pending: localStorage.getItem(PENDING_KEY) === '1'
      };
    } catch (e) {
      return { rev: null, pending: false };
    }
  }

  function writeMeta(rev, pending) {
    try {
      if (rev === null) localStorage.removeItem(REV_KEY);
      else localStorage.setItem(REV_KEY, String(rev));
      localStorage.setItem(PENDING_KEY, pending ? '1' : '0');
    } catch (e) { /* persistence unavailable */ }
  }

  function same(a, b) {
    for (var i = 0; i < FIELDS.length; i++) if (a[FIELDS[i]] !== b[FIELDS[i]]) return false;
    return true;
  }

  function encode(fields) {
    return Object.keys(fields).map(function (k) {
      return k + '=' + encodeURIComponent(String(fields[k]));
    }).join('&');
  }

  function post(tag, data) {
    if (!canPost) return;
    if (!ready) {
      queue.push([tag, data]);
      return;
    }
    try {
      pipe.post(tag, data);
    } catch (e) { /* 확인 응답이 안 오면 pending이 남아 다음 로드에서 다시 보낸다 */ }
  }

  // 위젯 변경 → 로컬 미확인 표시 + IDE 전송. base: 조건부 전송의 기준 revision(없으면 무조건 적용)
  function send(fields, base) {
    lastSeq++;
    // IDE 값을 못 받은 페이지(shownRev 없음)는 기준 revision을 모른다 — 기존 기준을 그대로 둔다
    writeMeta(shownRev !== null ? shownRev : readMeta().rev, true);
    var data = { seq: lastSeq };
    if (base !== undefined) data.base = base;
    for (var k in fields) if (Object.prototype.hasOwnProperty.call(fields, k)) data[k] = fields[k];
    post('mts:set', encode(data));
  }

  function onIdeReady() {
    if (ready) return;
    ready = true;
    var pending = queue;
    queue = [];
    // 보낼 변경이 있으면 그 응답이 현재 상태를 실어 온다 — 없을 때만 따로 묻는다
    if (!pending.length) pending.push(['mts:ready', '']);
    pending.forEach(function (m) { post(m[0], m[1]); });
  }

  function onState(raw) {
    var msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    // rev 0 = IDE에 값이 없음 — 로컬을 덮지 않는다
    if (!msg || !validRev(msg.rev) || msg.rev === 0 || !normalize) return;
    var state = normalize(msg);
    if (!state) return;
    var own = typeof msg.seq === 'number';
    // 이 preview가 뒤에 보낸 변경이 아직 가는 중이면 앞선 확인으로 되감지 않는다(A+ 연타 깜빡임)
    if (own && msg.seq < lastSeq) return;
    shownRev = msg.rev;
    writeMeta(msg.rev, false);
    if (onRemote) onRemote(state);
  }

  if (pipe && typeof pipe.subscribe === 'function') {
    try { pipe.subscribe('mts:state', onState); } catch (e) { /* 수신 불가 — 프리루드 값만 쓴다 */ }
  }
  window.addEventListener('IdeReady', onIdeReady);
  // IdeReady 뒤에 로드된 경우 대비(현재 플랫폼은 스크립트 실행 → 로드 끝 → IdeReady 순서라 해당 없음)
  if (tools && typeof tools.___jcefMessagePipePostToIdeFunction === 'function') onIdeReady();

  window.__mtsSync = {
    /**
     * opts: { local, defaults, normalize(raw) → state|null, apply(state) }
     * 반환: 처음 보여 줄 상태(local 그대로이거나 IDE 상태)
     */
    connect: function (opts) {
      normalize = opts.normalize;
      onRemote = opts.apply;
      var local = opts.local;
      var ideState = ide && validRev(ide.rev) ? normalize(ide) : null;
      if (!ideState) return local; // IDE 값을 못 받음 — localStorage만으로 동작
      var rev = ide.rev;
      var meta = readMeta();
      shownRev = rev;
      if (rev === 0) {
        if (!same(local, opts.defaults)) send(local, 0);
        return local;
      }
      if (meta.pending && meta.rev === rev) {
        send(local, rev);
        return local;
      }
      writeMeta(rev, false);
      return ideState;
    },
    /** 위젯에서 바꾼 필드만 */
    push: function (fields) {
      send(fields);
    }
  };
})();

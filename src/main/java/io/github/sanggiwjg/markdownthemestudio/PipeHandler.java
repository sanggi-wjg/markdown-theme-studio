package io.github.sanggiwjg.markdownthemestudio;

import org.intellij.plugins.markdown.ui.preview.BrowserPipe;
import org.jetbrains.annotations.NotNull;

import java.util.function.Consumer;

/**
 * BrowserPipe 구독 핸들러 — processMessageReceived만 구현한다. 251은 default 메서드, 252+는 추상이라
 * 구현하지 않으면 252+에서 AbstractMethodError가 난다. 251의 deprecated default {@code messageReceived}(252에서 삭제)는
 * 건드리지 않는다.
 * <p>
 * Java인 이유: 이 프로젝트의 Kotlin 설정(언어 수준 2.1, jvm-default 호환 모드)은 상속한 default 메서드마다
 * {@code invokespecial Handler.messageReceived}로 위임하는 브리지를 생성한다. 그러면 252+에는 없는 메서드 참조가
 * 바이트코드에 남아 Plugin Verifier가 미해결 메서드 호출로 잡는다. javac는 그런 브리지를 만들지 않는다.
 * <p>
 * true를 돌려준다 — 같은 type의 다른 구독자에게도 계속 전달(우리 tag는 우리만 쓴다).
 */
final class PipeHandler implements BrowserPipe.Handler {
  private final Consumer<String> onMessage;

  PipeHandler(@NotNull Consumer<String> onMessage) {
    this.onMessage = onMessage;
  }

  @Override
  public boolean processMessageReceived(@NotNull String data) {
    onMessage.accept(data);
    return true;
  }
}

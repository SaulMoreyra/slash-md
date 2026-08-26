import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCommentFixtures } from "./comments";
import { runDomainSuite } from "./domain/domainSuite";
import { runEditorTests } from "./editor";
import { runEditorRouterTests } from "./editorRouter";
import { runGithubSuite } from "./github/githubSuite";
import type { SuiteCtx } from "./harness";
import { runHomeControllerTests } from "./homeController";
import { runCrepeRoundtripSuite } from "./integration/crepeRoundtrip";
import { runHomeUtilsSuite } from "./webview/homeUtils";
import { runMessageListenerSuite } from "./webview/messageListeners";

/** Test runner entry — suites live under test/{domain,github,webview,integration}/. */
export async function run(): Promise<void> {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const fixturesDir = path.join(root, "fixtures");

  let failed = 0;

  const assert: SuiteCtx["assert"] = (ok, message) => {
    if (ok) {
      console.log(`ok  ${message}`);
      return;
    }
    failed += 1;
    console.error(`FAIL ${message}`);
  };

  const ctx: SuiteCtx = {
    assert,
    root,
    fixturesDir,
    fail: () => {
      failed += 1;
    },
    visible: (value) => value.replace(/\n/g, "¶\n"),
  };

  await runDomainSuite(ctx);
  runGithubSuite(ctx);
  await runCrepeRoundtripSuite(ctx);

  runEditorTests(assert);
  await runEditorRouterTests(assert);
  runHomeControllerTests(assert);
  await runCommentFixtures(assert);
  runHomeUtilsSuite(ctx);
  runMessageListenerSuite(ctx);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

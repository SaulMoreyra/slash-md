export type Assert = (ok: boolean, message: string) => void;

export type SuiteCtx = {
  assert: Assert;
  root: string;
  fixturesDir: string;
  /** Count failures for suites that report without using assert (e.g. crepe diffs). */
  fail: () => void;
  visible: (value: string) => string;
};

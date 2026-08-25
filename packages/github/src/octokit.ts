import { graphql } from "@octokit/graphql";
import { Octokit } from "@octokit/rest";

export function createOctokit(token: string): Octokit {
  return new Octokit({
    auth: token,
    userAgent: "slash-md",
    request: { timeout: 20_000 },
  });
}

export function createGraphql(token: string) {
  return graphql.defaults({
    headers: {
      authorization: `Bearer ${token}`,
      "user-agent": "slash-md",
    },
    request: { timeout: 25_000 },
  });
}

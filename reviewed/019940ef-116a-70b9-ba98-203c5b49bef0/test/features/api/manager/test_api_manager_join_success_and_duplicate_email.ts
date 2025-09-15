import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

export async function test_api_manager_join_success_and_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Generate random manager registration data
  const password = "StrongP@ssword123!";
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const name = RandomGenerator.name();
  const managerCreateBody = {
    email,
    password,
    name,
  } satisfies IJobPerformanceEvalManager.ICreate;

  // Step 2: First join attempt - should succeed
  const firstJoin: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(firstJoin);
  TestValidator.equals(
    "email matches on successful manager join",
    firstJoin.email,
    email,
  );
  TestValidator.predicate(
    "access token is present",
    typeof firstJoin.token.access === "string" &&
      firstJoin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    typeof firstJoin.token.refresh === "string" &&
      firstJoin.token.refresh.length > 0,
  );

  // Step 3: Duplicate join attempt with same email should throw error
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.manager.join(connection, {
        body: managerCreateBody,
      });
    },
  );
}

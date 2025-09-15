import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Tests unauthorized access to the job group retrieval endpoint.
 *
 * Attempts to retrieve job group details without any authentication token
 * or credentials and expects the call to fail with an authorization error
 * (401 or 403).
 *
 * This validates that role-based access control is properly enforced and
 * unauthorized users cannot access protected resources.
 *
 * Steps:
 *
 * 1. Register a manager account with the join endpoint as a setup step.
 * 2. Without authenticating the test connection, attempt to get job group by
 *    random UUID.
 * 3. Assert that the call throws an error indicating unauthorized access.
 */
export async function test_api_job_group_retrieve_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register a manager account with empty headers to avoid authentication token being set on connection
  const managerBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "StrongPass123!",
    name: RandomGenerator.name(),
  } satisfies IJobPerformanceEvalManager.ICreate;

  await api.functional.auth.manager.join(
    {
      ...connection,
      headers: {},
    },
    {
      body: managerBody,
    },
  );

  // 2. Attempt job group detail retrieval without authentication
  const randomJobGroupId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "unauthorized access should be rejected",
    async () => {
      await api.functional.jobPerformanceEval.manager.jobGroups.at(connection, {
        id: randomJobGroupId,
      });
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalJobGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroup";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";

/**
 * Test successful deletion of a job group by an authorized manager.
 *
 * This test function carries out an end-to-end workflow for the deletion of a
 * job group by a manager with proper authorization. The steps are:
 *
 * 1. Create a new manager account and authenticate.
 * 2. Use the authenticated manager to create a new job group.
 * 3. Perform deletion of the created job group.
 * 4. Verify that the job group is no longer accessible (attempt to delete again
 *    and verify failure).
 * 5. Attempt deletion by an unauthorized user to ensure rejection.
 *
 * This test ensures the correct business logic and security is enforced for the
 * job group deletion endpoint.
 */
export async function test_api_manager_jobgroup_delete_success(
  connection: api.IConnection,
) {
  // 1. Create a manager account and authenticate
  const managerCreateBody = {
    email: `manager${Date.now()}@example.com`,
    password: "strongPassword123!",
    name: "Test Manager",
  } satisfies IJobPerformanceEvalManager.ICreate;

  const authorizedManager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: managerCreateBody,
    });
  typia.assert(authorizedManager);

  // 2. Create a new job group with code as UUID string for deletion ID
  const jobGroupCode = typia.random<string & tags.Format<"uuid">>();
  const jobGroupCreateBody = {
    code: jobGroupCode,
    name: `JobGroup ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 })}`,
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IJobPerformanceEvalJobGroup.ICreate;

  const createdJobGroup: IJobPerformanceEvalJobGroup =
    await api.functional.jobPerformanceEval.manager.jobGroups.create(
      connection,
      {
        body: jobGroupCreateBody,
      },
    );
  typia.assert(createdJobGroup);

  // 3. Delete the created job group using the code UUID as id
  await api.functional.jobPerformanceEval.manager.jobGroups.erase(connection, {
    id: jobGroupCode,
  });

  // 4. Confirm deletion by attempting to delete the same job group again - expect error
  await TestValidator.error(
    "Should not allow deleting already deleted job group",
    async () => {
      await api.functional.jobPerformanceEval.manager.jobGroups.erase(
        connection,
        {
          id: jobGroupCode,
        },
      );
    },
  );

  // 5. Attempt deletion with unauthorized connection (no manager authorization)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "Unauthorized deletion attempt should be rejected",
    async () => {
      await api.functional.jobPerformanceEval.manager.jobGroups.erase(
        unauthConn,
        {
          id: jobGroupCode,
        },
      );
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementProjectMember";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";

/**
 * Validates behavior of the project members listing API when called by a
 * Project Manager (PM) user with invalid or non-existent project IDs.
 *
 * Steps:
 *
 * 1. Authenticate as a PM user to obtain authorization.
 * 2. Attempt to request project members with a non-existent, well-formed UUID
 *    projectId, expecting an error.
 *
 * Note: Testing with malformed UUID strings for projectId is not feasible due
 * to strict typing and is omitted.
 */
export async function test_api_project_member_index_pm_invalid_project_id(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as PM user
  const pmCreateBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@pm.example.com`,
    password: "testpassword",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmUser = await api.functional.auth.pm.join(connection, {
    body: pmCreateBody,
  });
  typia.assert(pmUser);

  // Step 2: Prepare non-existent projectId (valid UUID but unknown project)
  const nonExistentProjectId = typia.random<string & tags.Format<"uuid">>();

  // Prepare request body with explicit null for optional search
  const requestBody = {
    page: 1,
    limit: 10,
    search: null,
  } satisfies ITaskManagementProjectMember.IRequest;

  // Step 3: Call project members index with non-existent projectId and expect error
  await TestValidator.error(
    "should fail with non-existent projectId",
    async () => {
      await api.functional.taskManagement.pm.projects.members.index(
        connection,
        {
          projectId: nonExistentProjectId,
          body: requestBody,
        },
      );
    },
  );
}

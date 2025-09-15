import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementProjectMember";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Validate the behavior of the project members listing endpoint when given
 * invalid or non-existent project IDs.
 *
 * This test checks the failure scenario of attempting to list project
 * members for a project ID that does not exist in the database. It confirms
 * the system returns an appropriate error (e.g., 404 Not Found or access
 * denied).
 *
 * Steps:
 *
 * 1. Register and authenticate a new TPM user.
 * 2. Attempt to list members with a random UUID that plausibly doesn’t exist.
 * 3. Assertions ensure the API returns errors for invalid access.
 *
 * This ensures the project members API upholds strict validation and
 * authorization rules.
 */
export async function test_api_project_member_index_invalid_project_id(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a TPM user
  const joinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: "SecurePass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const authorizedUser = await api.functional.auth.tpm.join(connection, {
    body: joinBody,
  });
  typia.assert(authorizedUser);

  // Prepare a random but plausible non-existent projectId UUID
  const randomProjectId = typia.random<string & tags.Format<"uuid">>();

  // Prepare a valid but empty IRequest body
  const requestBody = {
    page: 1,
    limit: 10,
    search: null,
  } satisfies ITaskManagementProjectMember.IRequest;

  // Step 2: Attempt to index members with random non-existent projectId, expect error
  await TestValidator.error(
    "should reject non-existent projectId UUID",
    async () => {
      await api.functional.taskManagement.tpm.projects.members.index(
        connection,
        {
          projectId: randomProjectId,
          body: requestBody,
        },
      );
    },
  );
}

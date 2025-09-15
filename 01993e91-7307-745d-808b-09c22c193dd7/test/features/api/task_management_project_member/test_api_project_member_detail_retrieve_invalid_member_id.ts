import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Test unauthorized or invalid member detail retrieval in task management
 * projects for TPM role.
 *
 * This E2E test covers registering and authenticating a TPM user, creating a
 * project, and querying project members with invalid IDs to ensure proper error
 * handling.
 *
 * It verifies that invalid UUIDs or non-existing memberIds cause expected
 * errors, and that access to project member data is secure.
 *
 * Procedure:
 *
 * 1. Join as a TPM user.
 * 2. Create a project linked to the created TPM user.
 * 3. Attempt to retrieve member details with invalid IDs.
 * 4. Expect error responses to confirm no invalid data leakage.
 */
export async function test_api_project_member_detail_retrieve_invalid_member_id(
  connection: api.IConnection,
) {
  // Step 1: Authenticate TPM user
  const joinBody = {
    email: `invalid_test_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser = await api.functional.auth.tpm.join(connection, {
    body: joinBody,
  });
  typia.assert(tpmUser);

  // Step 2: Create project
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: `PRJ${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(),
    description: null,
  } satisfies ITaskManagementProject.ICreate;
  const project = await api.functional.taskManagement.tpm.projects.create(
    connection,
    { body: projectCreateBody },
  );
  typia.assert(project);

  // Step 3: Prepare invalid memberIds for retrieval attempts
  const invalidMemberIds = [
    // valid UUID but random (non-existent)
    typia.random<string & tags.Format<"uuid">>(),
    // another random UUID
    typia.random<string & tags.Format<"uuid">>(),
  ];

  // Step 4: Attempt to retrieve member with invalid member Id
  for (const memberId of invalidMemberIds) {
    await TestValidator.error(
      `retrieving member with invalid memberId ${memberId} should throw`,
      async () => {
        await api.functional.taskManagement.tpm.projects.members.at(
          connection,
          {
            projectId: project.id,
            memberId,
          },
        );
      },
    );
  }
}

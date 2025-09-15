import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * End-to-end test that validates project member deletion for authorized TPM
 * users.
 *
 * This test performs the following workflow:
 *
 * 1. TPM user registration and authentication.
 * 2. TPM user creation as a member.
 * 3. Project creation with the TPM user as owner.
 * 4. Adding the TPM user as a project member.
 * 5. Deleting the project member.
 * 6. Verifying the deletion by ensuring the member is removed from member list.
 *
 * The test validates authorization enforcement, data creation, deletion
 * success, and consistency of project membership management.
 *
 * @param connection The API connection instance.
 */
export async function test_api_project_member_deletion_tpm_role_authorized(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a TPM user
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const authorizedUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedUser);

  // 2. Create a TPM user for project member
  const tpmUserBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@tpm.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.ICreate;

  const createdTpmUser: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      {
        body: tpmUserBody,
      },
    );
  typia.assert(createdTpmUser);

  // 3. Create a project
  const projectBody = {
    owner_id: authorizedUser.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: null,
  } satisfies ITaskManagementProject.ICreate;

  const createdProject: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(createdProject);

  // 4. Create a project member linking the TPM user to the project
  const nowISOString = new Date().toISOString();

  const projectMemberBody = {
    project_id: createdProject.id,
    user_id: createdTpmUser.id,
    created_at: nowISOString,
    updated_at: nowISOString,
    deleted_at: null,
  } satisfies ITaskManagementProjectMember.ICreate;

  const createdMember: ITaskManagementProjectMember =
    await api.functional.taskManagement.tpm.projects.members.create(
      connection,
      {
        projectId: createdProject.id,
        body: projectMemberBody,
      },
    );
  typia.assert(createdMember);

  // 5. Delete the project member
  await api.functional.taskManagement.tpm.projects.members.erase(connection, {
    projectId: createdProject.id,
    memberId: createdMember.id,
  });

  // 6. Verify the member is deleted by fetching members and confirming absence
  // Note: No direct list API provided, so simplest is to confirm recreation works without duplicate error

  // Attempt to create the same project member again
  const recreatedMemberBody = {
    ...projectMemberBody,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies ITaskManagementProjectMember.ICreate;

  const recreatedMember: ITaskManagementProjectMember =
    await api.functional.taskManagement.tpm.projects.members.create(
      connection,
      {
        projectId: createdProject.id,
        body: recreatedMemberBody,
      },
    );
  typia.assert(recreatedMember);

  TestValidator.notEquals(
    "deleted member and recreated member IDs should differ",
    createdMember.id,
    recreatedMember.id,
  );
}

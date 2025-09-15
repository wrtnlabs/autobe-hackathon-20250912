import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Validate updating a project member by an authorized PMO user.
 *
 * This test authenticates a PMO user, creates a TPM user, creates a project,
 * creates a project member, then updates the member record. It asserts that all
 * entities are created properly, and that the member update persists with
 * expected data.
 */
export async function test_api_project_member_management_update_pmo_authorized(
  connection: api.IConnection,
) {
  // 1. Authenticate as PMO user
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@example.com",
        password: "ValidPassword123!",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPmo.IJoin,
    });
  typia.assert(pmoUser);

  // 2. Create TPM user
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@example.com",
        password: "ValidPassword123!",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpmUser);

  // 3. Create a project with TPM user as owner
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: {
        owner_id: tpmUser.id,
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 4. Create initial project member
  const now = new Date().toISOString();
  const projectMemberCreateBody = {
    project_id: project.id,
    user_id: tpmUser.id,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  } satisfies ITaskManagementProjectMember.ICreate;

  const projectMember: ITaskManagementProjectMember =
    await api.functional.taskManagement.pmo.projects.members.create(
      connection,
      {
        projectId: project.id,
        body: projectMemberCreateBody,
      },
    );
  typia.assert(projectMember);

  // 5. Update the project member information
  const updateBody = {
    deleted_at: null,
  } satisfies ITaskManagementProjectMember.IUpdate;

  const updatedMember: ITaskManagementProjectMember =
    await api.functional.taskManagement.pmo.projects.members.update(
      connection,
      {
        projectId: project.id,
        memberId: projectMember.id,
        body: updateBody,
      },
    );
  typia.assert(updatedMember);

  // 6. Validate that the updated member has correct ID and project ID
  TestValidator.equals(
    "Updated member has the same ID",
    updatedMember.id,
    projectMember.id,
  );
  TestValidator.equals(
    "Updated member belongs to the same project",
    updatedMember.project_id,
    project.id,
  );
}

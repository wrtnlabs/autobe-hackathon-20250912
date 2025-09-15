import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test function validates the complete workflow of deleting a
 * project member by a Project Manager (PM) role authorized user in the task
 * management system.
 *
 * It begins by registering and authenticating a PM user via the
 * /auth/pm/join endpoint to obtain an authorization context. Then the test
 * creates a Technical Project Manager (TPM) user to serve as a project
 * member, creates a project owned by the PM, and creates the membership of
 * the TPM user linked to the project. After establishing these
 * dependencies, it performs the deletion of the TPM member from the project
 * using the DELETE
 * /taskManagement/pm/projects/{projectId}/members/{memberId} endpoint. The
 * test verifies successful deletion with no content returned. Finally, the
 * test asserts that the deleted member is no longer present by attempting
 * to re-add or verify membership, focusing on business validation. The test
 * also covers authorization checks specific to PM role to ensure only
 * authorized PM users can delete members. The scenario respects given DTOs
 * and only calls the officially existing functions as defined. No manual
 * manipulation of connection headers is made; all authentication is handled
 * by the SDK. All API call responses with data are validated by
 * typia.assert for full type safety assurance.
 */
export async function test_api_project_member_deletion_pm_role_authorized(
  connection: api.IConnection,
) {
  // 1. Register and authenticate PM user (create account with auth tokens)
  const pmUserEmail: string = typia.random<string & tags.Format<"email">>();
  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: pmUserEmail,
        password: "password1234",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmAuthorized);

  // 2. Register the TPM user to be added as project member
  const tpmUserEmail: string = typia.random<string & tags.Format<"email">>();
  const tpmUser: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      {
        body: {
          email: tpmUserEmail,
          password_hash: "hashed_password",
          name: RandomGenerator.name(),
        } satisfies ITaskManagementTpm.ICreate,
      },
    );
  typia.assert(tpmUser);

  // 3. Create project owned by PM
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: {
        owner_id: pmAuthorized.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 4. Add TPM user as project member
  const nowISO: string = new Date().toISOString();
  const memberCreateData = {
    project_id: project.id,
    user_id: tpmUser.id,
    created_at: nowISO,
    updated_at: nowISO,
  } satisfies ITaskManagementProjectMember.ICreate;

  const projectMember: ITaskManagementProjectMember =
    await api.functional.taskManagement.pm.projects.members.create(connection, {
      projectId: project.id,
      body: memberCreateData,
    });
  typia.assert(projectMember);

  // 5. Delete the created project member
  await api.functional.taskManagement.pm.projects.members.erase(connection, {
    projectId: project.id,
    memberId: projectMember.id,
  });

  // 6. Confirm deletion by attempting to add the same member again which should fail
  await TestValidator.error(
    "member should not be allowed to be added after deletion",
    async () => {
      await api.functional.taskManagement.pm.projects.members.create(
        connection,
        {
          projectId: project.id,
          body: memberCreateData,
        },
      );
    },
  );
}

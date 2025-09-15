import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";

/**
 * This E2E test function validates the following scenario:
 *
 * 1. Create a Project Manager user by calling the PM join endpoint with valid
 *    data.
 * 2. Login as the PM user to obtain valid authorization tokens.
 * 3. Generate a valid UUID for a project ID.
 * 4. Create a project member linking the PM user to the generated project ID,
 *    setting timestamps and explicit null for deleted_at.
 * 5. Validate the creation response against the expected
 *    ITaskManagementProjectMember structure.
 * 6. Attempt to create a duplicate project member and expect an error.
 * 7. Attempt to create with invalid projectId (non-UUID) and verify error.
 * 8. Attempt to create without authentication and verify error.
 */
export async function test_api_project_member_creation_pm_role(
  connection: api.IConnection,
) {
  // 1. Join PM user
  const pmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPass123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;
  const pmUser = await api.functional.auth.pm.join(connection, {
    body: pmCreateBody,
  });
  typia.assert(pmUser);

  // 2. Login PM user
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;
  const pmLoginUser = await api.functional.auth.pm.login(connection, {
    body: pmLoginBody,
  });
  typia.assert(pmLoginUser);

  // 3. Generate projectId UUID
  const projectId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare project member creation data
  const nowISOString = new Date().toISOString();
  const projectMemberCreateBody = {
    project_id: projectId,
    user_id: pmUser.id,
    created_at: nowISOString,
    updated_at: nowISOString,
    deleted_at: null,
  } satisfies ITaskManagementProjectMember.ICreate;

  // 5. Create project member
  const projectMember =
    await api.functional.taskManagement.pm.projects.members.create(connection, {
      projectId,
      body: projectMemberCreateBody,
    });
  typia.assert(projectMember);
  TestValidator.equals(
    "Project member response has matching project_id",
    projectMember.project_id,
    projectId,
  );
  TestValidator.equals(
    "Project member response has matching user_id",
    projectMember.user_id,
    pmUser.id,
  );

  // 6. Try duplicate creation - expect error
  await TestValidator.error(
    "Creating duplicate project member should fail",
    async () => {
      await api.functional.taskManagement.pm.projects.members.create(
        connection,
        { projectId, body: projectMemberCreateBody },
      );
    },
  );

  // 7. Invalid projectId - expect error
  await TestValidator.error(
    "Invalid projectId format should fail",
    async () => {
      await api.functional.taskManagement.pm.projects.members.create(
        connection,
        {
          projectId: "invalid-uuid",
          body: {
            ...projectMemberCreateBody,
            project_id: "invalid-uuid",
          },
        },
      );
    },
  );

  // 8. Without authentication - expect error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "Unauthorized project member creation should fail",
    async () => {
      await api.functional.taskManagement.pm.projects.members.create(
        unauthenticatedConnection,
        { projectId, body: projectMemberCreateBody },
      );
    },
  );
}

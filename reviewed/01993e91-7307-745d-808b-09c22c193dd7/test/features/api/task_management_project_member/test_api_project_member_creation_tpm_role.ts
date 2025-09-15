import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_project_member_creation_tpm_role(
  connection: api.IConnection,
) {
  // 1. TPM user joins
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const authorizedUser = await api.functional.auth.tpm.join(connection, {
    body: joinBody,
  });
  typia.assert(authorizedUser);

  // 2. TPM user login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;

  const loggedInUser = await api.functional.auth.tpm.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedInUser);

  // 3. Create a project member
  const projectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const userId: string & tags.Format<"uuid"> = authorizedUser.id;
  const nowIsoString: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const createBody = {
    project_id: projectId,
    user_id: userId,
    created_at: nowIsoString,
    updated_at: nowIsoString,
  } satisfies ITaskManagementProjectMember.ICreate;

  const projectMember =
    await api.functional.taskManagement.tpm.projects.members.create(
      connection,
      {
        projectId: projectId,
        body: createBody,
      },
    );
  typia.assert(projectMember);

  TestValidator.equals(
    "project member project_id matches",
    projectMember.project_id,
    projectId,
  );
  TestValidator.equals(
    "project member user_id matches",
    projectMember.user_id,
    userId,
  );

  // 4. Test duplicate project member creation fails
  await TestValidator.error(
    "duplicate project member creation should fail",
    async () => {
      await api.functional.taskManagement.tpm.projects.members.create(
        connection,
        {
          projectId: projectId,
          body: createBody,
        },
      );
    },
  );
}

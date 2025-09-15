import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_project_deletion_success(
  connection: api.IConnection,
) {
  // 1. PMO join, register and authenticate
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: pmoJoinBody,
    });
  typia.assert(pmoUser);

  // 2. Switch to TPM user creation
  const tpmCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmCreateBody,
    });
  typia.assert(tpmUser);

  // 3. PMO user logs in
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoJoinBody.email,
      password: pmoJoinBody.password,
    } satisfies ITaskManagementPmo.ILogin,
  });

  // 4. PMO creates the project with TPM owner
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: `Project ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 5. PMO deletes the project
  await api.functional.taskManagement.pmo.projects.eraseProject(connection, {
    projectId: project.id,
  });

  // 6. Verify deleting the same project again throws
  await TestValidator.error(
    "Deleting the same project again throws",
    async () => {
      await api.functional.taskManagement.pmo.projects.eraseProject(
        connection,
        {
          projectId: project.id,
        },
      );
    },
  );

  // 7. Verify unauthorized deletion attempt by TPM user
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmCreateBody.email,
      password: tpmCreateBody.password,
    } satisfies ITaskManagementTpm.ILogin,
  });
  await TestValidator.error(
    "Unauthorized TPM user cannot delete project",
    async () => {
      await api.functional.taskManagement.pmo.projects.eraseProject(
        connection,
        {
          projectId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 8. Test deleting a random non-existant UUID project
  await TestValidator.error(
    "Deleting non-existent project ID throws",
    async () => {
      await api.functional.taskManagement.pmo.projects.eraseProject(
        connection,
        {
          projectId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}

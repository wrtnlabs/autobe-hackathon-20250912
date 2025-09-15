import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This scenario tests the deletion of a project by a PMO user. It covers
 * multi-actor authentication (PMO and TPM users), project creation,
 * authorization validation, and successful deletion workflow.
 *
 * Steps:
 *
 * 1. Register and authenticate a PMO user.
 * 2. Register and authenticate a TPM user.
 * 3. Create a project owned by the TPM user.
 * 4. Authenticate as the PMO user and delete the created project.
 * 5. Validate correct behavior.
 */
export async function test_api_project_delete_pmo(connection: api.IConnection) {
  // 1. PMO user joins (registers)
  const pmoJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: pmoJoinBody,
    });
  typia.assert(pmoUser);

  // 2. TPM user joins (registers)
  const tpmJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmJoinBody,
    });
  typia.assert(tpmUser);

  // 3. Authenticate as TPM user (refresh token in connection)
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmJoinBody.email,
      password: tpmJoinBody.password,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // 4. Create a project owned by the TPM user
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 5. Authenticate as PMO user (switch session)
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoJoinBody.email,
      password: pmoJoinBody.password,
    } satisfies ITaskManagementPmo.ILogin,
  });

  // 6. PMO user deletes the created project
  await api.functional.taskManagement.pmo.projects.eraseProject(connection, {
    projectId: project.id,
  });
}

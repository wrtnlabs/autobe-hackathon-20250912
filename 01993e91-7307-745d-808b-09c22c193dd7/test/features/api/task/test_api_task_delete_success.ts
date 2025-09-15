import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_task_delete_success(
  connection: api.IConnection,
) {
  // 1. TPM user registration and authentication
  const tpmUser = await api.functional.auth.tpm.join(connection, {
    body: {
      email: `tpmuser_${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "TestPass1234",
      name: RandomGenerator.name(),
    } satisfies ITaskManagementTpm.IJoin,
  });
  typia.assert(tpmUser);

  // 2. Create a project owned by TPM user
  const projectCreateBody = {
    owner_id: tpmUser.id,
    code: `PRJ_${RandomGenerator.alphaNumeric(6)}`,
    name: `Project ${RandomGenerator.name()}`,
    description: `Test project description`,
  } satisfies ITaskManagementProject.ICreate;

  const project = await api.functional.taskManagement.tpm.projects.create(
    connection,
    { body: projectCreateBody },
  );
  typia.assert(project);

  // 3. Create a board under the project
  const boardCreateBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: `BRD_${RandomGenerator.alphaNumeric(6)}`,
    name: `Board ${RandomGenerator.name()}`,
    description: `Test board description`,
  } satisfies ITaskManagementBoard.ICreate;

  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    {
      projectId: project.id,
      body: boardCreateBody,
    },
  );
  typia.assert(board);

  // 4. Create a task under the project and board
  const taskCreateBody = {
    status_id: typia.random<string & tags.Format<"uuid">>(),
    priority_id: typia.random<string & tags.Format<"uuid">>(),
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: `Task ${RandomGenerator.paragraph({ sentences: 3 })}`,
    description: `Description ${RandomGenerator.content({ paragraphs: 1 })}`,
  } satisfies ITaskManagementTask.ICreate;

  const task = await api.functional.taskManagement.tpm.tasks.create(
    connection,
    { body: taskCreateBody },
  );
  typia.assert(task);

  // 5. Delete the created task
  await api.functional.taskManagement.tpm.tasks.eraseTask(connection, {
    taskId: task.id,
  });
  // eraseTask returns void, no typia.assert needed
}

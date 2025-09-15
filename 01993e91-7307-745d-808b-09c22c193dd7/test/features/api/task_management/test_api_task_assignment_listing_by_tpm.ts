import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import type { ITaskManagementTaskAssignmentArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignmentArray";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This end-to-end test validates complete business workflow of a TPM user
 * listing all assignments of a task.
 *
 * Steps:
 *
 * 1. Register a TPM user.
 * 2. Authenticate TPM user to obtain JWT tokens with automatic header management.
 * 3. Create a unique status entity required for task creation.
 * 4. Create a unique priority entity required for task creation.
 * 5. Create a project owned by TPM user.
 * 6. Create a board under the project.
 * 7. Create a task linked with status, priority, creator, project, board.
 * 8. List all assignments of the created task via PATCH endpoint.
 * 9. Validate assignment array correctness and match to business rules.
 * 10. Validate error when listing assignments of a non-existent task.
 */
export async function test_api_task_assignment_listing_by_tpm(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register TPM user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const authorizedTPM = await api.functional.auth.tpm.join(connection, {
    body: joinBody,
  });
  typia.assert(authorizedTPM);

  // 2. Authenticate TPM user (redundant, but ensures token refresh)
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const loginResult = await api.functional.auth.tpm.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);

  // 3. Create a unique Task Status entity
  const statusCode = `status_${RandomGenerator.alphaNumeric(5)}`;
  const statusName = `Status ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const statusBody = {
    code: statusCode,
    name: statusName,
    description: `Auto created status ${statusCode}`,
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: statusBody,
      },
    );
  typia.assert(taskStatus);

  // 4. Create a unique Task Priority entity
  const priorityCode = `priority_${RandomGenerator.alphaNumeric(5)}`;
  const priorityName = `Priority ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const priorityBody = {
    code: priorityCode,
    name: priorityName,
    description: `Auto created priority ${priorityCode}`,
  } satisfies ITaskManagementPriority.ICreate;
  const taskPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: priorityBody,
      },
    );
  typia.assert(taskPriority);

  // 5. Create a Project
  const projectCode = `project_${RandomGenerator.alphaNumeric(5)}`;
  const projectName = `Project ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const projectBody = {
    owner_id: authorizedTPM.id,
    code: projectCode,
    name: projectName,
    description: `Auto created project ${projectCode}`,
  } satisfies ITaskManagementProject.ICreate;
  const project = await api.functional.taskManagement.tpm.projects.create(
    connection,
    {
      body: projectBody,
    },
  );
  typia.assert(project);

  // 6. Create a Board under the Project
  const boardCode = `board_${RandomGenerator.alphaNumeric(5)}`;
  const boardName = `Board ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const boardBody = {
    project_id: project.id,
    owner_id: authorizedTPM.id,
    code: boardCode,
    name: boardName,
    description: `Auto created board ${boardCode}`,
  } satisfies ITaskManagementBoard.ICreate;
  const board = await api.functional.taskManagement.tpm.projects.boards.create(
    connection,
    {
      projectId: project.id,
      body: boardBody,
    },
  );
  typia.assert(board);

  // 7. Create a Task linked to above entities
  const taskTitle = `Task ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const taskBody = {
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: authorizedTPM.id,
    project_id: project.id,
    board_id: board.id,
    title: taskTitle,
  } satisfies ITaskManagementTask.ICreate;
  const task = await api.functional.taskManagement.tpm.tasks.create(
    connection,
    {
      body: taskBody,
    },
  );
  typia.assert(task);

  // 8. List assignments of the created Task
  const assignments =
    await api.functional.taskManagement.tpm.tasks.assignments.indexTaskAssignments(
      connection,
      {
        taskId: task.id,
      },
    );
  typia.assert(assignments);

  // Validate returned assignment array is consistent
  TestValidator.predicate(
    "assignments data array should be an array",
    Array.isArray(assignments.data),
  );

  for (const assignment of assignments.data) {
    typia.assert(assignment);
    TestValidator.equals(
      "assignment task_id should match created task",
      assignment.task_id,
      task.id,
    );
    TestValidator.predicate(
      "assignment assignee_id should be a valid UUID",
      typeof assignment.assignee_id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          assignment.assignee_id,
        ),
    );
  }

  // 9. Test error on non-existent task ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Avoid using actual existing ID
  TestValidator.predicate(
    "non-existent taskId should not equal real task id",
    nonExistentId !== task.id,
  );
  await TestValidator.error(
    "listing assignments of non-existent task should fail",
    async () => {
      await api.functional.taskManagement.tpm.tasks.assignments.indexTaskAssignments(
        connection,
        {
          taskId: nonExistentId,
        },
      );
    },
  );
}

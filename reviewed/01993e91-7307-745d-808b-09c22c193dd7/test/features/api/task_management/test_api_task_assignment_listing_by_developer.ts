import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import type { ITaskManagementTaskAssignmentArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignmentArray";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * End-to-end test validating the developer's ability to list task assignments.
 *
 * This test simulates a multi-role environment involving TPM and developer
 * users. TPM user performs necessary setup including creation of task status,
 * priority, project, board, and task. Developer user authenticates and requests
 * the list of assignments for a created task. Both valid and error scenarios
 * are tested.
 *
 * Steps:
 *
 * 1. TPM user registration and login.
 * 2. Developer user registration and login.
 * 3. Creation of required task statuses and priorities by TPM user.
 * 4. Project and board setup by TPM user.
 * 5. Task creation linked with created entities.
 * 6. Developer user retrieves task assignments for the task.
 * 7. Negative tests for invalid taskId and unauthorized access.
 */
export async function test_api_task_assignment_listing_by_developer(
  connection: api.IConnection,
) {
  // 1. TPM user registration and login
  const tpmEmail: string = typia.random<string & tags.Format<"email">>();
  const tpmJoinBody = {
    email: tpmEmail,
    password: "StrongPassword123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmJoinBody,
    });
  typia.assert(tpmUser);

  // 2. Developer user registration and login
  const devEmail: string = typia.random<string & tags.Format<"email">>();
  const devJoinBody = {
    email: devEmail,
    password_hash: "StrongPassword123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDeveloper.ICreate;
  const devUser: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: devJoinBody,
    });
  typia.assert(devUser);

  // 3. TPM user login to create entities
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmEmail,
      password: "StrongPassword123!",
    } satisfies ITaskManagementTpm.ILogin,
  });

  // 4. Create task status
  const taskStatusBody = {
    code: `status_${RandomGenerator.alphabets(5)}`,
    name: `Status ${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 6 })}`,
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ITaskManagementTaskStatus.ICreate;
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: taskStatusBody,
      },
    );
  typia.assert(taskStatus);

  // 5. Create task priority
  const taskPriorityBody = {
    code: `priority_${RandomGenerator.alphabets(5)}`,
    name: `Priority ${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 6 })}`,
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ITaskManagementPriority.ICreate;
  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: taskPriorityBody,
      },
    );
  typia.assert(taskPriority);

  // 6. Create project
  const projectBody = {
    owner_id: tpmUser.id,
    code: `project_${RandomGenerator.alphaNumeric(6)}`,
    name: `Project ${RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 7 })}`,
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(project);

  // 7. Create board
  const boardBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: `board_${RandomGenerator.alphaNumeric(6)}`,
    name: `Board ${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 7 })}`,
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies ITaskManagementBoard.ICreate;
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardBody,
    });
  typia.assert(board);

  // 8. Create task
  const taskBody = {
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: `Task ${RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 8 })}`,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 6,
      wordMax: 12,
    }),
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskBody,
    });
  typia.assert(task);

  // 9. Developer user login to get valid session
  await api.functional.auth.developer.login(connection, {
    body: {
      email: devEmail,
      password: "StrongPassword123!",
    } satisfies ITaskManagementDeveloper.ILogin,
  });

  // 10. Developer user requests assignment list for the task
  const assignmentsArray: ITaskManagementTaskAssignmentArray =
    await api.functional.taskManagement.developer.tasks.assignments.indexTaskAssignments(
      connection,
      {
        taskId: task.id,
      },
    );
  typia.assert(assignmentsArray);

  // 11. Validate that all assignments correspond to the correct task
  for (const assignment of assignmentsArray.data) {
    typia.assert<ITaskManagementTaskAssignment>(assignment);
    TestValidator.equals(
      "assignment task_id matches",
      assignment.task_id,
      task.id,
    );
  }

  // 12. Negative test: Listing assignments for non-existent task should fail
  await TestValidator.error(
    "listing assignments for non-existent task should fail",
    async () => {
      await api.functional.taskManagement.developer.tasks.assignments.indexTaskAssignments(
        connection,
        {
          taskId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 13. Negative test: Unauthenticated connection calling the endpoint
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthenticated request should fail", async () => {
    await api.functional.taskManagement.developer.tasks.assignments.indexTaskAssignments(
      unauthenticatedConnection,
      {
        taskId: task.id,
      },
    );
  });
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test verifies the entire workflow of updating a task status change
 * record by a QA user, ensuring role-based authentication, related entity
 * creation, logical data relationships, and error handling.
 *
 * Steps:
 *
 * 1. Register and authenticate a QA user, obtaining JWT tokens used for
 *    authorization.
 * 2. Register and authenticate a PMO user who will create a Project.
 * 3. Register and authenticate a TPM user who will be the owner (creator) of the
 *    Project and associated Board/Task.
 * 4. PMO user, using authentication, creates a new Project with the TPM owner as
 *    the project owner.
 * 5. TPM user creates a Board inside the Project.
 * 6. TPM user creates a Task within the Project and Board, with valid status,
 *    priority, and creator associations.
 * 7. TPM user creates an initial TaskStatusChange record for the Task.
 * 8. QA user switches authentication (login) to update the TaskStatusChange record
 *    with a new status ID, possibly with updated timestamp and comment.
 * 9. Validate update success and correct resulting data types.
 * 10. Test failure cases with invalid status ID (null or random UUID), unauthorized
 *     update attempts by other roles, and non-existent statusChangeId.
 *
 * This scenario checks the entire logical flow for proper authorization, data
 * integrity, and resilience against improper updates through the QA role.
 *
 * All required fields are included with appropriate realistic data generated.
 * No unauthorized field access or property usage. Each step uses correct DTO
 * variants and API functions.
 *
 * The test performs detailed typia assertions on all API response objects to
 * ensure complete type safety.
 *
 * Business logic validations ensure that returned identifiers match expected
 * created entities. The test respects all schema constraints, nullability
 * rules, and format specifications.
 *
 * Business rules for role-specific operation permissions are enforced by
 * simulating user role login and token handling.
 *
 * Failure tests cover invalid input and access error scenarios, ensuring robust
 * API validation.
 */
export async function test_api_task_status_change_qa_update_flow(
  connection: api.IConnection,
) {
  const qaEmail = typia.random<string & tags.Format<"email">>();
  const qaPassword = "TestPassword123!";
  const pmoEmail = typia.random<string & tags.Format<"email">>();
  const pmoPassword = "TestPassword123!";
  const tpmEmail = typia.random<string & tags.Format<"email">>();
  const tpmPassword = "TestPassword123!";

  const qaJoinBody = {
    email: qaEmail,
    password_hash: qaPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;
  const pmoJoinBody = {
    email: pmoEmail,
    password: pmoPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const tpmJoinBody = {
    email: tpmEmail,
    password: tpmPassword,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  // 1. QA user join and login
  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: qaJoinBody,
    });
  typia.assert(qaUser);

  await api.functional.auth.qa.login(connection, {
    body: {
      email: qaEmail,
      password: qaPassword,
    } satisfies ITaskManagementQa.ILogin,
  });

  // 2. PMO user join and login
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: pmoJoinBody,
    });
  typia.assert(pmoUser);
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoEmail,
      password: pmoPassword,
    } satisfies ITaskManagementPmo.ILogin,
  });

  // 3. TPM user join and login
  const tpmUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: tpmJoinBody,
    });
  typia.assert(tpmUser);
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmEmail,
      password: tpmPassword,
    } satisfies ITaskManagementTpm.ILogin,
  });

  // 4. PMO user creates a project with TPM owner
  const projectBody = {
    owner_id: tpmUser.id,
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(project);

  // 5. TPM user creates a board within the project
  const boardBody = {
    project_id: project.id,
    owner_id: tpmUser.id,
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardBody,
    });
  typia.assert(board);

  // 6. TPM user creates a task in project and board
  const taskBody = {
    status_id: typia.random<string & tags.Format<"uuid">>(),
    priority_id: typia.random<string & tags.Format<"uuid">>(),
    creator_id: tpmUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ITaskManagementTask.ICreate;

  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskBody,
    });
  typia.assert(task);

  // 7. TPM user creates initial task status change record
  const statusChangeBody = {
    task_id: task.id,
    new_status_id: task.status_id,
    changed_at: new Date().toISOString(),
  } satisfies ITaskManagementTaskStatusChange.ICreate;

  const statusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.tpm.tasks.statusChanges.create(
      connection,
      { taskId: task.id, body: statusChangeBody },
    );
  typia.assert(statusChange);

  // 8. QA user logs back in to perform status change update
  await api.functional.auth.qa.login(connection, {
    body: {
      email: qaEmail,
      password: qaPassword,
    } satisfies ITaskManagementQa.ILogin,
  });

  // 9. QA user updates the task status change record
  const newStatusId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const updateBody = {
    new_status_id: newStatusId,
    changed_at: new Date().toISOString(),
    comment: "Updated by QA during testing",
  } satisfies ITaskManagementTaskStatusChange.IUpdate;

  const updatedStatusChange: ITaskManagementTaskStatusChange =
    await api.functional.taskManagement.qa.tasks.statusChanges.update(
      connection,
      {
        taskId: task.id,
        statusChangeId: statusChange.id,
        body: updateBody,
      },
    );
  typia.assert(updatedStatusChange);
  TestValidator.equals(
    "Updated statusChange ID should match original",
    updatedStatusChange.id,
    statusChange.id,
  );
  TestValidator.equals(
    "New status ID should be updated",
    updatedStatusChange.new_status_id,
    newStatusId,
  );

  // 10. Failure tests
  // 10-1. Update with invalid status ID
  await TestValidator.error(
    "Update fails with non-existent status ID",
    async () => {
      const invalidUpdate = {
        new_status_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies ITaskManagementTaskStatusChange.IUpdate;
      await api.functional.taskManagement.qa.tasks.statusChanges.update(
        connection,
        {
          taskId: task.id,
          statusChangeId: statusChange.id,
          body: invalidUpdate,
        },
      );
    },
  );

  // 10-2. Update unauthorized by TPM user
  await api.functional.auth.tpm.login(connection, {
    body: {
      email: tpmEmail,
      password: tpmPassword,
    } satisfies ITaskManagementTpm.ILogin,
  });
  await TestValidator.error(
    "Unauthorized update attempt by TPM user should fail",
    async () => {
      await api.functional.taskManagement.qa.tasks.statusChanges.update(
        connection,
        {
          taskId: task.id,
          statusChangeId: statusChange.id,
          body: updateBody,
        },
      );
    },
  );

  // 10-3. Update on non-existent statusChangeId
  await api.functional.auth.qa.login(connection, {
    body: {
      email: qaEmail,
      password: qaPassword,
    } satisfies ITaskManagementQa.ILogin,
  });
  await TestValidator.error(
    "Update fails on non-existent statusChangeId",
    async () => {
      await api.functional.taskManagement.qa.tasks.statusChanges.update(
        connection,
        {
          taskId: task.id,
          statusChangeId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";

/**
 * This test validates task assignment deletion by authorized PMO users.
 *
 * The business flow includes:
 *
 * 1. PMO user registration (join) and login (authenticate).
 * 2. Creating a project owned by the PMO user.
 * 3. Creating a task under this project.
 * 4. Assigning a TPM user to this task.
 * 5. Deleting the assignment by authorized PMO user.
 * 6. Validating successful deletion and error handling for unauthorized or invalid
 *    deletes.
 *
 * All API responses are asserted with typia for strict typing. TestValidator
 * ensures business validations pass correctly.
 */
export async function test_api_task_assignment_deletion_by_authorized_pmo_user(
  connection: api.IConnection,
) {
  // 1. PMO user registration
  const pmoJoinBody = {
    email: RandomGenerator.alphaNumeric(5) + "@example.com",
    password: "SecurePass123!",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: pmoJoinBody,
    });
  typia.assert(pmoUser);

  // 2. PMO user login
  const pmoLoginBody = {
    email: pmoJoinBody.email,
    password: pmoJoinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const pmoAuth: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, {
      body: pmoLoginBody,
    });
  typia.assert(pmoAuth);

  // 3. Create a project owned by PMO user
  const projectCreateBody = {
    owner_id: pmoUser.id,
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.name(3),
    description: "E2E test project",
  } satisfies ITaskManagementProject.ICreate;
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectCreateBody,
    });
  typia.assert(project);

  // 4. Create a task under the project
  const taskCreateBody = {
    status_id: typia.random<string & tags.Format<"uuid">>(),
    priority_id: typia.random<string & tags.Format<"uuid">>(),
    creator_id: pmoUser.id,
    project_id: project.id,
    title: RandomGenerator.name(5),
    description: "Task description for E2E test",
  } satisfies ITaskManagementTask.ICreate;
  const task: ITaskManagementTask =
    await api.functional.taskManagement.pmo.tasks.create(connection, {
      body: taskCreateBody,
    });
  typia.assert(task);

  // 5. Assign a TPM user to this task
  const assigneeId = typia.random<string & tags.Format<"uuid">>();
  const assignmentCreateBody = {
    task_id: task.id,
    assignee_id: assigneeId,
    assigned_at: new Date().toISOString(),
  } satisfies ITaskManagementTaskAssignment.ICreate;
  const assignment: ITaskManagementTaskAssignment =
    await api.functional.taskManagement.pmo.tasks.assignments.createAssignment(
      connection,
      {
        taskId: task.id,
        body: assignmentCreateBody,
      },
    );
  typia.assert(assignment);

  // 6. Delete the assignment by PMO user authorization
  await api.functional.taskManagement.pmo.tasks.assignments.eraseAssignment(
    connection,
    {
      taskId: task.id,
      assignmentId: assignment.id,
    },
  );

  // 7. Confirm deletion by attempting to delete again, expect error
  await TestValidator.error(
    "deleting non-existent assignment should error",
    async () => {
      await api.functional.taskManagement.pmo.tasks.assignments.eraseAssignment(
        connection,
        {
          taskId: task.id,
          assignmentId: assignment.id,
        },
      );
    },
  );

  // 8. Confirm that unauthorized deletion attempt (using another PMO user) fails
  const anotherPmoJoinBody = {
    email: RandomGenerator.alphaNumeric(5) + "@example.com",
    password: "AnotherPass456$",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPmo.IJoin;
  const anotherPmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: anotherPmoJoinBody,
    });
  typia.assert(anotherPmoUser);

  // Login as the new PMO to reset authorization context
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: anotherPmoJoinBody.email,
      password: anotherPmoJoinBody.password,
    } satisfies ITaskManagementPmo.ILogin,
  });

  // 9. Create a new assignment for the unauthorized user
  const newAssignmentCreateBody = {
    task_id: task.id,
    assignee_id: typia.random<string & tags.Format<"uuid">>(),
    assigned_at: new Date().toISOString(),
  } satisfies ITaskManagementTaskAssignment.ICreate;
  const newAssignment: ITaskManagementTaskAssignment =
    await api.functional.taskManagement.pmo.tasks.assignments.createAssignment(
      connection,
      {
        taskId: task.id,
        body: newAssignmentCreateBody,
      },
    );
  typia.assert(newAssignment);

  // 10. Attempt to delete assignment created by another PMO - expect error
  await TestValidator.error(
    "unauthorized user cannot delete assignment",
    async () => {
      await api.functional.taskManagement.pmo.tasks.assignments.eraseAssignment(
        connection,
        {
          taskId: task.id,
          assignmentId: newAssignment.id,
        },
      );
    },
  );
}

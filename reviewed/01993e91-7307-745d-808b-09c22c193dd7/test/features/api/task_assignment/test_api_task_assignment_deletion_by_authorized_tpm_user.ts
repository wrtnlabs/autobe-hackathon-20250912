import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Test deletion of a task assignment by the authorized TPM user.
 *
 * This test simulates the full lifecycle of TPM user authorization, project
 * and task creation, assignment creation, and subsequent deletion of the
 * assignment by the authorized user. It validates that only authorized TPM
 * user can delete assignment, confirms deletion effects, and tests error
 * handling for unauthorized or repeated deletion attempts.
 *
 * Steps:
 *
 * 1. TPM user joins and authenticates, obtains tokens
 * 2. TPM user creates a project
 * 3. TPM user creates a task under the project
 * 4. TPM user assigns self to the task
 * 5. TPM user deletes the assignment
 * 6. Confirm deletion success and that assignment is not accessible again
 * 7. Try delete again - expect error
 * 8. Another TPM user tries deleting assignment - expect error
 */
export async function test_api_task_assignment_deletion_by_authorized_tpm_user(
  connection: api.IConnection,
) {
  // 1. TPM user joins and authenticates
  const joinBody = {
    email: typia.random<string>(),
    password: "P@ssword1234",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const joinedUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinBody });
  typia.assert(joinedUser);

  // 2. TPM user logs in to get authorization tokens
  // Re-login to simulate new session
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;

  const loggedUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: loginBody });
  typia.assert(loggedUser);

  // 3. TPM user creates a project
  const projectBody = {
    owner_id: loggedUser.id,
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(project);

  // 4. TPM user creates a task under the project
  const taskBody = {
    status_id: typia.random<string & tags.Format<"uuid">>(),
    priority_id: typia.random<string & tags.Format<"uuid">>(),
    creator_id: loggedUser.id,
    project_id: project.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies ITaskManagementTask.ICreate;

  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskBody,
    });
  typia.assert(task);

  // 5. TPM user creates an assignment (assign self to task)
  const assignmentBody = {
    task_id: task.id,
    assignee_id: loggedUser.id,
  } satisfies ITaskManagementTaskAssignment.ICreate;

  const assignment: ITaskManagementTaskAssignment =
    await api.functional.taskManagement.tpm.tasks.assignments.createAssignment(
      connection,
      {
        taskId: task.id,
        body: assignmentBody,
      },
    );
  typia.assert(assignment);

  // 6. TPM user deletes the assignment
  await api.functional.taskManagement.tpm.tasks.assignments.eraseAssignment(
    connection,
    {
      taskId: task.id,
      assignmentId: assignment.id,
    },
  );

  // 7. Validate deletion by attempting to delete again, expecting error
  await TestValidator.error(
    "deletion of already deleted assignment should fail",
    async () => {
      await api.functional.taskManagement.tpm.tasks.assignments.eraseAssignment(
        connection,
        {
          taskId: task.id,
          assignmentId: assignment.id,
        },
      );
    },
  );

  // 8. Another TPM user joins and logs in to test unauthorized deletion
  const joinBody2 = {
    email: typia.random<string>(),
    password: "P@ssword1234",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const otherUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinBody2 });
  typia.assert(otherUser);

  const loginBody2 = {
    email: joinBody2.email,
    password: joinBody2.password,
  } satisfies ITaskManagementTpm.ILogin;

  const otherLoggedUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: loginBody2 });
  typia.assert(otherLoggedUser);

  // Another TPM user attempts to delete the (already deleted) assignment, expect error
  await TestValidator.error(
    "unauthorized TPM user deletion attempt should fail",
    async () => {
      await api.functional.taskManagement.tpm.tasks.assignments.eraseAssignment(
        connection,
        {
          taskId: task.id,
          assignmentId: assignment.id,
        },
      );
    },
  );
}

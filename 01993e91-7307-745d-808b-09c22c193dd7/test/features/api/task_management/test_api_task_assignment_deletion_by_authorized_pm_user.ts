import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";

export async function test_api_task_assignment_deletion_by_authorized_pm_user(
  connection: api.IConnection,
) {
  // 1. PM user joins with unique email and password and random name
  const pmJoinBody = {
    email: `pmuser_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "12345678",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmJoinBody });
  typia.assert(pmUser);

  // 2. PM user logs in to obtain authentication tokens
  const pmLoginBody = {
    email: pmJoinBody.email,
    password: pmJoinBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const authorizedPmUser = await api.functional.auth.pm.login(connection, {
    body: pmLoginBody,
  });
  typia.assert(authorizedPmUser);

  // 3. Create a project owned by the authorized PM user
  const projectCreateBody = {
    owner_id: authorizedPmUser.id,
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ITaskManagementProject.ICreate;

  const project = await api.functional.taskManagement.pm.projects.create(
    connection,
    { body: projectCreateBody },
  );
  typia.assert(project);

  // 4. Create a task under the project with necessary IDs and descriptive info
  const taskCreateBody = {
    status_id: typia.random<string & tags.Format<"uuid">>(),
    priority_id: typia.random<string & tags.Format<"uuid">>(),
    creator_id: authorizedPmUser.id,
    project_id: project.id,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    due_date: new Date(Date.now() + 864e5).toISOString(),
  } satisfies ITaskManagementTask.ICreate;

  const task = await api.functional.taskManagement.pm.tasks.create(connection, {
    body: taskCreateBody,
  });
  typia.assert(task);

  // 5. Assign the authorized PM user to the task
  const assignmentCreateBody = {
    task_id: task.id,
    assignee_id: authorizedPmUser.id,
  } satisfies ITaskManagementTaskAssignment.ICreate;

  const assignment =
    await api.functional.taskManagement.pm.tasks.assignments.createAssignment(
      connection,
      {
        taskId: task.id,
        body: assignmentCreateBody,
      },
    );
  typia.assert(assignment);

  // 6. Delete the assignment by the authorized PM user
  await api.functional.taskManagement.pm.tasks.assignments.eraseAssignment(
    connection,
    {
      taskId: task.id,
      assignmentId: assignment.id,
    },
  );

  // 7. Verify assignment was deleted by trying to delete again, expecting error
  await TestValidator.error(
    "deleting non-existent assignment fails",
    async () => {
      await api.functional.taskManagement.pm.tasks.assignments.eraseAssignment(
        connection,
        {
          taskId: task.id,
          assignmentId: assignment.id,
        },
      );
    },
  );

  // 8. Simulate a different PM user (unauthorized for this assignment)
  const otherPmJoinBody = {
    email: `pmuser_${RandomGenerator.alphaNumeric(6)}@example.net`,
    password: "87654321",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const otherPmUser = await api.functional.auth.pm.join(connection, {
    body: otherPmJoinBody,
  });
  typia.assert(otherPmUser);

  const otherPmLoginBody = {
    email: otherPmJoinBody.email,
    password: otherPmJoinBody.password,
  } satisfies ITaskManagementPm.ILogin;

  await api.functional.auth.pm.login(connection, { body: otherPmLoginBody });

  // 9. Create new assignment again for deletion test
  const reassignment =
    await api.functional.taskManagement.pm.tasks.assignments.createAssignment(
      connection,
      {
        taskId: task.id,
        body: assignmentCreateBody,
      },
    );
  typia.assert(reassignment);

  // 10. Unauthorized user attempts to delete the assignment - expects error
  await TestValidator.error(
    "unauthorized user cannot delete assignment",
    async () => {
      await api.functional.taskManagement.pm.tasks.assignments.eraseAssignment(
        connection,
        {
          taskId: task.id,
          assignmentId: reassignment.id,
        },
      );
    },
  );
}

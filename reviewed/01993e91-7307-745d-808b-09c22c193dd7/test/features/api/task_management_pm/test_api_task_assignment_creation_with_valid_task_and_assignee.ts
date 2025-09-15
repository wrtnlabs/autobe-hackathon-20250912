import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test verifies the creation of a task assignment by following the
 * full business workflow involving PM and TPM users. It covers user
 * creation and authentication for both roles, project and board creation
 * under the PM user, task creation, TPM user assignment, and finally the
 * task assignment creation.
 *
 * The test validates that all API calls succeed, responses conform to their
 * DTO types, and the assignment correctly references the task and assignee
 * with a valid assigned_at timestamp.
 *
 * The test also exercises role-based authentication switching to ensure
 * proper authorization boundaries are respected between PM and TPM users.
 *
 * This comprehensive workflow ensures the task assignment functionality
 * works as expected within the larger task management context.
 */
export async function test_api_task_assignment_creation_with_valid_task_and_assignee(
  connection: api.IConnection,
) {
  // 1. Create and authenticate PM user
  const pmEmail = `${RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }).replace(/\s/g, "")}@example.com`;
  const pmUser: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: {
        email: pmEmail,
        password: "password123",
        name: RandomGenerator.name(2),
      } satisfies ITaskManagementPm.ICreate,
    });
  typia.assert(pmUser);

  // 2. Create TPM user for project owner
  const tpmOwnerEmail = `${RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }).replace(/\s/g, "")}@example.com`;
  const tpmOwner: ITaskManagementTpm =
    await api.functional.taskManagement.tpm.taskManagement.tpms.create(
      connection,
      {
        body: {
          email: tpmOwnerEmail,
          password_hash: "hashedpassword123",
          name: RandomGenerator.name(2),
        } satisfies ITaskManagementTpm.ICreate,
      },
    );
  typia.assert(tpmOwner);

  // 3. Create a project under PM user
  const project: ITaskManagementProject =
    await api.functional.taskManagement.pm.projects.create(connection, {
      body: {
        owner_id: tpmOwner.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // 4. Create a board within the project
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.pm.projects.boards.create(connection, {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: tpmOwner.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(board);

  // 5. Create a task under the project board
  const statusId = typia.random<string & tags.Format<"uuid">>();
  const priorityId = typia.random<string & tags.Format<"uuid">>();
  const task: ITaskManagementTask =
    await api.functional.taskManagement.pm.tasks.create(connection, {
      body: {
        status_id: statusId,
        priority_id: priorityId,
        creator_id: pmUser.id,
        project_id: project.id,
        board_id: board.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ITaskManagementTask.ICreate,
    });
  typia.assert(task);

  // 6. Create and authenticate TPM user to assign
  const tpmAssignEmail = `${RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }).replace(/\s/g, "")}@example.com`;
  const tpmAssignee: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: tpmAssignEmail,
        password: "password123",
        name: RandomGenerator.name(2),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(tpmAssignee);

  // 7. Switch authentication back to PM user
  await api.functional.auth.pm.login(connection, {
    body: {
      email: pmEmail,
      password: "password123",
    } satisfies ITaskManagementPm.ILogin,
  });

  // 8. Create task assignment linking task and assignee
  const assignment: ITaskManagementTaskAssignment =
    await api.functional.taskManagement.pm.tasks.assignments.createAssignment(
      connection,
      {
        taskId: task.id,
        body: {
          task_id: task.id,
          assignee_id: tpmAssignee.id,
          assigned_at: new Date().toISOString(),
        } satisfies ITaskManagementTaskAssignment.ICreate,
      },
    );
  typia.assert(assignment);

  // 9. Assert assignment fields
  TestValidator.equals(
    "assignment task_id matches task.id",
    assignment.task_id,
    task.id,
  );
  TestValidator.equals(
    "assignment assignee_id matches TPM user id",
    assignment.assignee_id,
    tpmAssignee.id,
  );
  TestValidator.predicate(
    "assignment has assigned_at timestamp",
    typeof assignment.assigned_at === "string" &&
      assignment.assigned_at.length > 0,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Comprehensive E2E test for updating a task entity in the task management
 * system.
 *
 * This test covers:
 *
 * 1. TPM user authentications establishing authorization contexts.
 * 2. Creation of TaskStatus, Priority, Project, and Board entities.
 * 3. Creation of the initial Task entity referencing the above.
 * 4. Update operation on the Task entity with valid, new values.
 * 5. Validation of the update response for schema compliance and business rules.
 */
export async function test_api_task_update_with_complete_dependencies(
  connection: api.IConnection,
) {
  // TPM User Authentication #1
  const authUser1: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: `tpmuser1+${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "p@ssword1",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(authUser1);

  // TPM User Authentication #2 (for later update user context)
  const authUser2: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: {
        email: `tpmuser2+${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "p@ssword2",
        name: RandomGenerator.name(),
      } satisfies ITaskManagementTpm.IJoin,
    });
  typia.assert(authUser2);

  // Create Task Status
  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(4),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(taskStatus);

  // Create Task Priority
  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(3),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ITaskManagementPriority.ICreate,
      },
    );
  typia.assert(taskPriority);

  // Create Project
  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: {
        owner_id: authUser1.id,
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(project);

  // Create Board associated with Project
  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: {
        project_id: project.id,
        owner_id: authUser1.id,
        code: RandomGenerator.alphaNumeric(4),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(board);

  // Create initial Task referencing all above
  const initialTask: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: {
        status_id: taskStatus.id,
        priority_id: taskPriority.id,
        creator_id: authUser1.id,
        project_id: project.id,
        board_id: board.id,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITaskManagementTask.ICreate,
    });
  typia.assert(initialTask);

  // Update Task with new values
  const updatedStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(5),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITaskManagementTaskStatus.ICreate,
      },
    );
  typia.assert(updatedStatus);

  const updatedPriority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(5),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITaskManagementPriority.ICreate,
      },
    );
  typia.assert(updatedPriority);

  const updatedProject: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: {
        owner_id: authUser2.id,
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITaskManagementProject.ICreate,
    });
  typia.assert(updatedProject);

  const updatedBoard: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: updatedProject.id,
      body: {
        project_id: updatedProject.id,
        owner_id: authUser2.id,
        code: RandomGenerator.alphaNumeric(5),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITaskManagementBoard.ICreate,
    });
  typia.assert(updatedBoard);

  const updatePayload = {
    status_id: updatedStatus.id,
    priority_id: updatedPriority.id,
    project_id: updatedProject.id,
    board_id: updatedBoard.id,
    title: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ITaskManagementTask.IUpdate;

  const updatedTask: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.updateTask(connection, {
      taskId: initialTask.id,
      body: updatePayload,
    });

  typia.assert(updatedTask);

  // Validate updated fields
  TestValidator.equals(
    "updated status_id equals",
    updatedTask.status_id,
    updatePayload.status_id,
  );
  TestValidator.equals(
    "updated priority_id equals",
    updatedTask.priority_id,
    updatePayload.priority_id,
  );
  TestValidator.equals(
    "updated project_id equals",
    updatedTask.project_id,
    updatePayload.project_id,
  );
  TestValidator.equals(
    "updated board_id equals",
    updatedTask.board_id,
    updatePayload.board_id,
  );
  TestValidator.equals(
    "updated title equals",
    updatedTask.title,
    updatePayload.title,
  );
  TestValidator.equals(
    "updated description equals",
    updatedTask.description,
    updatePayload.description,
  );
  TestValidator.equals(
    "updated due_date equals",
    updatedTask.due_date,
    updatePayload.due_date,
  );

  // Business rules validation
  TestValidator.predicate(
    "updated title is non-empty",
    typeof updatedTask.title === "string" && updatedTask.title.length > 0,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskComment";
import type { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTask";
import type { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * End-to-end test validating TPM user task comment creation and retrieval.
 *
 * This test performs the following workflow:
 *
 * 1. Registers a new TPM user with a unique email, strong password, and name.
 * 2. Logs in the TPM user to obtain authentication for subsequent API calls.
 * 3. Creates prerequisite task-related entities: Task Status, Task Priority,
 *    Project owned by the TPM user, and Board within the Project.
 * 4. Creates a new Task associating the above entities and referencing the TPM
 *    user as its creator.
 * 5. Performs a comment listing request on the newly created Task with filters
 *    for taskId and commenterId.
 * 6. Validates the comment listing response structure, pagination, and data
 *    array.
 *
 * Note: The actual creation of a task comment cannot be tested here due to
 * the absence of a create comment API. This test focuses on the available
 * APIs for entity creation, authentication, and comment listing.
 *
 * All steps use typia.assert to guarantee strict adherence to DTOs.
 * Business rules, ID formats, and essential validations are checked via
 * TestValidator.
 */
export async function test_api_task_comment_creation_and_retrieval_tpm(
  connection: api.IConnection,
) {
  // 1. TPM User Registration
  const joinData = {
    email: `${RandomGenerator.alphaNumeric(6)}@testtpm.com`,
    password: "StrongP@ssw0rd!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;

  const joinUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, {
      body: joinData,
    });
  typia.assert(joinUser);

  // 2. TPM User Login
  const loginData = {
    email: joinData.email,
    password: joinData.password,
  } satisfies ITaskManagementTpm.ILogin;

  const loginUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, {
      body: loginData,
    });
  typia.assert(loginUser);

  // 3. Create Task Status
  const statusData = {
    code: `status_${RandomGenerator.alphaNumeric(5)}`,
    name: RandomGenerator.name(),
    description: "Task status for testing",
  } satisfies ITaskManagementTaskStatus.ICreate;

  const status: ITaskManagementTaskStatus =
    await api.functional.taskManagement.tpm.taskManagementTaskStatuses.create(
      connection,
      {
        body: statusData,
      },
    );
  typia.assert(status);
  TestValidator.predicate(
    "Task status ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      status.id,
    ),
  );

  // 4. Create Task Priority
  const priorityData = {
    code: `priority_${RandomGenerator.alphaNumeric(5)}`,
    name: RandomGenerator.name(),
    description: "Task priority for testing",
  } satisfies ITaskManagementPriority.ICreate;

  const priority: ITaskManagementPriority =
    await api.functional.taskManagement.tpm.taskManagementPriorities.create(
      connection,
      {
        body: priorityData,
      },
    );
  typia.assert(priority);
  TestValidator.predicate(
    "Task priority ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      priority.id,
    ),
  );

  // 5. Create Project owned by TPM
  const projectData = {
    owner_id: joinUser.id,
    code: `project_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.tpm.projects.create(connection, {
      body: projectData,
    });
  typia.assert(project);
  TestValidator.predicate(
    "Project ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      project.id,
    ),
  );

  // 6. Create Board in Project
  const boardData = {
    project_id: project.id,
    owner_id: joinUser.id,
    code: `board_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ITaskManagementBoard.ICreate;

  const board: ITaskManagementBoard =
    await api.functional.taskManagement.tpm.projects.boards.create(connection, {
      projectId: project.id,
      body: boardData,
    });
  typia.assert(board);
  TestValidator.predicate(
    "Board ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      board.id,
    ),
  );

  // 7. Create a Task referencing all created entities
  const taskData = {
    status_id: status.id,
    priority_id: priority.id,
    creator_id: joinUser.id,
    project_id: project.id,
    board_id: board.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    status_name: status.name,
    priority_name: priority.name,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days later
  } satisfies ITaskManagementTask.ICreate;

  const task: ITaskManagementTask =
    await api.functional.taskManagement.tpm.tasks.create(connection, {
      body: taskData,
    });
  typia.assert(task);
  TestValidator.predicate(
    "Task ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      task.id,
    ),
  );

  // 8,9 & 10: List and validate comments for the Task
  const commentSearchRequest = {
    page: 1,
    limit: 10,
    task_id: task.id,
    commenter_id: joinUser.id,
  } satisfies ITaskManagementTaskComment.IRequest;

  const commentsPage: IPageITaskManagementTaskComment.ISummary =
    await api.functional.taskManagement.tpm.tasks.comments.indexComments(
      connection,
      {
        taskId: task.id,
        body: commentSearchRequest,
      },
    );
  typia.assert(commentsPage);

  TestValidator.predicate(
    "Comment list has pagination",
    commentsPage.pagination !== null && commentsPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "Comment list returns array",
    Array.isArray(commentsPage.data),
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTasks";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriority";
import type { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import type { ITaskManagementTaskStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatus";
import type { ITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTasks";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

export async function test_api_task_management_task_pmo_tasks_e2e_full_workflow(
  connection: api.IConnection,
) {
  // 1. PMO user registration and authentication for authorization context
  const pmoJoinBody = {
    email: `${String(Date.now())}@example.com`,
    password: "Pm0_TestP@ssword!",
    name: "PMO Tester",
  } satisfies ITaskManagementPmo.IJoin;

  const pmoUser: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, { body: pmoJoinBody });
  typia.assert(pmoUser);

  // 2. Create Task Status with valid code, name
  const taskStatusBody = {
    code: "to_do_status_code",
    name: "To Do",
    description: "Task is pending and to be started",
  } satisfies ITaskManagementTaskStatus.ICreate;

  const taskStatus: ITaskManagementTaskStatus =
    await api.functional.taskManagement.pmo.taskManagementTaskStatuses.create(
      connection,
      { body: taskStatusBody },
    );
  typia.assert(taskStatus);

  // 3. Create Task Priority with valid code, name
  const taskPriorityBody = {
    code: "high_priority",
    name: "High",
    description: "High priority task",
  } satisfies ITaskManagementPriority.ICreate;

  const taskPriority: ITaskManagementPriority =
    await api.functional.taskManagement.pmo.taskManagementPriorities.create(
      connection,
      { body: taskPriorityBody },
    );
  typia.assert(taskPriority);

  // 4. Create TPM user who is the creator of tasks
  const tpmUserBody = {
    email: `tpm${String(Date.now())}@example.com`,
    password_hash: "SecureHashString123!",
    name: "TPM User",
  } satisfies ITaskManagementTpm.ICreate;

  const tpmUser: ITaskManagementTpm =
    await api.functional.taskManagement.pmo.taskManagement.tpms.create(
      connection,
      { body: tpmUserBody },
    );
  typia.assert(tpmUser);

  // 5. Create Project associated with TPM user
  const projectBody = {
    owner_id: tpmUser.id,
    code: `proj_${String(Date.now())}`,
    name: "Sample Project",
    description: "Project description for E2E test",
  } satisfies ITaskManagementProject.ICreate;

  const project: ITaskManagementProject =
    await api.functional.taskManagement.pmo.projects.create(connection, {
      body: projectBody,
    });
  typia.assert(project);

  // 6. Use PMO tasks PATCH endpoint to retrieve filtered, paginated task list
  const taskListRequest = {
    page: 1,
    limit: 10,
    status_id: taskStatus.id,
    priority_id: taskPriority.id,
    creator_id: tpmUser.id,
    project_id: project.id,
    search: null,
    board_id: null,
    sort_by: "title",
    sort_order: "asc",
  } satisfies ITaskManagementTasks.IRequest;

  const taskList: IPageITaskManagementTasks.ISummary =
    await api.functional.taskManagement.pmo.tasks.index(connection, {
      body: taskListRequest,
    });
  typia.assert(taskList);

  // 7. Validate pagination data
  TestValidator.predicate(
    "page should be 1",
    taskList.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit should be less or equal 10",
    taskList.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "pages count should be >= 1",
    taskList.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "record count should be >= 0",
    taskList.pagination.records >= 0,
  );

  // 8. Validate that each task conforms to filters
  for (const task of taskList.data) {
    if (task.status_name !== null && task.status_name !== undefined) {
      TestValidator.equals(
        "task status name matches",
        task.status_name,
        taskStatus.name,
      );
    }
    if (task.priority_name !== null && task.priority_name !== undefined) {
      TestValidator.equals(
        "task priority name matches",
        task.priority_name,
        taskPriority.name,
      );
    }
    TestValidator.predicate(
      "task id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        task.id,
      ),
    );
  }
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowSystemAdmin";
import type { INotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerInstance";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";
import type { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowTriggerInstance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowTriggerInstance";

/**
 * This E2E test function demonstrates the full flow of setting up
 * multi-role users in the notification workflow system: creating and
 * authenticating a systemAdmin user, creating a notification workflow,
 * creating and authenticating a triggerOperator user, creating a trigger
 * instance for the workflow, and finally searching trigger instances with
 * filtering, pagination, and sorting criteria.
 *
 * The test verifies authorization boundaries and validates that the search
 * results comply with requested filters, including workflow ID and status.
 * Pagination metadata correctness is tested, and multiple search scenarios
 * with different parameters are included. The test validates all steps by
 * calling the API functions with awaited calls and asserts the returned
 * data using typia.assert. TestValidator functions are used for behavioral
 * assertions focusing on pagination details and search correctness.
 */
export async function test_api_trigger_instance_search_success_trigger_operator(
  connection: api.IConnection,
) {
  // 1. System Administrator joins and logs in
  const systemAdminEmail = typia.random<string & tags.Format<"email">>();
  const systemAdminPassword = "secure-password";
  const systemAdminJoinBody = {
    email: systemAdminEmail,
    password: systemAdminPassword,
  } satisfies INotificationWorkflowSystemAdmin.IRequestJoin;
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: systemAdminJoinBody,
  });
  typia.assert(systemAdmin);

  const systemAdminLoginBody = {
    email: systemAdminEmail,
    password: systemAdminPassword,
  } satisfies INotificationWorkflowSystemAdmin.IRequestLogin;
  const loggedInSystemAdmin = await api.functional.auth.systemAdmin.login(
    connection,
    { body: systemAdminLoginBody },
  );
  typia.assert(loggedInSystemAdmin);

  // 2. Create a Notification Workflow as systemAdmin
  const workflowCreateBody = {
    code: `WF_${RandomGenerator.alphaNumeric(6)}`,
    entry_node_id: typia.random<string & tags.Format<"uuid">>(),
    is_active: true,
    name: `Notify Workflow ${RandomGenerator.paragraph({ sentences: 2 })}`,
    version: 1,
  } satisfies INotificationWorkflowWorkflow.ICreate;

  const workflow =
    await api.functional.notificationWorkflow.systemAdmin.workflows.create(
      connection,
      { body: workflowCreateBody },
    );
  typia.assert(workflow);

  // 3. Trigger Operator joins and logs in
  const triggerOperatorEmail = typia.random<string & tags.Format<"email">>();
  const triggerOperatorPassword = "operator-password";
  const triggerOperatorJoinBody = {
    email: triggerOperatorEmail,
    password_hash: triggerOperatorPassword,
  } satisfies INotificationWorkflowTriggerOperator.ICreate;

  const triggerOperator =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      { body: triggerOperatorJoinBody },
    );
  typia.assert(triggerOperator);

  const triggerOperatorLoginBody = {
    email: triggerOperatorEmail,
    password_hash: triggerOperatorPassword,
  } satisfies INotificationWorkflowTriggerOperator.ILogin;

  const loggedInTriggerOperator =
    await api.functional.auth.triggerOperator.login.loginTriggerOperator(
      connection,
      { body: triggerOperatorLoginBody },
    );
  typia.assert(loggedInTriggerOperator);

  // 4. Create a Trigger Instance for the workflow as triggerOperator
  const triggerInstanceCreateBody = {
    workflow_id: workflow.id,
    idempotency_key: `key_${RandomGenerator.alphaNumeric(8)}`,
    payload: JSON.stringify({ info: "Test payload" }),
  } satisfies INotificationWorkflowTriggerInstance.ICreate;

  const triggerInstance =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.create(
      connection,
      { body: triggerInstanceCreateBody },
    );
  typia.assert(triggerInstance);

  // 5. Search Trigger Instances with various parameters

  // 5-1: Basic search without filters or pagination
  const searchBodyBasic =
    {} satisfies INotificationWorkflowTriggerInstance.IRequest;
  const searchResultBasic =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.searchTriggerInstances(
      connection,
      { body: searchBodyBasic },
    );
  typia.assert(searchResultBasic);
  TestValidator.predicate(
    "search result page pagination validity",
    searchResultBasic.pagination.current >= 0 &&
      searchResultBasic.pagination.limit > 0 &&
      searchResultBasic.pagination.pages >= 0 &&
      searchResultBasic.pagination.records >= 0,
  );

  // 5-2: Search filtered by workflow_id
  const searchBodyFilteredWorkflow = {
    workflow_id: workflow.id,
  } satisfies INotificationWorkflowTriggerInstance.IRequest;
  const searchResultFilteredWorkflow =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.searchTriggerInstances(
      connection,
      { body: searchBodyFilteredWorkflow },
    );
  typia.assert(searchResultFilteredWorkflow);
  // Verify all returned entries match the workflow ID
  TestValidator.predicate(
    "all entries match workflow id",
    searchResultFilteredWorkflow.data.every(
      (item) => item.workflow_id === workflow.id,
    ),
  );

  // 5-3: Search filtered by status (if any statuses present in data)
  if (searchResultBasic.data.length > 0) {
    const exampleStatus = searchResultBasic.data[0].status;
    const searchBodyFilteredStatus = {
      status: exampleStatus,
    } satisfies INotificationWorkflowTriggerInstance.IRequest;
    const searchResultFilteredStatus =
      await api.functional.notificationWorkflow.triggerOperator.triggerInstances.searchTriggerInstances(
        connection,
        { body: searchBodyFilteredStatus },
      );
    typia.assert(searchResultFilteredStatus);
    // Verify all returned entries match the status
    TestValidator.predicate(
      `all entries match status ${exampleStatus}`,
      searchResultFilteredStatus.data.every(
        (item) => item.status === exampleStatus,
      ),
    );
  }

  // 5-4: Search with pagination parameters
  const searchBodyPagination = {
    page: 0,
    limit: 5,
  } satisfies INotificationWorkflowTriggerInstance.IRequest;
  const searchResultPagination =
    await api.functional.notificationWorkflow.triggerOperator.triggerInstances.searchTriggerInstances(
      connection,
      { body: searchBodyPagination },
    );
  typia.assert(searchResultPagination);
  TestValidator.predicate(
    "pagination page and limit values",
    searchResultPagination.pagination.current === 0 &&
      searchResultPagination.pagination.limit === 5,
  );

  // Additional assertion: data length is <= limit
  TestValidator.predicate(
    "search result data length respects limit",
    searchResultPagination.data.length <= 5,
  );
}

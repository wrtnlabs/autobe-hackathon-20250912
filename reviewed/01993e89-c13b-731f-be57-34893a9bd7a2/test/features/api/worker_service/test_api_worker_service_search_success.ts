import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { INotificationWorkflowWorkerService } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkerService";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageINotificationWorkflowWorkerservice } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkerservice";

/**
 * Test successful searching and pagination of worker service accounts
 *
 * This test performs PATCH requests to the public endpoint
 * /notificationWorkflow/workerServices with and without an email filter. It
 * verifies returned pagination structure, validates all pagination values for
 * correctness, and asserts that filtered results respect the provided email
 * substring filter.
 *
 * Key validations include:
 *
 * - All pagination numbers (current page, limit, total pages, total records) are
 *   logically consistent.
 * - All retrieved worker service summaries conform to the type schema.
 * - Filtered results all contain the email substring filter.
 *
 * This ensures the search API behaves correctly for typical use cases.
 */
export async function test_api_worker_service_search_success(
  connection: api.IConnection,
) {
  // 1. Search with no filter and default pagination
  const requestBody1 = {
    email: null,
    page: 1,
    limit: 10,
  } satisfies INotificationWorkflowWorkerService.IRequest;

  const result1: IPageINotificationWorkflowWorkerservice.ISummary =
    await api.functional.notificationWorkflow.workerServices.index(connection, {
      body: requestBody1,
    });
  typia.assert(result1);

  // Pagination checks
  TestValidator.predicate(
    "page number is positive",
    result1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "page limit is positive",
    result1.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "page count is positive",
    result1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    result1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "records is not more than limit * pages",
    result1.pagination.records <=
      result1.pagination.limit * result1.pagination.pages,
  );

  // 2. Search filtered by email
  const partialEmail = "worker";
  const requestBody2 = {
    email: partialEmail,
    page: 1,
    limit: 5,
  } satisfies INotificationWorkflowWorkerService.IRequest;

  const result2: IPageINotificationWorkflowWorkerservice.ISummary =
    await api.functional.notificationWorkflow.workerServices.index(connection, {
      body: requestBody2,
    });
  typia.assert(result2);

  // Pagination checks
  TestValidator.predicate(
    "filtered page number is positive",
    result2.pagination.current >= 1,
  );
  TestValidator.predicate(
    "filtered page limit is positive",
    result2.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "filtered page count is positive",
    result2.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "filtered total records is non-negative",
    result2.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered records is not more than limit * pages",
    result2.pagination.records <=
      result2.pagination.limit * result2.pagination.pages,
  );

  // All returned worker services have emails containing partialEmail
  for (const worker of result2.data) {
    TestValidator.predicate(
      `email "${worker.email}" includes filter "${partialEmail}"`,
      worker.email.includes(partialEmail),
    );
  }
}

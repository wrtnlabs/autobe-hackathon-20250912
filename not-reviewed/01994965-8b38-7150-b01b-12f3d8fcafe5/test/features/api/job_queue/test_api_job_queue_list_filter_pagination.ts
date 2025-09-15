import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderJobQueue";
import type { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";
import type { ITelegramFileDownloaderJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderJobQueue";

/**
 * Validates administrator job queue list retrieval with filtering, pagination,
 * and sorting.
 *
 * This test ensures that an administrator can create job queue entries and
 * retrieve them with various filtering and sorting options using PATCH
 * /telegramFileDownloader/administrator/jobQueues. It covers:
 *
 * 1. Administrator registration and authentication.
 * 2. Creating multiple job queue entries with different statuses, priorities, and
 *    retry counts.
 * 3. Filtering by status, priority, retry counts, and last error message.
 * 4. Pagination correctness (page number and limit).
 * 5. Sorting by fields like created_at and priority in both ascending and
 *    descending order.
 * 6. Access control ensuring non-admins cannot access the list.
 * 7. Validation of error responses for invalid pagination or filter input.
 *
 * Each step asserts response types and values using typia.assert() and
 * TestValidator to ensure business rules and API contract compliance.
 */
export async function test_api_job_queue_list_filter_pagination(
  connection: api.IConnection,
) {
  // 1. Administrator registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(64); // Simulate hashed password
  const adminAuthorized: ITelegramFileDownloaderAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies ITelegramFileDownloaderAdministrator.ICreate,
    });

  typia.assert(adminAuthorized);

  // Helper function to generate random job queue create bodies
  function generateJobQueueCreateBody(): ITelegramFileDownloaderJobQueue.ICreate {
    const statuses = ["pending", "processing", "failed", "completed"] as const;
    const status = RandomGenerator.pick(statuses);
    return {
      job_id: typia.random<string & tags.Format<"uuid">>(),
      status: status,
      priority: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0>
      >() satisfies number as number,
      retries: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0>
      >() satisfies number as number,
      last_error_message:
        status === "failed"
          ? RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 7 })
          : null,
    };
  }

  // 2. Create multiple job queue entries with varied statuses and priorities
  const createdJobs: ITelegramFileDownloaderJobQueue[] = [];
  const jobCount = 15;
  for (let i = 0; i < jobCount; i++) {
    const createBody = generateJobQueueCreateBody();
    const createdJob =
      await api.functional.telegramFileDownloader.administrator.jobQueues.create(
        connection,
        {
          body: createBody,
        },
      );
    typia.assert(createdJob);
    createdJobs.push(createdJob);
  }

  // 3. Test retrieving with filter by status = 'pending'
  const filterPending: ITelegramFileDownloaderJobQueue.IRequest = {
    status: "pending",
    page: 1,
    limit: 5,
    order_by: "created_at",
    order_direction: "asc",
  };
  const pagePending =
    await api.functional.telegramFileDownloader.administrator.jobQueues.index(
      connection,
      {
        body: filterPending,
      },
    );
  typia.assert(pagePending);
  // All returned jobs must have status 'pending'
  pagePending.data.forEach((job) => {
    TestValidator.equals("job status pending", job.status, "pending");
  });
  TestValidator.predicate(
    "pagination limit equals 5",
    pagePending.data.length <= 5,
  );

  // 4. Test filter by min_retries and max_retries
  const filterRetries: ITelegramFileDownloaderJobQueue.IRequest = {
    min_retries: 1,
    max_retries: 3,
    page: 1,
    limit: 10,
    order_by: "priority",
    order_direction: "desc",
  };
  const pageRetries =
    await api.functional.telegramFileDownloader.administrator.jobQueues.index(
      connection,
      {
        body: filterRetries,
      },
    );
  typia.assert(pageRetries);
  // All jobs's retries should be between 1 and 3 inclusive
  pageRetries.data.forEach((job) => {
    TestValidator.predicate("job retries >= min_retries", job.retries >= 1);
    TestValidator.predicate("job retries <= max_retries", job.retries <= 3);
  });

  // 5. Test filter by last_error_message_contains
  const failedJobs = createdJobs.filter(
    (j) => j.status === "failed" && j.last_error_message != null,
  );
  if (failedJobs.length > 0) {
    const searchText = failedJobs[0].last_error_message!.substring(0, 5);
    const filterErrorMsg: ITelegramFileDownloaderJobQueue.IRequest = {
      last_error_message_contains: searchText,
      page: 1,
      limit: 10,
      order_by: "created_at",
      order_direction: "desc",
    };
    const pageErrorSearch =
      await api.functional.telegramFileDownloader.administrator.jobQueues.index(
        connection,
        {
          body: filterErrorMsg,
        },
      );
    typia.assert(pageErrorSearch);
    pageErrorSearch.data.forEach((job) => {
      if (
        job.last_error_message !== null &&
        job.last_error_message !== undefined
      ) {
        TestValidator.predicate(
          "last_error_message contains filter",
          job.last_error_message.includes(searchText),
        );
      }
    });
  }

  // 6. Test pagination: request page 2 with limit 5
  const filterPagination: ITelegramFileDownloaderJobQueue.IRequest = {
    page: 2,
    limit: 5,
    order_by: "updated_at",
    order_direction: "asc",
  };
  const page2 =
    await api.functional.telegramFileDownloader.administrator.jobQueues.index(
      connection,
      {
        body: filterPagination,
      },
    );
  typia.assert(page2);
  TestValidator.predicate("page 2 limit 5 or less", page2.data.length <= 5);

  // 7. Test sorting order by created_at ascending
  const filterSortAsc: ITelegramFileDownloaderJobQueue.IRequest = {
    page: 1,
    limit: 10,
    order_by: "created_at",
    order_direction: "asc",
  };
  const pageSortAsc =
    await api.functional.telegramFileDownloader.administrator.jobQueues.index(
      connection,
      {
        body: filterSortAsc,
      },
    );
  typia.assert(pageSortAsc);
  for (let i = 1; i < pageSortAsc.data.length; i++) {
    TestValidator.predicate(
      "created_at ascending order",
      pageSortAsc.data[i].created_at >= pageSortAsc.data[i - 1].created_at,
    );
  }

  // 8. Test sorting order by priority descending
  const filterSortDesc: ITelegramFileDownloaderJobQueue.IRequest = {
    page: 1,
    limit: 10,
    order_by: "priority",
    order_direction: "desc",
  };
  const pageSortDesc =
    await api.functional.telegramFileDownloader.administrator.jobQueues.index(
      connection,
      {
        body: filterSortDesc,
      },
    );
  typia.assert(pageSortDesc);
  for (let i = 1; i < pageSortDesc.data.length; i++) {
    TestValidator.predicate(
      "priority descending order",
      pageSortDesc.data[i].priority <= pageSortDesc.data[i - 1].priority,
    );
  }

  // 9. Test unauthorized access - create separate unauth connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access returns error", async () => {
    await api.functional.telegramFileDownloader.administrator.jobQueues.index(
      unauthConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ITelegramFileDownloaderJobQueue.IRequest,
      },
    );
  });

  // 10. Test invalid pagination parameters (negative page number)
  await TestValidator.error(
    "invalid pagination parameters return error",
    async () => {
      await api.functional.telegramFileDownloader.administrator.jobQueues.index(
        connection,
        {
          body: {
            page: -1,
            limit: 5,
          } satisfies ITelegramFileDownloaderJobQueue.IRequest,
        },
      );
    },
  );
}

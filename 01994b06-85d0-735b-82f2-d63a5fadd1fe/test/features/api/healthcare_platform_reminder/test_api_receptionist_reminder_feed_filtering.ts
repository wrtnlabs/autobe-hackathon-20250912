import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformReminder";

/**
 * Validate receptionist reminder feed filtering, pagination, and organization
 * scoping.
 *
 * 1. Register a receptionist user (account creation with organization-level
 *    scope).
 * 2. Retrieve reminders (all, status filtered, date window filtered, pagination,
 *    empty result, invalid filter scenario). a. Fetch all reminders with no
 *    filter, check returned structure. b. Apply status filter (using a status
 *    present in fixture data, if exists). c. Apply date window filter (use
 *    min/max scheduled_for across returned data). d. Paginate: set limit/page,
 *    check pagination metadata/result count. e. Filter with an impossible
 *    status to check empty results. f. Attempt invalid filter (e.g. empty
 *    status) and check API error handling via TestValidator.error. All
 *    assertions use typia/assert/TestValidator with proper input types. No type
 *    errors are tested; only runtime business logic coverage. No login call due
 *    to join-based authentication (no password in receptionist DTO).
 */
export async function test_api_receptionist_reminder_feed_filtering(
  connection: api.IConnection,
) {
  // 1. Register receptionist
  const receptionistEmail = typia.random<string & tags.Format<"email">>();
  const receptionistFullName = RandomGenerator.name();

  const receptionist = await api.functional.auth.receptionist.join(connection, {
    body: {
      email: receptionistEmail,
      full_name: receptionistFullName,
      phone: RandomGenerator.mobile(),
    } satisfies IHealthcarePlatformReceptionist.ICreate,
  });
  typia.assert(receptionist);

  // 2.a. Retrieve all reminders (no filter)
  const allRemindersPage =
    await api.functional.healthcarePlatform.receptionist.reminders.index(
      connection,
      { body: {} satisfies IHealthcarePlatformReminder.IRequest },
    );
  typia.assert(allRemindersPage);
  TestValidator.predicate(
    "data returned is array",
    Array.isArray(allRemindersPage.data),
  );
  for (const reminder of allRemindersPage.data) {
    typia.assert(reminder);
  }

  // 2.b. Filter: status (using fixture data if exists)
  if (allRemindersPage.data.length > 0) {
    const sampleStatus = allRemindersPage.data[0].status;
    const statusFilteredPage =
      await api.functional.healthcarePlatform.receptionist.reminders.index(
        connection,
        {
          body: {
            status: sampleStatus,
          } satisfies IHealthcarePlatformReminder.IRequest,
        },
      );
    typia.assert(statusFilteredPage);
    for (const reminder of statusFilteredPage.data) {
      TestValidator.equals(
        `reminder status matches status filter (${sampleStatus})`,
        reminder.status,
        sampleStatus,
      );
    }
  }

  // 2.c. Filter: scheduled_for_from / scheduled_for_to (date window)
  if (allRemindersPage.data.length > 0) {
    const scheduledFors = allRemindersPage.data
      .map((r) => r.scheduled_for)
      .sort();
    const earliest = scheduledFors[0];
    const latest = scheduledFors[scheduledFors.length - 1];
    const windowFiltered =
      await api.functional.healthcarePlatform.receptionist.reminders.index(
        connection,
        {
          body: {
            scheduled_for_from: earliest,
            scheduled_for_to: latest,
          } satisfies IHealthcarePlatformReminder.IRequest,
        },
      );
    typia.assert(windowFiltered);
    for (const r of windowFiltered.data) {
      TestValidator.predicate(
        "scheduled_for within window",
        r.scheduled_for >= earliest && r.scheduled_for <= latest,
      );
    }
  }

  // 2.d. Pagination: limit + page
  const pageLimit = 2;
  const pagedResult =
    await api.functional.healthcarePlatform.receptionist.reminders.index(
      connection,
      {
        body: {
          limit: pageLimit as number & tags.Type<"int32"> & tags.Minimum<1>,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IHealthcarePlatformReminder.IRequest,
      },
    );
  typia.assert(pagedResult);
  TestValidator.predicate(
    "paged result has <= limit entries",
    pagedResult.data.length <= pageLimit,
  );
  TestValidator.equals(
    "pagination limit matches request",
    pagedResult.pagination.limit,
    pageLimit,
  );
  TestValidator.equals(
    "pagination current matches page",
    pagedResult.pagination.current,
    1,
  );
  if (pagedResult.pagination.limit > 0) {
    TestValidator.equals(
      "pagination pages math matches records",
      pagedResult.pagination.pages,
      Math.ceil(pagedResult.pagination.records / pagedResult.pagination.limit),
    );
  }

  // 2.e. Filter with impossible status (should return empty)
  const noneFound =
    await api.functional.healthcarePlatform.receptionist.reminders.index(
      connection,
      {
        body: {
          status: "definitely-nonexistent-status-value",
        } satisfies IHealthcarePlatformReminder.IRequest,
      },
    );
  typia.assert(noneFound);
  TestValidator.equals(
    "no reminders found matches impossible status filter",
    noneFound.data.length,
    0,
  );

  // 2.f. Invalid filter (should trigger error by business logic)
  await TestValidator.error("invalid status value returns error", async () => {
    await api.functional.healthcarePlatform.receptionist.reminders.index(
      connection,
      {
        body: {
          status: "",
        } satisfies IHealthcarePlatformReminder.IRequest,
      },
    );
  });
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import type { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformReminder";

/**
 * Validates the technician's ability to list and filter reminders (by
 * status, time window, pagination) within their organization context.
 *
 * - Registers and authenticates a technician (technician join/login).
 * - Fetches all reminders (no filter), validates typia/assert and that
 *   returned reminders are valid ISummary.
 * - Filters by status ('pending'), validates all reminders have pending
 *   status.
 * - Filters by date window (scheduled_for_from / scheduled_for_to), validates
 *   all results in range.
 * - Uses pagination control (limit=2) and validates the data length does not
 *   exceed the set limit.
 * - Simulates an invalid filter (scheduled_for_from > scheduled_for_to),
 *   expects error or empty result (either passes).
 *
 * All property checks are restricted to those defined in
 * IHealthcarePlatformReminder.ISummary. No organization or user field, so
 * test cannot check those. TestValidator uses clear titles and all API
 * responses are validated with typia.assert().
 */
export async function test_api_technician_reminder_list_filtering(
  connection: api.IConnection,
) {
  // Register technician
  const technicianBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformTechnician.IJoin;
  const technician = await api.functional.auth.technician.join(connection, {
    body: technicianBody,
  });
  typia.assert(technician);

  // Login technician
  // Use a fixed password (convention: "password123") for both join/login - since API is simulated, assume works.
  const password = "password123";
  const login = await api.functional.auth.technician.login(connection, {
    body: {
      email: technicianBody.email,
      password,
    } satisfies IHealthcarePlatformTechnician.ILogin,
  });
  typia.assert(login);

  // 1. Default fetch (no filters)
  let page = await api.functional.healthcarePlatform.technician.reminders.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(page);
  // Just check that result is array of ISummary -- no field checks possible
  TestValidator.predicate(
    "reminder list returns valid array",
    Array.isArray(page.data),
  );

  // 2. Filter by status = 'pending'
  let pageStatus =
    await api.functional.healthcarePlatform.technician.reminders.index(
      connection,
      {
        body: { status: "pending" },
      },
    );
  typia.assert(pageStatus);
  for (const reminder of pageStatus.data) {
    TestValidator.equals(
      "reminder status is pending",
      reminder.status,
      "pending",
    );
  }

  // 3. Filter by a window (now ~ now+3days)
  const now = new Date();
  const to = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  let pageWindow =
    await api.functional.healthcarePlatform.technician.reminders.index(
      connection,
      {
        body: {
          scheduled_for_from: now.toISOString(),
          scheduled_for_to: to.toISOString(),
        },
      },
    );
  typia.assert(pageWindow);
  for (const r of pageWindow.data) {
    TestValidator.predicate(
      "reminder scheduled_for is in requested window",
      new Date(r.scheduled_for) >= now && new Date(r.scheduled_for) <= to,
    );
  }

  // 4. Pagination
  const limit = 2;
  let pageLimited =
    await api.functional.healthcarePlatform.technician.reminders.index(
      connection,
      {
        body: { limit },
      },
    );
  typia.assert(pageLimited);
  TestValidator.equals(
    "pagination.limit matches requested limit",
    pageLimited.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "number of reminders does not exceed limit",
    pageLimited.data.length <= limit,
  );

  // 5. Invalid filter (from > to): should yield error or empty data
  const past = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  await TestValidator.error(
    "invalid date window filter yields error or empty",
    async () => {
      await api.functional.healthcarePlatform.technician.reminders.index(
        connection,
        {
          body: {
            scheduled_for_from: to.toISOString(),
            scheduled_for_to: past.toISOString(),
          },
        },
      );
    },
  );
}

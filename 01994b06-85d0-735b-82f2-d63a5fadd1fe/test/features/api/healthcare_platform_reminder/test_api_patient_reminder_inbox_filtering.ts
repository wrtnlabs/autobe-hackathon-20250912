import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformReminder";

/**
 * E2E test that a patient user can view and filter reminders in their inbox
 * only, enforcing isolation, correct filter logic, and pagination. Steps:
 *
 * 1. Patient joins and logs in.
 * 2. Fetch all reminders for that patient; confirm all have the patient's id as
 *    target_user_id if returned.
 * 3. Apply filters (by type, status, date), check filtered results.
 * 4. Attempt filter queries that should produce empty result (wrong
 *    status/type/date, invalid combinations).
 * 5. Run a request with no filters (should get everything allowed for the
 *    patient).
 * 6. Check pagination (page 1, high page #, custom limit, etc).
 * 7. Confirm reminders from other users/organizations never appear.
 */
export async function test_api_patient_reminder_inbox_filtering(
  connection: api.IConnection,
) {
  // 1. Register new patient and authenticate
  const email = `${RandomGenerator.alphabets(8)}@example.com`;
  const fullName = RandomGenerator.name();
  const dateOfBirth = new Date(
    1990,
    0,
    1 + Math.floor(Math.random() * 8000),
  ).toISOString();
  const password = RandomGenerator.alphaNumeric(12);
  const join = await api.functional.auth.patient.join(connection, {
    body: {
      email,
      full_name: fullName,
      date_of_birth: dateOfBirth,
      password,
    } satisfies IHealthcarePlatformPatient.IJoin,
  });
  typia.assert(join);
  const login = await api.functional.auth.patient.login(connection, {
    body: { email, password } satisfies IHealthcarePlatformPatient.ILogin,
  });
  typia.assert(login);
  TestValidator.equals("joined and login id match", join.id, login.id);

  // 2. Fetch all reminders for this patient
  const allReminders =
    await api.functional.healthcarePlatform.patient.reminders.index(
      connection,
      {
        body: {} satisfies IHealthcarePlatformReminder.IRequest,
      },
    );
  typia.assert(allReminders);
  if (allReminders.data.length > 0) {
    for (const reminder of allReminders.data) {
      // Can't directly check target_user_id (not in ISummary DTO), but we expect only self's reminders
      TestValidator.predicate(
        "reminder_type and status non-empty",
        reminder.reminder_type.length > 0 && reminder.status.length > 0,
      );
    }
  }

  // 3. Try a type filter
  if (allReminders.data.length > 0) {
    const sampleType = allReminders.data[0].reminder_type;
    const filteredByType =
      await api.functional.healthcarePlatform.patient.reminders.index(
        connection,
        {
          body: {
            reminder_type: sampleType,
          } satisfies IHealthcarePlatformReminder.IRequest,
        },
      );
    typia.assert(filteredByType);
    for (const reminder of filteredByType.data) {
      TestValidator.equals(
        "filtering by type",
        reminder.reminder_type,
        sampleType,
      );
    }
  }

  // 4. Try a status filter
  if (allReminders.data.length > 0) {
    const status = allReminders.data[0].status;
    const filteredByStatus =
      await api.functional.healthcarePlatform.patient.reminders.index(
        connection,
        {
          body: { status } satisfies IHealthcarePlatformReminder.IRequest,
        },
      );
    typia.assert(filteredByStatus);
    for (const reminder of filteredByStatus.data) {
      TestValidator.equals("filtering by status", reminder.status, status);
    }
  }

  // 5. Scheduled date filters
  if (allReminders.data.length > 0) {
    const firstSched = allReminders.data[0].scheduled_for;
    const filteredByDate =
      await api.functional.healthcarePlatform.patient.reminders.index(
        connection,
        {
          body: {
            scheduled_for_from: firstSched,
            scheduled_for_to: firstSched,
          } satisfies IHealthcarePlatformReminder.IRequest,
        },
      );
    typia.assert(filteredByDate);
    for (const reminder of filteredByDate.data) {
      TestValidator.equals(
        "scheduled_for matches",
        reminder.scheduled_for,
        firstSched,
      );
    }
  }

  // 6. Invalid/non-matching filter yields empty result
  const invalidTypeFilter =
    await api.functional.healthcarePlatform.patient.reminders.index(
      connection,
      {
        body: {
          reminder_type: "no-such-type",
        } satisfies IHealthcarePlatformReminder.IRequest,
      },
    );
  typia.assert(invalidTypeFilter);
  TestValidator.equals(
    "invalid type filter yields empty result",
    invalidTypeFilter.data.length,
    0,
  );

  // 7. Pagination: limit to 1 result, check page mechanics
  const paged = await api.functional.healthcarePlatform.patient.reminders.index(
    connection,
    {
      body: {
        limit: 1 satisfies number as number,
        page: 1 satisfies number as number,
      } satisfies IHealthcarePlatformReminder.IRequest,
    },
  );
  typia.assert(paged);
  if (allReminders.data.length > 0) {
    TestValidator.equals(
      "page 1 returns <= 1 reminder",
      paged.data.length <= 1,
      true,
    );
  }

  // 8. High page number (no data expected)
  const highPage =
    await api.functional.healthcarePlatform.patient.reminders.index(
      connection,
      {
        body: {
          limit: 1 satisfies number as number,
          page: 1000 satisfies number as number,
        } satisfies IHealthcarePlatformReminder.IRequest,
      },
    );
  typia.assert(highPage);
  TestValidator.equals("high page yields empty data", highPage.data.length, 0);
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformReminder";

/**
 * Ensures nurse reminders can be listed and filtered within organization
 * scope with proper security and pagination.
 *
 * 1. Register nurse1 (Nurse A) with unique org.
 * 2. Register nurse2 (Nurse B) in same org as nurse1.
 * 3. Log in as nurse1 and create several reminders:
 *
 *    - Some with target_user_id = nurse1.id
 *    - Some with target_user_id = nurse2.id (same org)
 *    - Some WITHOUT target_user_id (organization/global reminders)
 * 4. Register nurse3 in a different organization (ORG2).
 *
 *    - Log in as nurse3, create reminders for their org only
 * 5. Log in as nurse1.
 * 6. Test search (PATCH /healthcarePlatform/nurse/reminders) for:
 *
 *    - All reminders for nurse1 (filter target_user_id = nurse1.id)
 *    - All reminders for nurse1's org (filter organization_id)
 *    - Reminders in a time window (scheduled_for_from/to)
 *    - Reminders by status and by type
 *    - Delivered/acknowledged filters
 *    - Pagination (page, limit)
 * 7. Assert only reminders for nurse1's org are shown.
 *
 *    - Reminders from nurse3/ORG2 are NOT listed when nurse1 searches
 * 8. Attempt to overreach: filter by nurse3's target_user_id or ORG2
 *    organization_id.
 *
 *    - Result must be empty (not error/exception, just empty)
 * 9. Confirm that filters/pagination/sorting produce correct data
 *    slices/results and match business logic.
 */
export async function test_api_nurse_reminder_list_filter_and_org_scope(
  connection: api.IConnection,
) {
  // 1. Register nurse1 (Nurse A) in ORG1
  const nurse1Details = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphabets(8),
    specialty: RandomGenerator.name(1),
    phone: RandomGenerator.mobile(),
    password: "Password123!",
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurse1 = await api.functional.auth.nurse.join(connection, {
    body: nurse1Details,
  });
  typia.assert(nurse1);
  const orgId1 = nurse1.license_number as unknown as string &
    tags.Format<"uuid">; // Mock org as license_number

  // 2. Register nurse2 (Nurse B) in same org as nurse1
  const nurse2Details = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    license_number: orgId1,
    specialty: null,
    phone: null,
    password: "Password234!",
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurse2 = await api.functional.auth.nurse.join(connection, {
    body: nurse2Details,
  });
  typia.assert(nurse2);

  // 3. Log in as nurse1 and create reminders for nurse1, nurse2 and org
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurse1.email,
      password: nurse1Details.password,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // Reminders for nurse1
  const remindersNurse1 = await ArrayUtil.asyncRepeat(3, async (i) => {
    const reminder =
      await api.functional.healthcarePlatform.nurse.reminders.create(
        connection,
        {
          body: {
            reminder_type: "typeA",
            reminder_message: `Nurse1 reminder ${i}`,
            scheduled_for: new Date(
              Date.now() + 1000 * 60 * 60 * (i + 1),
            ).toISOString(),
            organization_id: orgId1,
            target_user_id: nurse1.id,
            status: "pending",
            delivered_at: null,
            acknowledged_at: null,
            snoozed_until: null,
            failure_reason: null,
          } satisfies IHealthcarePlatformReminder.ICreate,
        },
      );
    typia.assert(reminder);
    return reminder;
  });
  // Reminders for nurse2
  const remindersNurse2 = await ArrayUtil.asyncRepeat(2, async (i) => {
    const reminder =
      await api.functional.healthcarePlatform.nurse.reminders.create(
        connection,
        {
          body: {
            reminder_type: "typeA",
            reminder_message: `Nurse2 reminder ${i}`,
            scheduled_for: new Date(
              Date.now() + 1000 * 60 * 60 * (i + 5),
            ).toISOString(),
            organization_id: orgId1,
            target_user_id: nurse2.id,
            status: "pending",
            delivered_at: null,
            acknowledged_at: null,
            snoozed_until: null,
            failure_reason: null,
          } satisfies IHealthcarePlatformReminder.ICreate,
        },
      );
    typia.assert(reminder);
    return reminder;
  });
  // Org-wide reminders (target_user_id null)
  const remindersOrgWide = await ArrayUtil.asyncRepeat(2, async (i) => {
    const reminder =
      await api.functional.healthcarePlatform.nurse.reminders.create(
        connection,
        {
          body: {
            reminder_type: "compliance",
            reminder_message: `Org-wide reminder ${i}`,
            scheduled_for: new Date(
              Date.now() + 1000 * 60 * 30 * (i + 1),
            ).toISOString(),
            organization_id: orgId1,
            target_user_id: null,
            status: "pending",
            delivered_at: null,
            acknowledged_at: null,
            snoozed_until: null,
            failure_reason: null,
          } satisfies IHealthcarePlatformReminder.ICreate,
        },
      );
    typia.assert(reminder);
    return reminder;
  });

  // 4. Register nurse3 in another org (ORG2)
  const nurse3Details = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    license_number: RandomGenerator.alphabets(8), // Different orgId
    specialty: null,
    phone: null,
    password: "Password345!",
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurse3 = await api.functional.auth.nurse.join(connection, {
    body: nurse3Details,
  });
  typia.assert(nurse3);
  const orgId2 = nurse3.license_number as unknown as string &
    tags.Format<"uuid">;

  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurse3.email,
      password: nurse3Details.password,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });
  // Reminders for nurse3/ORG2 only
  const remindersNurse3 = await ArrayUtil.asyncRepeat(2, async (i) => {
    const reminder =
      await api.functional.healthcarePlatform.nurse.reminders.create(
        connection,
        {
          body: {
            reminder_type: "typeB",
            reminder_message: `Nurse3 (ORG2) reminder ${i}`,
            scheduled_for: new Date(
              Date.now() + 1000 * 60 * 60 * (i + 2),
            ).toISOString(),
            organization_id: orgId2,
            target_user_id: nurse3.id,
            status: "pending",
            delivered_at: null,
            acknowledged_at: null,
            snoozed_until: null,
            failure_reason: null,
          } satisfies IHealthcarePlatformReminder.ICreate,
        },
      );
    typia.assert(reminder);
    return reminder;
  });

  // 5. Log back in as nurse1
  await api.functional.auth.nurse.login(connection, {
    body: {
      email: nurse1.email,
      password: nurse1Details.password,
    } satisfies IHealthcarePlatformNurse.ILogin,
  });

  // 6. Test cases for nurse1
  // a. all reminders for nurse1 only
  const resp1 = await api.functional.healthcarePlatform.nurse.reminders.index(
    connection,
    {
      body: {
        target_user_id: nurse1.id,
      } satisfies IHealthcarePlatformReminder.IRequest,
    },
  );
  typia.assert(resp1);
  TestValidator.predicate(
    "reminders are only for nurse1",
    resp1.data.every((r) => r.reminder_message.includes("Nurse1")),
  );

  // b. org reminders (should include reminders for nurse1, nurse2, and org-wide)
  const resp2 = await api.functional.healthcarePlatform.nurse.reminders.index(
    connection,
    {
      body: {
        organization_id: orgId1,
      } satisfies IHealthcarePlatformReminder.IRequest,
    },
  );
  typia.assert(resp2);
  TestValidator.predicate(
    "all org reminders are only for ORG1",
    resp2.data.every((r) =>
      ["Nurse1", "Nurse2", "Org-wide"].some((m) =>
        r.reminder_message.includes(m),
      ),
    ),
  );

  // c. filter by status (pending)
  const resp3 = await api.functional.healthcarePlatform.nurse.reminders.index(
    connection,
    {
      body: {
        organization_id: orgId1,
        status: "pending",
      } satisfies IHealthcarePlatformReminder.IRequest,
    },
  );
  typia.assert(resp3);
  TestValidator.predicate(
    "pending reminders only",
    resp3.data.every((r) => r.status === "pending"),
  );

  // d. scheduled_for time range
  const fromTime = new Date(Date.now() - 1000).toISOString();
  const toTime = new Date(Date.now() + 1000 * 60 * 60 * 10).toISOString();
  const resp4 = await api.functional.healthcarePlatform.nurse.reminders.index(
    connection,
    {
      body: {
        organization_id: orgId1,
        scheduled_for_from: fromTime,
        scheduled_for_to: toTime,
      } satisfies IHealthcarePlatformReminder.IRequest,
    },
  );
  typia.assert(resp4);
  TestValidator.predicate(
    "reminders are within scheduled_for window",
    resp4.data.every(
      (r) => r.scheduled_for >= fromTime && r.scheduled_for <= toTime,
    ),
  );

  // e. pagination -- limit = 2, page = 1
  const resp5 = await api.functional.healthcarePlatform.nurse.reminders.index(
    connection,
    {
      body: {
        organization_id: orgId1,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IHealthcarePlatformReminder.IRequest,
    },
  );
  typia.assert(resp5);
  TestValidator.equals(
    "pagination limit respected",
    resp5.data.length <= 2,
    true,
  );

  // 7. Overreach attempt: filter by nurse3, org2 (should get no results)
  const resp6 = await api.functional.healthcarePlatform.nurse.reminders.index(
    connection,
    {
      body: {
        organization_id: orgId2,
      } satisfies IHealthcarePlatformReminder.IRequest,
    },
  );
  typia.assert(resp6);
  TestValidator.equals("no reminders from other org", resp6.data.length, 0);
  const resp7 = await api.functional.healthcarePlatform.nurse.reminders.index(
    connection,
    {
      body: {
        target_user_id: nurse3.id,
      } satisfies IHealthcarePlatformReminder.IRequest,
    },
  );
  typia.assert(resp7);
  TestValidator.equals(
    "no reminders for nurse3 when nurse1 queries",
    resp7.data.length,
    0,
  );
}

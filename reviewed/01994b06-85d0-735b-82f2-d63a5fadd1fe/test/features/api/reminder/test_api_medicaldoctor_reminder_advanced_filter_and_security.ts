import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformReminder";

/**
 * E2E test for advanced filtering and security logic of medical doctor
 * reminders:
 *
 * 1. Register and login as Doctor A
 * 2. Create reminders with varied types, statuses, scheduled times for Doctor A
 * 3. Create a reminder targeted at another (Doctor B or other user) for security
 *    test
 * 4. Exercise reminder search with filters: by recipient, by type, by status, by
 *    scheduled_for time window, pagination
 * 5. Assert returned reminders match filter logic, only reminders visible to
 *    doctor
 * 6. Attempt to retrieve reminders outside allowed scope (e.g., for other doctor)
 *    and ensure these are denied or not found
 */
export async function test_api_medicaldoctor_reminder_advanced_filter_and_security(
  connection: api.IConnection,
) {
  // 1. Register and login as Doctor A
  const doctorAInfo = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    specialty: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctorA = await api.functional.auth.medicalDoctor.join(connection, {
    body: doctorAInfo,
  });
  typia.assert(doctorA);

  // 2. Create reminders for Doctor A
  const reminderTypes = [
    "appointment",
    "medication",
    "compliance",
    "survey",
  ] as const;
  const statuses = ["pending", "sent", "snoozed", "acknowledged"] as const;
  const timesNow = new Date();
  const remindersA = await ArrayUtil.asyncRepeat(8, async (idx) => {
    const scheduled_for = new Date(
      timesNow.getTime() + idx * 3600 * 1000,
    ).toISOString();
    const status = RandomGenerator.pick(statuses);
    const body = {
      reminder_type: RandomGenerator.pick(reminderTypes),
      reminder_message: RandomGenerator.paragraph({ sentences: 2 }),
      scheduled_for,
      target_user_id: doctorA.id,
      status,
    } satisfies IHealthcarePlatformReminder.ICreate;
    const created =
      await api.functional.healthcarePlatform.medicalDoctor.reminders.create(
        connection,
        { body },
      );
    typia.assert(created);
    return created;
  });

  // 3. Create a Doctor B and reminder for Doctor B (for security test)
  const doctorBInfo = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctorB = await api.functional.auth.medicalDoctor.join(connection, {
    body: doctorBInfo,
  });
  typia.assert(doctorB);
  const reminderBBody = {
    reminder_type: "appointment",
    reminder_message: RandomGenerator.paragraph({ sentences: 2 }),
    scheduled_for: new Date(
      timesNow.getTime() + 24 * 3600 * 1000,
    ).toISOString(),
    target_user_id: doctorB.id,
    status: "pending",
  } satisfies IHealthcarePlatformReminder.ICreate;
  const reminderB =
    await api.functional.healthcarePlatform.medicalDoctor.reminders.create(
      connection,
      { body: reminderBBody },
    );
  typia.assert(reminderB);

  // 4. Filtering by recipient (doctorA.id) returns only Doctor A's reminders
  const respA =
    await api.functional.healthcarePlatform.medicalDoctor.reminders.index(
      connection,
      {
        body: {
          target_user_id: doctorA.id,
        } satisfies IHealthcarePlatformReminder.IRequest,
      },
    );
  typia.assert(respA);
  TestValidator.predicate(
    "reminders for DoctorA only include DoctorA's reminders",
    respA.data.every((r) => r.id !== reminderB.id),
  );

  // 5. Filtering by status/type/pagination
  const sampleType = remindersA[0].reminder_type;
  const respType =
    await api.functional.healthcarePlatform.medicalDoctor.reminders.index(
      connection,
      {
        body: {
          target_user_id: doctorA.id,
          reminder_type: sampleType,
          limit: 3,
          page: 1,
        } satisfies IHealthcarePlatformReminder.IRequest,
      },
    );
  typia.assert(respType);
  TestValidator.predicate(
    "reminders type filter returns only correct type",
    respType.data.every((r) => r.reminder_type === sampleType),
  );
  TestValidator.predicate(
    "reminders pagination respects limit",
    respType.data.length <= 3,
  );

  // 6. Time window filter (future-only)
  const futureTime = new Date(
    timesNow.getTime() + 3 * 3600 * 1000,
  ).toISOString();
  const respWindow =
    await api.functional.healthcarePlatform.medicalDoctor.reminders.index(
      connection,
      {
        body: {
          target_user_id: doctorA.id,
          scheduled_for_from: futureTime,
        } satisfies IHealthcarePlatformReminder.IRequest,
      },
    );
  typia.assert(respWindow);
  TestValidator.predicate(
    "filtered by scheduled_for_from only returns reminders in future",
    respWindow.data.every((r) => r.scheduled_for >= futureTime),
  );

  // 7. Security: Doctor A tries to filter by Doctor B's id and should get none
  const respSecurity =
    await api.functional.healthcarePlatform.medicalDoctor.reminders.index(
      connection,
      {
        body: {
          target_user_id: doctorB.id,
        } satisfies IHealthcarePlatformReminder.IRequest,
      },
    );
  typia.assert(respSecurity);
  TestValidator.equals(
    "DoctorA retrieving DoctorB's reminders should not receive any",
    respSecurity.data.length,
    0,
  );
}

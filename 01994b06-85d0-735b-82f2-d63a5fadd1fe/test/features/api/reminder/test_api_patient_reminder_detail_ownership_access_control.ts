import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate that a patient can only access their own reminders and not others'.
 *
 * 1. Register first patient and login (patientA)
 * 2. Register a second patient (patientB)
 * 3. Register and login system admin
 * 4. System admin creates a reminder for patientA
 * 5. As patientA, retrieve the reminder (should succeed, validate fields)
 * 6. As patientB, attempt to fetch patientA's reminder (should fail)
 * 7. As patientA, try to fetch a fake reminderId (should fail)
 */
export async function test_api_patient_reminder_detail_ownership_access_control(
  connection: api.IConnection,
) {
  // 1. Register patientA
  const patientAEmail = `${RandomGenerator.alphabets(8)}@a.example.com`;
  const patientAJoin = {
    email: patientAEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date("1991-01-01").toISOString(),
    password: "testpw!123",
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patientA: IHealthcarePlatformPatient.IAuthorized =
    await api.functional.auth.patient.join(connection, { body: patientAJoin });
  typia.assert(patientA);

  // 2. Register patientB
  const patientBEmail = `${RandomGenerator.alphabets(8)}@b.example.com`;
  const patientBJoin = {
    email: patientBEmail,
    full_name: RandomGenerator.name(),
    date_of_birth: new Date("1992-02-02").toISOString(),
    password: "testpw!321",
  } satisfies IHealthcarePlatformPatient.IJoin;
  const patientB: IHealthcarePlatformPatient.IAuthorized =
    await api.functional.auth.patient.join(connection, { body: patientBJoin });
  typia.assert(patientB);

  // 3. Register and login admin
  const adminEmail = `${RandomGenerator.alphabets(8)}@admin.com`;
  await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: adminEmail,
      password: "adminpass#111",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: "adminpass#111",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // 4. Admin creates a reminder for patientA
  const reminderCreate = {
    reminder_type: "medication",
    reminder_message: RandomGenerator.paragraph({ sentences: 4 }),
    scheduled_for: new Date(Date.now() + 86400000).toISOString(),
    target_user_id: patientA.id,
  } satisfies IHealthcarePlatformReminder.ICreate;
  const createdReminder =
    await api.functional.healthcarePlatform.systemAdmin.reminders.create(
      connection,
      {
        body: reminderCreate,
      },
    );
  typia.assert(createdReminder);
  TestValidator.equals(
    "reminder assigned to patientA",
    createdReminder.target_user_id,
    patientA.id,
  );

  // 5. Login as patientA for authorized fetch
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientAEmail,
      password: "testpw!123",
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  const fetchedReminder =
    await api.functional.healthcarePlatform.patient.reminders.at(connection, {
      reminderId: createdReminder.id,
    });
  typia.assert(fetchedReminder);
  TestValidator.equals(
    "reminder id match",
    fetchedReminder.id,
    createdReminder.id,
  );
  TestValidator.equals(
    "reminder user ownership",
    fetchedReminder.target_user_id,
    patientA.id,
  );
  TestValidator.equals(
    "reminder message match",
    fetchedReminder.reminder_message,
    reminderCreate.reminder_message,
  );

  // 6. Login as patientB and try to access patientA's reminder (should be denied)
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientBEmail,
      password: "testpw!321",
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  await TestValidator.error(
    "patientB denied access to patientA's reminder",
    async () => {
      await api.functional.healthcarePlatform.patient.reminders.at(connection, {
        reminderId: createdReminder.id,
      });
    },
  );

  // 7. As patientA, try to fetch a non-existent reminder (should error)
  await api.functional.auth.patient.login(connection, {
    body: {
      email: patientAEmail,
      password: "testpw!123",
    } satisfies IHealthcarePlatformPatient.ILogin,
  });
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("fetching fake reminder should fail", async () => {
    await api.functional.healthcarePlatform.patient.reminders.at(connection, {
      reminderId: fakeId,
    });
  });
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * Validate medical doctor can access reminder detail only for their own
 * reminders and not others'.
 *
 * Flow:
 *
 * 1. Register and login as first doctor (doctorA)
 * 2. Create a reminder assigned/tested for doctorA
 * 3. Retrieve the reminder detail as doctorA and verify returned fields
 * 4. Register and login as a second doctor (doctorB)
 * 5. Attempt to access doctorA's reminder as doctorB and confirm error/denial
 */
export async function test_api_reminder_detail_medical_doctor_authorized_access(
  connection: api.IConnection,
) {
  // 1. Register and login as doctorA
  const doctorAEmail: string = typia.random<string & tags.Format<"email">>();
  const doctorAJOIN = {
    email: doctorAEmail,
    full_name: RandomGenerator.name(2),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    specialty: RandomGenerator.name(1),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctorA = await api.functional.auth.medicalDoctor.join(connection, {
    body: doctorAJOIN,
  });
  typia.assert(doctorA);

  // 2. Create a reminder as doctorA
  const reminderInput = {
    reminder_type: "appointment",
    reminder_message: RandomGenerator.paragraph({ sentences: 6 }),
    scheduled_for: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    status: "pending",
    organization_id: null,
    target_user_id: null,
    delivered_at: null,
    acknowledged_at: null,
    snoozed_until: null,
    failure_reason: null,
  } satisfies IHealthcarePlatformReminder.ICreate;
  const createdReminder =
    await api.functional.healthcarePlatform.medicalDoctor.reminders.create(
      connection,
      {
        body: reminderInput,
      },
    );
  typia.assert(createdReminder);

  // 3. Retrieve and validate
  const retrieved =
    await api.functional.healthcarePlatform.medicalDoctor.reminders.at(
      connection,
      {
        reminderId: createdReminder.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "reminder_type matches",
    retrieved.reminder_type,
    reminderInput.reminder_type,
  );
  TestValidator.equals(
    "reminder_message matches",
    retrieved.reminder_message,
    reminderInput.reminder_message,
  );
  TestValidator.equals(
    "scheduled_for matches",
    retrieved.scheduled_for,
    reminderInput.scheduled_for,
  );
  TestValidator.equals(
    "status matches",
    retrieved.status,
    reminderInput.status,
  );

  // 4. Register/login as doctorB
  const doctorBEmail: string = typia.random<string & tags.Format<"email">>();
  const doctorBJOIN = {
    email: doctorBEmail,
    full_name: RandomGenerator.name(2),
    npi_number: RandomGenerator.alphaNumeric(10),
    password: RandomGenerator.alphaNumeric(12),
    specialty: null,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformMedicalDoctor.IJoin;
  const doctorB = await api.functional.auth.medicalDoctor.join(connection, {
    body: doctorBJOIN,
  });
  typia.assert(doctorB);

  // 5. As doctorB, attempt to access doctorA's reminder and expect error
  await TestValidator.error(
    "doctorB denied access to doctorA's reminder",
    async () => {
      await api.functional.healthcarePlatform.medicalDoctor.reminders.at(
        connection,
        {
          reminderId: createdReminder.id,
        },
      );
    },
  );
}

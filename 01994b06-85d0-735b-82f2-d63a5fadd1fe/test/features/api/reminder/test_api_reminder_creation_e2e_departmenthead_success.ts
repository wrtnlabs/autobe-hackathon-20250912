import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";
import type { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";

/**
 * E2E test for successful reminder creation by department head:
 *
 * 1. Register a department head, confirm attributes/token
 * 2. Login as the department head to establish authentication context
 * 3. Register a nurse as the reminder recipient, check attributes/token
 * 4. Department head creates a reminder targeting the nurse, with business-valid
 *    attributes.
 * 5. Assert response structure and that fields (target_user_id, type, message,
 *    schedule) are correct
 */
export async function test_api_reminder_creation_e2e_departmenthead_success(
  connection: api.IConnection,
) {
  // Step 1: Register department head
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadPassword = RandomGenerator.alphaNumeric(12);
  const deptHeadJoin = {
    email: deptHeadEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: deptHeadPassword,
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const deptHeadAuth = await api.functional.auth.departmentHead.join(
    connection,
    { body: deptHeadJoin },
  );
  typia.assert(deptHeadAuth);
  TestValidator.equals(
    "department head role is departmentHead",
    deptHeadAuth.role,
    "departmentHead",
  );

  // Step 2: Login as department head to ensure explicit authentication
  const deptHeadLogin = {
    email: deptHeadEmail,
    password: deptHeadPassword,
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  const deptHeadLoginResp = await api.functional.auth.departmentHead.login(
    connection,
    { body: deptHeadLogin },
  );
  typia.assert(deptHeadLoginResp);
  TestValidator.equals(
    "login email matches join",
    deptHeadLoginResp.email,
    deptHeadEmail,
  );
  TestValidator.equals(
    "login user id matches",
    deptHeadLoginResp.id,
    deptHeadAuth.id,
  );

  // Step 3: Register a nurse under the organization/department
  const nurseEmail = typia.random<string & tags.Format<"email">>();
  const nurseLicense = RandomGenerator.alphaNumeric(10);
  const nurseJoin = {
    email: nurseEmail,
    full_name: RandomGenerator.name(),
    license_number: nurseLicense,
    specialty: RandomGenerator.paragraph({ sentences: 1, wordMin: 5 }),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformNurse.IJoin;
  const nurseAuth = await api.functional.auth.nurse.join(connection, {
    body: nurseJoin,
  });
  typia.assert(nurseAuth);

  // Step 4: Department head creates a reminder for this nurse
  const reminderType = "compliance";
  const reminderMessage = RandomGenerator.paragraph({ sentences: 4 });
  // Schedule 1 hour from now
  const scheduledFor = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const reminderCreate = {
    reminder_type: reminderType,
    reminder_message: reminderMessage,
    scheduled_for: scheduledFor,
    target_user_id: nurseAuth.id,
  } satisfies IHealthcarePlatformReminder.ICreate;
  const reminderResp =
    await api.functional.healthcarePlatform.departmentHead.reminders.create(
      connection,
      {
        body: reminderCreate,
      },
    );
  typia.assert(reminderResp);
  TestValidator.equals(
    "reminder target_user_id is nurse",
    reminderResp.target_user_id,
    nurseAuth.id,
  );
  TestValidator.equals(
    "reminder type is compliance",
    reminderResp.reminder_type,
    reminderType,
  );
  TestValidator.equals(
    "reminder message matches",
    reminderResp.reminder_message,
    reminderMessage,
  );
  TestValidator.equals(
    "reminder scheduled_for matches",
    reminderResp.scheduled_for,
    scheduledFor,
  );
  TestValidator.equals(
    "reminder status is pending",
    reminderResp.status,
    "pending",
  );
}

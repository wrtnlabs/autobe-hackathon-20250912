import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotification";

/**
 * Test notification creation for all recipient types and required error
 * handling.
 *
 * 1. Create a notification with applicant recipient:
 *
 *    - Provide only 'recipient_applicant_id' as a random UUID.
 *    - Ensure event_type, reference_table, reference_id, and status are
 *         provided.
 *    - Assert API returns a valid notification with expected values.
 * 2. Create a notification with HR recruiter recipient:
 *
 *    - Provide only 'recipient_hrrecruiter_id' as a random UUID.
 * 3. Create a notification with tech reviewer recipient:
 *
 *    - Provide only 'recipient_techreviewer_id' as a random UUID.
 * 4. Create a notification with system admin recipient:
 *
 *    - Provide only 'recipient_systemadmin_id' as a random UUID.
 * 5. Create notification with multiple recipient types (applicant + HR):
 *
 *    - Provide both recipient_applicant_id and recipient_hrrecruiter_id as
 *         different UUIDs.
 *    - (validate that this is accepted if DTO and API allow, else expect an
 *         error)
 * 6. Attempt to create with NO recipients at all:
 *
 *    - Omit all recipient_*_id fields.
 *    - Expect a validation/business logic error.
 */
export async function test_api_notification_creation_all_recipient_types(
  connection: api.IConnection,
) {
  // 1. Create notification for individual recipient types
  const recipientTypes = [
    { field: "recipient_applicant_id" },
    { field: "recipient_hrrecruiter_id" },
    { field: "recipient_techreviewer_id" },
    { field: "recipient_systemadmin_id" },
  ];
  for (const recipient of recipientTypes) {
    const requestBody = {
      [recipient.field]: typia.random<string & tags.Format<"uuid">>(),
      event_type: "application_status_update",
      reference_table: "ats_recruitment_applications",
      reference_id: typia.random<string & tags.Format<"uuid">>(),
      payload_json: JSON.stringify({ foo: RandomGenerator.name() }),
      status: "pending",
    } satisfies IAtsRecruitmentNotification.ICreate;
    const response = await api.functional.atsRecruitment.notifications.create(
      connection,
      { body: requestBody },
    );
    typia.assert(response);
    TestValidator.equals(
      `notification id exists for ${recipient.field}`,
      typeof response.id,
      "string",
    );
    TestValidator.equals(
      `correct event_type in response for ${recipient.field}`,
      response.event_type,
      requestBody.event_type,
    );
    TestValidator.equals(
      `correct reference_table in response for ${recipient.field}`,
      response.reference_table,
      requestBody.reference_table,
    );
    TestValidator.equals(
      `status in response for ${recipient.field}`,
      response.status,
      requestBody.status,
    );
  }
  // 2. Create notification with applicant and HR recruiter
  const requestBodyMulti = {
    recipient_applicant_id: typia.random<string & tags.Format<"uuid">>(),
    recipient_hrrecruiter_id: typia.random<string & tags.Format<"uuid">>(),
    event_type: "interview_scheduled",
    reference_table: "ats_recruitment_interviews",
    reference_id: typia.random<string & tags.Format<"uuid">>(),
    payload_json: JSON.stringify({ scheduled: true }),
    status: "pending",
  } satisfies IAtsRecruitmentNotification.ICreate;
  const respMulti = await api.functional.atsRecruitment.notifications.create(
    connection,
    { body: requestBodyMulti },
  );
  typia.assert(respMulti);
  TestValidator.equals(
    "notification id exists for multi recipient",
    typeof respMulti.id,
    "string",
  );
  // 3. Error: Create notification with NO recipients
  const requestBodyNoRecipient = {
    event_type: "export_complete",
    reference_table: "ats_recruitment_exports",
    reference_id: typia.random<string & tags.Format<"uuid">>(),
    payload_json: JSON.stringify({ result: "success" }),
    status: "pending",
  } satisfies IAtsRecruitmentNotification.ICreate;
  await TestValidator.error("missing recipients should fail", async () => {
    await api.functional.atsRecruitment.notifications.create(connection, {
      body: requestBodyNoRecipient,
    });
  });
}

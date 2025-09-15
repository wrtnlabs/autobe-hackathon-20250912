import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotification";

/**
 * Validate retrieving ATS notification details by unique ID.
 *
 * 1. Create a notification record with all required business context:
 *
 *    - Provide one recipient, an event_type, reference_table, reference_id, and
 *         status. Optionally provide payload_json.
 * 2. Call the GET endpoint with the returned notification ID.
 *
 *    - Assert the full notification is returned with all the same details.
 * 3. Attempt to GET a notification using a random, non-existent notificationId
 *    (must be a valid UUID but not used). Assert error (not found).
 *
 * This test validates API data integrity, correct delivery of business
 * context fields, proper handling of missing records, and that only fields
 * defined by the notification schema are handled.
 */
export async function test_api_notification_retrieve_by_id(
  connection: api.IConnection,
) {
  // 1. Create a notification
  const notificationCreateBody = {
    recipient_applicant_id: typia.random<string & tags.Format<"uuid">>(),
    event_type: "application_status_update",
    reference_table: "ats_recruitment_applications",
    reference_id: typia.random<string & tags.Format<"uuid">>(),
    status: "pending",
    payload_json: JSON.stringify({ message: RandomGenerator.paragraph() }),
  } satisfies IAtsRecruitmentNotification.ICreate;

  const created = await api.functional.atsRecruitment.notifications.create(
    connection,
    { body: notificationCreateBody },
  );
  typia.assert(created);

  // 2. Retrieve the notification by ID
  const found = await api.functional.atsRecruitment.notifications.at(
    connection,
    { notificationId: created.id },
  );
  typia.assert(found);
  TestValidator.equals("id matches", found.id, created.id);
  TestValidator.equals(
    "recipient_applicant_id matches",
    found.recipient_applicant_id,
    notificationCreateBody.recipient_applicant_id,
  );
  TestValidator.equals(
    "event_type matches",
    found.event_type,
    notificationCreateBody.event_type,
  );
  TestValidator.equals(
    "reference_table matches",
    found.reference_table,
    notificationCreateBody.reference_table,
  );
  TestValidator.equals(
    "reference_id matches",
    found.reference_id,
    notificationCreateBody.reference_id,
  );
  TestValidator.equals(
    "status matches",
    found.status,
    notificationCreateBody.status,
  );
  TestValidator.equals(
    "payload_json matches",
    found.payload_json,
    notificationCreateBody.payload_json,
  );

  // 3. Error case: Getting a non-existent notification
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent notification returns error",
    async () => {
      await api.functional.atsRecruitment.notifications.at(connection, {
        notificationId: nonExistentId,
      });
    },
  );
}

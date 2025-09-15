import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotification";

/**
 * Test notification deletion (erase) permissions and not-found error scenarios.
 *
 * 1. Create a notification and obtain its UUID
 * 2. Delete as the (default) authorized actor
 * 3. Delete again to verify idempotent not-found error
 * 4. Try deleting non-existent notification (random UUID)
 * 5. (Simulate) Attempt to delete as unauthorized actor (for true E2E this
 *    requires context switching; here, skip or document logic)
 */
export async function test_api_notification_erase_permissions_and_not_found(
  connection: api.IConnection,
) {
  // 1. Create a notification
  const notificationCreate: IAtsRecruitmentNotification =
    await api.functional.atsRecruitment.notifications.create(connection, {
      body: {
        recipient_applicant_id: typia.random<string & tags.Format<"uuid">>(),
        event_type: RandomGenerator.paragraph({ sentences: 2 }),
        reference_table: RandomGenerator.paragraph({ sentences: 2 }),
        reference_id: typia.random<string & tags.Format<"uuid">>(),
        status: "pending",
      } satisfies IAtsRecruitmentNotification.ICreate,
    });
  typia.assert(notificationCreate);
  const notificationId = notificationCreate.id;

  // 2. Delete the notification
  await api.functional.atsRecruitment.notifications.erase(connection, {
    notificationId,
  });

  // 3. Attempt to delete again: should error
  await TestValidator.error(
    "deleting already deleted notification should fail",
    async () => {
      await api.functional.atsRecruitment.notifications.erase(connection, {
        notificationId,
      });
    },
  );

  // 4. Try deleting a completely random UUID (should error)
  await TestValidator.error(
    "deleting non-existent notificationId should fail",
    async () => {
      await api.functional.atsRecruitment.notifications.erase(connection, {
        notificationId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 5. (Optional; not implementable without auth context switch) - cannot fully implement actor permission boundary with existing test API
}

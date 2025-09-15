import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotification";

/**
 * Validate the update workflow for ATS recruitment notifications.
 *
 * 1. Create a new notification (to get a valid notificationId).
 * 2. Update editable fields: status & payload_json. Validate updated fields.
 * 3. Attempt update with a random (non-existent) notificationId; verify error.
 * 4. (If possible in test context) Simulate unauthorized update and verify failed
 *    (skipped here).
 */
export async function test_api_notification_update_workflow_success_and_validation(
  connection: api.IConnection,
) {
  // 1. Create a new notification (valid notificationId)
  const createBody = typia.random<IAtsRecruitmentNotification.ICreate>();
  const created: IAtsRecruitmentNotification =
    await api.functional.atsRecruitment.notifications.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 2. Update editable fields: status & payload_json
  const updateInput = {
    status: "delivered",
    payload_json: JSON.stringify({
      updated: true,
      content: "Updated payload context.",
    }),
  } satisfies IAtsRecruitmentNotification.IUpdate;
  const updated = await api.functional.atsRecruitment.notifications.update(
    connection,
    {
      notificationId: created.id,
      body: updateInput,
    },
  );
  typia.assert(updated);
  TestValidator.equals("status updated", updated.status, updateInput.status);
  TestValidator.equals(
    "payload_json updated",
    updated.payload_json,
    updateInput.payload_json,
  );
  TestValidator.equals("id does not change", updated.id, created.id);
  TestValidator.equals(
    "reference_table is immutable",
    updated.reference_table,
    created.reference_table,
  );
  TestValidator.equals(
    "event_type is immutable",
    updated.event_type,
    created.event_type,
  );

  // 3. Attempt update with non-existent notificationId
  await TestValidator.error(
    "reject update on non-existent notificationId",
    async () => {
      await api.functional.atsRecruitment.notifications.update(connection, {
        notificationId: typia.random<string & tags.Format<"uuid">>(),
        body: updateInput,
      });
    },
  );

  // 4. (Optional) Attempt update as unauthorized user (skipped; requires identity control)
}

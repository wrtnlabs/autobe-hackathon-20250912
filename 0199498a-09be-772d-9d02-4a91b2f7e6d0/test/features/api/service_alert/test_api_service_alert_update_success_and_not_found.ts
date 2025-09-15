import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiServiceAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiServiceAlert";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate updating service alerts by system administrators, covering success
 * and not-found scenarios.
 *
 * Steps:
 *
 * 1. Register a new system administrator (join, actor_type 'systemAdmin')
 * 2. Authenticate as system admin (login)
 * 3. Create a new service alert record
 * 4. Update alert (edit content and mark as resolved)
 * 5. Assert that all returned fields reflect the update
 * 6. Attempt to update a non-existent (random) serviceAlertId and expect error
 * 7. No field-level type validation error cases attempted (prohibited)
 */
export async function test_api_service_alert_update_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const externalAdminId = RandomGenerator.alphaNumeric(12);
  const joinRes = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: externalAdminId,
      email: adminEmail,
      actor_type: "systemAdmin",
    },
  });
  typia.assert(joinRes);
  TestValidator.equals(
    "actor_type is systemAdmin",
    joinRes.actor_type,
    "systemAdmin",
  );

  // 2. Login as system admin
  const loginRes = await api.functional.auth.systemAdmin.login(connection, {
    body: { external_admin_id: externalAdminId, email: adminEmail },
  });
  typia.assert(loginRes);
  TestValidator.equals(
    "login actor_type is systemAdmin",
    loginRes.actor_type,
    "systemAdmin",
  );

  // 3. Create a new service alert
  const alertCreate = {
    alert_type: RandomGenerator.pick([
      "error",
      "warning",
      "info",
      "quota",
      "incident",
    ] as const),
    alert_code: RandomGenerator.alphaNumeric(8),
    content: RandomGenerator.paragraph({ sentences: 4 }),
    environment: RandomGenerator.pick([
      "production",
      "staging",
      "development",
      "local",
    ] as const),
    resolved: false,
    resolution_note: null,
  } satisfies IStoryfieldAiServiceAlert.ICreate;
  const alert =
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.create(
      connection,
      { body: alertCreate },
    );
  typia.assert(alert);
  TestValidator.equals(
    "alert_type matches",
    alert.alert_type,
    alertCreate.alert_type,
  );
  TestValidator.equals("resolved (initial)", alert.resolved, false);
  TestValidator.equals("resolution_note is null", alert.resolution_note, null);

  // 4. Update the alert with new content and mark as resolved
  const updatedContent = RandomGenerator.paragraph({ sentences: 3 });
  const updatedNote = RandomGenerator.paragraph({ sentences: 1 });
  const updated =
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.update(
      connection,
      {
        serviceAlertId: alert.id,
        body: {
          resolved: true,
          content: updatedContent,
          resolution_note: updatedNote,
        },
      },
    );
  typia.assert(updated);
  TestValidator.equals("serviceAlertId unchanged", updated.id, alert.id);
  TestValidator.equals("resolved status updated", updated.resolved, true);
  TestValidator.equals("content updated", updated.content, updatedContent);
  TestValidator.equals(
    "resolution_note updated",
    updated.resolution_note,
    updatedNote,
  );

  // 5. Attempt to update a non-existent serviceAlertId
  await TestValidator.error(
    "updating non-existent serviceAlertId should fail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.serviceAlerts.update(
        connection,
        {
          serviceAlertId: typia.random<string & tags.Format<"uuid">>(),
          body: { content: "should not work" },
        },
      );
    },
  );
}

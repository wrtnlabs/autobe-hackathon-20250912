import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiServiceAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiServiceAlert";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validates soft-deletion, repeat deletion error, and unauthorized deletion for
 * service alerts.
 *
 * Steps:
 *
 * 1. Register and log in as system admin
 * 2. Create a service alert
 * 3. Soft-delete it
 * 4. Attempt repeat delete (expect error)
 * 5. Attempt delete unauthenticated (expect error)
 */
export async function test_api_service_alert_deletion_success_and_edge_cases(
  connection: api.IConnection,
) {
  // 1. Register admin
  const externalAdminId = RandomGenerator.alphaNumeric(16);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@sysadmin.test`;
  const joinResult = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: externalAdminId,
      email: adminEmail,
      actor_type: "systemAdmin",
    } satisfies IStoryfieldAiSystemAdmin.IJoin,
  });
  typia.assert(joinResult);

  // 2. Login as admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: externalAdminId,
      email: adminEmail,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });

  // 3. Create service alert
  const createBody = {
    alert_type: RandomGenerator.pick([
      "error",
      "warning",
      "info",
      "incident",
      "quota",
    ] as const),
    alert_code: RandomGenerator.alphaNumeric(10),
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
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
      { body: createBody },
    );
  typia.assert(alert);

  // 4. Soft-delete
  await api.functional.storyfieldAi.systemAdmin.serviceAlerts.erase(
    connection,
    {
      serviceAlertId: alert.id,
    },
  );
  // Step to verify that alert is not returned in list/search APIs is omitted (APIs not provided)

  // 5. Attempt repeat delete (expect error)
  await TestValidator.error("repeat deletion should fail", async () => {
    await api.functional.storyfieldAi.systemAdmin.serviceAlerts.erase(
      connection,
      {
        serviceAlertId: alert.id,
      },
    );
  });

  // 6. Attempt unauthorized deletion (simulate bare connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated deletion attempt should fail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.serviceAlerts.erase(
        unauthConn,
        {
          serviceAlertId: alert.id,
        },
      );
    },
  );
}

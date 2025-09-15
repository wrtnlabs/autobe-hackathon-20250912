import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEscalationEvent";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test deletion of escalation events by authenticated system admin.
 *
 * Steps:
 *
 * 1. Register/authenticate system admin (get token, set connection)
 * 2. Create a valid escalation event for testing
 * 3. Delete the escalation event by ID as system admin
 * 4. Attempt to delete the same event again (should fail: non-existent)
 * 5. Attempt delete with invalid event ID (should fail)
 * 6. Attempt delete with unauthenticated/insufficient privilege (should fail)
 * 7. (No endpoint to verify audit trail, cannot test directly)
 *
 * Validates business rule: only authenticated system admin can perform hard
 * delete, event is actually removed, errors on double/delete/missing
 * privilege.
 */
export async function test_api_escalation_event_delete_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register/authenticate system admin. Use a random business email, full name, password, etc.
  const sysAdminRegister = {
    email: RandomGenerator.name(1).replace(/\s/g, "") + "@enterprise.com",
    full_name: RandomGenerator.name(2),
    phone: undefined, // Optional
    provider: "local",
    provider_key:
      RandomGenerator.name(1).replace(/\s/g, "") + "@enterprise.com",
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;

  const adminAuth: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: sysAdminRegister,
    });
  typia.assert(adminAuth);

  // 2. Create an escalation event as system admin
  const escalationEventCreate = {
    source_notification_id: typia.random<string & tags.Format<"uuid">>(),
    target_user_id: undefined,
    target_role_id: undefined,
    escalation_type: "sla_violation",
    escalation_level: "critical",
    deadline_at: new Date(Date.now() + 3600000).toISOString(),
    resolution_status: "open",
    resolution_time: undefined,
    resolution_notes: undefined,
  } satisfies IHealthcarePlatformEscalationEvent.ICreate;

  const event: IHealthcarePlatformEscalationEvent =
    await api.functional.healthcarePlatform.systemAdmin.escalationEvents.create(
      connection,
      { body: escalationEventCreate },
    );
  typia.assert(event);

  // 3. Delete the escalation event by ID
  await api.functional.healthcarePlatform.systemAdmin.escalationEvents.erase(
    connection,
    { escalationEventId: event.id },
  );

  // 4. Attempt to delete same event again: should error (non-existent)
  await TestValidator.error(
    "delete non-existent escalation event",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.escalationEvents.erase(
        connection,
        { escalationEventId: event.id },
      );
    },
  );

  // 5. Attempt to delete invalid/non-existent event ID
  await TestValidator.error("delete invalid escalation event id", async () => {
    await api.functional.healthcarePlatform.systemAdmin.escalationEvents.erase(
      connection,
      { escalationEventId: typia.random<string & tags.Format<"uuid">>() },
    );
  });

  // 6. Attempt delete without authentication/insufficient privilege.
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot delete escalation event",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.escalationEvents.erase(
        unauthConn,
        { escalationEventId: event.id },
      );
    },
  );
}

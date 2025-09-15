import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEscalationEvent";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test status, assignment, and deadline updates for escalation events as a
 * system admin.
 *
 * Validates the following sequence:
 *
 * 1. A system admin account is registered via /auth/systemAdmin/join.
 * 2. The admin creates a new escalation event with status 'open' and typical
 *    metadata.
 * 3. The escalation event is updated: escalation_level escalated, deadline pushed
 *    out, status set to 'resolved', notes and disposition provided.
 * 4. The test confirms that changes to assignment, level, status, and deadline are
 *    reflected.
 * 5. Error: attempt to update a non-existent escalationEventId and verify API
 *    returns an error.
 * 6. Error: attempt to revert status after resolved and confirm error.
 */
export async function test_api_escalation_event_status_update_and_reassignment(
  connection: api.IConnection,
) {
  // 1. Register and authorize system admin
  const adminEmail = `${RandomGenerator.alphaNumeric(12)}@enterprise-corp.com`;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: adminEmail,
        password: RandomGenerator.alphaNumeric(15),
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create escalation event
  const event: IHealthcarePlatformEscalationEvent =
    await api.functional.healthcarePlatform.systemAdmin.escalationEvents.create(
      connection,
      {
        body: {
          source_notification_id: typia.random<string & tags.Format<"uuid">>(),
          target_user_id: admin.id,
          escalation_type: RandomGenerator.pick([
            "sla_violation",
            "compliance_required",
            "system_alert",
            "breach",
          ]),
          escalation_level: RandomGenerator.pick([
            "normal",
            "urgent",
            "critical",
          ]),
          deadline_at: new Date(Date.now() + 86400000).toISOString(),
          resolution_status: "open",
          resolution_time: undefined,
          resolution_notes: undefined,
        } satisfies IHealthcarePlatformEscalationEvent.ICreate,
      },
    );
  typia.assert(event);
  TestValidator.equals(
    "event assigned to admin",
    event.target_user_id,
    admin.id,
  );

  // 3. Update event: escalate, update deadline, mark resolved and add resolution notes
  const newDeadline = new Date(Date.now() + 3 * 86400000).toISOString();
  const updateBody = {
    escalation_level: "critical", // escalate
    deadline_at: newDeadline, // push deadline out
    resolution_status: "resolved",
    resolution_time: new Date().toISOString(),
    resolution_notes: RandomGenerator.paragraph({ sentences: 6 }),
    target_role_id: typia.random<string & tags.Format<"uuid">>(), // simulate reassigning to a role
    target_user_id: null,
  } satisfies IHealthcarePlatformEscalationEvent.IUpdate;
  const updated: IHealthcarePlatformEscalationEvent =
    await api.functional.healthcarePlatform.systemAdmin.escalationEvents.update(
      connection,
      {
        escalationEventId: event.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("level escalated", updated.escalation_level, "critical");
  TestValidator.equals("deadline updated", updated.deadline_at, newDeadline);
  TestValidator.equals(
    "now role-assigned and not user-assigned",
    updated.target_user_id,
    null,
  );
  TestValidator.equals(
    "role id set",
    updated.target_role_id,
    updateBody.target_role_id,
  );
  TestValidator.equals(
    "marked resolved",
    updated.resolution_status,
    "resolved",
  );
  TestValidator.equals(
    "resolution time matches",
    updated.resolution_time,
    updateBody.resolution_time,
  );
  TestValidator.equals(
    "notes updated",
    updated.resolution_notes,
    updateBody.resolution_notes,
  );

  TestValidator.notEquals(
    "status changed from open to resolved",
    event.resolution_status,
    updated.resolution_status,
  );
  TestValidator.notEquals(
    "deadline changed",
    event.deadline_at,
    updated.deadline_at,
  );
  TestValidator.notEquals(
    "role id added",
    event.target_role_id,
    updated.target_role_id,
  );

  // 4. Error: non-existent escalationEventId
  await TestValidator.error("non-existent event update fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.escalationEvents.update(
      connection,
      {
        escalationEventId: typia.random<string & tags.Format<"uuid">>(), // unlikely to exist
        body: {
          resolution_status: "resolved",
        } satisfies IHealthcarePlatformEscalationEvent.IUpdate,
      },
    );
  });

  // 5. Error: illegal status transition (try reset resolved to open)
  await TestValidator.error(
    "cannot transition from resolved to open",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.escalationEvents.update(
        connection,
        {
          escalationEventId: event.id,
          body: {
            resolution_status: "open",
          } satisfies IHealthcarePlatformEscalationEvent.IUpdate,
        },
      );
    },
  );
}

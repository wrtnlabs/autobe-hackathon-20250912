import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEscalationEvent";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate retrieval of an escalation event by a system admin, covering
 * success, forbidden, and not-found scenarios.
 *
 * Steps:
 *
 * 1. Register and login as system admin (POST /auth/systemAdmin/join), getting
 *    appropriate credentials.
 * 2. Create an escalation event (POST
 *    /healthcarePlatform/systemAdmin/escalationEvents) with required fields.
 * 3. Retrieve the created event successfully (GET
 *    /healthcarePlatform/systemAdmin/escalationEvents/{id}) and validate all
 *    data matches.
 * 4. Attempt retrieval using a random non-existent escalationEventId: expect
 *    error.
 * 5. Attempt retrieval while unauthenticated: expect error.
 */
export async function test_api_escalation_event_retrieval_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate system admin
  const adminEmail: string = RandomGenerator.name(2) + "@enterprise-corp.com";
  const joinResult: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        provider: "local",
        provider_key: adminEmail,
        password: "StrongP@ssword!123",
      } satisfies IHealthcarePlatformSystemAdmin.IJoin,
    });
  typia.assert(joinResult);

  // 2. Create escalation event as authenticated admin
  const eventBody = {
    source_notification_id: typia.random<string & tags.Format<"uuid">>(),
    escalation_type: RandomGenerator.pick([
      "sla_violation",
      "breach",
      "compliance_required",
      "business_policy",
      "system_alert",
    ] as const),
    escalation_level: RandomGenerator.pick([
      "critical",
      "urgent",
      "normal",
      "info",
    ] as const),
    deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    resolution_status: RandomGenerator.pick([
      "open",
      "in_progress",
      "resolved",
      "expired",
      "error",
      "dismissed",
    ] as const),
    target_user_id: undefined,
    target_role_id: undefined,
    resolution_time: undefined,
    resolution_notes: undefined,
  } satisfies IHealthcarePlatformEscalationEvent.ICreate;

  const createdEvent: IHealthcarePlatformEscalationEvent =
    await api.functional.healthcarePlatform.systemAdmin.escalationEvents.create(
      connection,
      {
        body: eventBody,
      },
    );
  typia.assert(createdEvent);

  // 3. Retrieve with valid ID, verify response matches creation except possibly created_at
  const foundEvent: IHealthcarePlatformEscalationEvent =
    await api.functional.healthcarePlatform.systemAdmin.escalationEvents.at(
      connection,
      {
        escalationEventId: createdEvent.id,
      },
    );
  typia.assert(foundEvent);

  TestValidator.equals(
    "escalation event details match",
    foundEvent,
    createdEvent,
    (k) => k === "created_at",
  );

  // 4. Retrieve with random non-existent escalationEventId, expect error
  await TestValidator.error(
    "retrieving non-existent escalation event fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.escalationEvents.at(
        connection,
        {
          escalationEventId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Retrieve with missing authentication: simulate unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated system admin cannot fetch escalation event",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.escalationEvents.at(
        unauthConn,
        {
          escalationEventId: createdEvent.id,
        },
      );
    },
  );
}

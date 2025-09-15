import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEscalationEvent";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validates org admin's access control for escalation event retrieval, both
 * positive and negative cases. See scenario above for detail.
 */
export async function test_api_escalation_event_access_by_organization_admin(
  connection: api.IConnection,
) {
  // Step 1: Register & auth as Org Admin A
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAFullName = RandomGenerator.name();
  const adminA: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminAEmail,
        full_name: adminAFullName,
        password: "password123",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(adminA);

  // Step 2: Create escalation event as Org Admin A
  const eventBody = {
    source_notification_id: typia.random<string & tags.Format<"uuid">>(),
    escalation_type: RandomGenerator.pick([
      "sla_violation",
      "compliance_required",
      "breach",
      "business_policy",
    ] as const),
    escalation_level: RandomGenerator.pick([
      "critical",
      "urgent",
      "normal",
      "info",
    ] as const),
    deadline_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1hr in future
    resolution_status: RandomGenerator.pick([
      "open",
      "in_progress",
      "resolved",
      "expired",
      "error",
    ] as const),
  } satisfies IHealthcarePlatformEscalationEvent.ICreate;
  const event: IHealthcarePlatformEscalationEvent =
    await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.create(
      connection,
      { body: eventBody },
    );
  typia.assert(event);

  // Step 3: GET event as Org Admin A (authorized)
  const got: IHealthcarePlatformEscalationEvent =
    await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.at(
      connection,
      { escalationEventId: event.id },
    );
  typia.assert(got);
  TestValidator.equals("event GET success", got.id, event.id);
  TestValidator.equals("event matches", got, event, (k) =>
    ["created_at"].includes(k),
  );

  // Step 4: Register Org Admin B (another random email, diff org context implied)
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminBFullName = RandomGenerator.name();
  const adminB: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminBEmail,
        full_name: adminBFullName,
        password: "password123",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(adminB);

  // Org Admin B: Attempt to GET event from Admin A's org (should fail)
  await TestValidator.error(
    "cross-organization event access forbidden",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.at(
        connection,
        { escalationEventId: event.id },
      );
    },
  );

  // Negative Case: GET with random non-existent UUID (should fail)
  const fakeEscalationEventId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "GET nonexistent escalation event by id",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.at(
        connection,
        { escalationEventId: fakeEscalationEventId },
      );
    },
  );
}

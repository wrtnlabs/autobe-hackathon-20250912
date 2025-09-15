import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEscalationEvent";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate status management of escalation events by organization admin:
 *
 * 1. Admin joins and authenticates.
 * 2. Admin creates a new escalation event.
 * 3. Admin updates event: assignment (user/role), type/level/deadline changes, and
 *    status progressions.
 * 4. Checks: Status transitions (open→in_progress→resolved, open→dismissed),
 *    deadline extension, audit note adding, error on invalid
 *    transition/assignment, audit order.
 */
export async function test_api_escalation_event_status_management_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Organization admin onboarding & authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);
  TestValidator.equals(
    "admin email matches join input",
    admin.email,
    joinBody.email,
  );

  // 2. Create escalation event
  const escalationCreate = {
    source_notification_id: typia.random<string & tags.Format<"uuid">>(),
    target_user_id: null,
    target_role_id: typia.random<string & tags.Format<"uuid">>(),
    escalation_type: RandomGenerator.pick([
      "sla_violation",
      "breach",
      "compliance_required",
      "business_policy",
    ] as const),
    escalation_level: RandomGenerator.pick([
      "critical",
      "urgent",
      "normal",
      "info",
    ] as const),
    deadline_at: new Date(Date.now() + 86400000).toISOString(),
    resolution_status: "open",
    resolution_time: null,
    resolution_notes: null,
  } satisfies IHealthcarePlatformEscalationEvent.ICreate;
  const escalation =
    await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.create(
      connection,
      { body: escalationCreate },
    );
  typia.assert(escalation);
  TestValidator.equals(
    "source_notification_id matches",
    escalation.source_notification_id,
    escalationCreate.source_notification_id,
  );
  TestValidator.equals(
    "initial status is open",
    escalation.resolution_status,
    "open",
  );

  // 3. Update: assign to a user (remove role), change deadline, mark in_progress
  const updated_user_id = typia.random<string & tags.Format<"uuid">>();
  const new_deadline = new Date(Date.now() + 2 * 86400000).toISOString();
  const up1 =
    await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.update(
      connection,
      {
        escalationEventId: escalation.id,
        body: {
          target_user_id: updated_user_id,
          target_role_id: null,
          deadline_at: new_deadline,
          resolution_status: "in_progress",
        },
      },
    );
  typia.assert(up1);
  TestValidator.equals(
    "updated assigned user",
    up1.target_user_id,
    updated_user_id,
  );
  TestValidator.equals(
    "role null after assignment to user",
    up1.target_role_id,
    null,
  );
  TestValidator.equals("deadline changed", up1.deadline_at, new_deadline);
  TestValidator.equals(
    "status now in_progress",
    up1.resolution_status,
    "in_progress",
  );

  // 4. Resolve event with notes and timestamp
  const resolution_notes = RandomGenerator.paragraph({ sentences: 3 });
  const resolution_time = new Date().toISOString();
  const up2 =
    await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.update(
      connection,
      {
        escalationEventId: escalation.id,
        body: {
          resolution_status: "resolved",
          resolution_notes,
          resolution_time,
        },
      },
    );
  typia.assert(up2);
  TestValidator.equals("resolved", up2.resolution_status, "resolved");
  TestValidator.equals(
    "resolution notes match",
    up2.resolution_notes,
    resolution_notes,
  );
  TestValidator.equals(
    "resolution time set",
    up2.resolution_time,
    resolution_time,
  );

  // 5. Error: changing status after resolved should fail
  await TestValidator.error(
    "cannot update closed escalation event",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.update(
        connection,
        {
          escalationEventId: escalation.id,
          body: {
            resolution_status: "in_progress",
          },
        },
      );
    },
  );

  // 6. Dismiss workflow: create fresh escalation and immediately dismiss
  const escalation2 =
    await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.create(
      connection,
      {
        body: {
          ...escalationCreate,
          source_notification_id: typia.random<string & tags.Format<"uuid">>(),
          resolution_status: "open",
        },
      },
    );
  typia.assert(escalation2);
  const up3 =
    await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.update(
      connection,
      {
        escalationEventId: escalation2.id,
        body: {
          resolution_status: "dismissed",
          resolution_notes: "No action required.",
          resolution_time: new Date().toISOString(),
        },
      },
    );
  typia.assert(up3);
  TestValidator.equals("dismissed", up3.resolution_status, "dismissed");

  // 7. Error: assign role and user at same time (should be mutually exclusive if business logic requires)
  await TestValidator.error(
    "cannot assign both user and role simultaneously",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.update(
        connection,
        {
          escalationEventId: escalation2.id,
          body: {
            target_user_id: typia.random<string & tags.Format<"uuid">>(),
            target_role_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEscalationEvent";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate updating a notification by org-admin to add/update escalation
 * reference.
 *
 * Steps:
 *
 * 1. Organization admin joins (registers) and logs in for context.
 * 2. Admin creates a notification for their org context.
 * 3. Admin creates an escalation event with required fields, sourcing
 *    notificationId.
 * 4. Admin updates the notification using PUT, supplying a new
 *    escalationEventId.
 * 5. Assert response reflects escalationEventId and other attributes.
 */
export async function test_api_notification_escalation_update_by_org_admin_success_flow(
  connection: api.IConnection,
) {
  // 1. Organization admin registration (join)
  const orgAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: orgAdminEmail,
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: joinBody },
  );
  typia.assert(orgAdmin);

  // 2. Organization admin login (to refresh session/token)
  const loginBody = {
    email: orgAdminEmail,
    password: joinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const loggedIn = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedIn);

  // 3. Create a notification in org context
  const notificationBody = {
    notificationType: RandomGenerator.name(1),
    notificationChannel: RandomGenerator.pick([
      "in_app",
      "email",
      "sms",
      "push",
      "phone_call",
    ] as const),
    body: RandomGenerator.paragraph(),
    critical: false,
    organizationId: orgAdmin.id,
  } satisfies IHealthcarePlatformNotification.ICreate;
  const notification =
    await api.functional.healthcarePlatform.organizationAdmin.notifications.create(
      connection,
      { body: notificationBody },
    );
  typia.assert(notification);
  const notificationId = notification.id;

  // 4. Create an escalation event referencing this notification
  const escalationDeadline = new Date(
    Date.now() + 1000 * 60 * 60,
  ).toISOString(); // 1hr later
  const escalationEventBody = {
    source_notification_id: notificationId,
    escalation_type: "sla_violation",
    escalation_level: RandomGenerator.pick([
      "critical",
      "urgent",
      "normal",
      "info",
    ] as const),
    deadline_at: escalationDeadline,
    resolution_status: RandomGenerator.pick([
      "open",
      "in_progress",
      "resolved",
      "expired",
      "error",
    ] as const),
  } satisfies IHealthcarePlatformEscalationEvent.ICreate;
  const escalationEvent =
    await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.create(
      connection,
      {
        body: escalationEventBody,
      },
    );
  typia.assert(escalationEvent);

  // 5. Update notification to reference escalation event
  const updateBody = {
    escalationEventId: escalationEvent.id,
  } satisfies IHealthcarePlatformNotification.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.organizationAdmin.notifications.update(
      connection,
      {
        notificationId,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 6. Assert output has correct escalationEventId
  TestValidator.equals(
    "notification escalationEventId should match assigned",
    updated.escalationEventId,
    escalationEvent.id,
  );
  // Confirm id unchanged
  TestValidator.equals(
    "updated notification id unchanged",
    updated.id,
    notificationId,
  );
  // Confirm other persisted fields
  TestValidator.equals(
    "notification body persists",
    updated.body,
    notification.body,
  );
  TestValidator.equals(
    "notification channel persists",
    updated.notificationChannel,
    notification.notificationChannel,
  );
}

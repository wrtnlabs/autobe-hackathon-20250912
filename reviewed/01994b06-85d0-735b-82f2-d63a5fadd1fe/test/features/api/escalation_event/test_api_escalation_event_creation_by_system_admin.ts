import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEscalationEvent";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";

/**
 * Validates that a system administrator can create a new escalation event,
 * ensuring all business rules and dependencies.
 *
 * 1. Register and authenticate as a system administrator using
 *    /auth/systemAdmin/join.
 * 2. Provision a user-organization assignment with a valid user and org.
 * 3. Create a notification record to use as the source for escalation.
 * 4. Create an escalation event as system admin, linking the notification and
 *    user assignment.
 * 5. Validate the returned escalation event (id, linkage, content, audit
 *    fields).
 * 6. Attempt creation with missing required fields and expect business logic
 *    errors (not type errors).
 * 7. Attempt creation referencing a nonexistent source_notification_id and
 *    expect a business logic error (not type error).
 * 8. Attempt creation referencing a nonexistent target_user_id and expect a
 *    business logic error (not type error).
 */
export async function test_api_escalation_event_creation_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin and authenticate session
  const sysadminEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: sysadminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: sysadminEmail,
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysadminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(sysadminAuth);

  // 2. Create user-organization assignment to get a target user ID
  const userId = typia.random<string & tags.Format<"uuid">>();
  const orgId = typia.random<string & tags.Format<"uuid">>();
  const assignmentBody = {
    user_id: userId,
    healthcare_platform_organization_id: orgId,
    role_code: "orgAdmin",
    assignment_status: "active",
  } satisfies IHealthcarePlatformUserOrgAssignment.ICreate;
  const userOrgAssignment =
    await api.functional.healthcarePlatform.systemAdmin.userOrgAssignments.create(
      connection,
      { body: assignmentBody },
    );
  typia.assert(userOrgAssignment);

  // 3. Create notification record
  const notificationBody = {
    recipientUserId: userOrgAssignment.user_id,
    organizationId: userOrgAssignment.healthcare_platform_organization_id,
    notificationType: "compliance_alert",
    notificationChannel: "in_app",
    subject: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    critical: true,
  } satisfies IHealthcarePlatformNotification.ICreate;
  const notification =
    await api.functional.healthcarePlatform.systemAdmin.notifications.create(
      connection,
      { body: notificationBody },
    );
  typia.assert(notification);

  // 4. Create escalation event
  const deadlineAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const escalationBody = {
    source_notification_id: notification.id,
    target_user_id: userOrgAssignment.user_id,
    escalation_type: "compliance_required",
    escalation_level: "critical",
    deadline_at: deadlineAt,
    resolution_status: "open",
  } satisfies IHealthcarePlatformEscalationEvent.ICreate;
  const escalation =
    await api.functional.healthcarePlatform.systemAdmin.escalationEvents.create(
      connection,
      { body: escalationBody },
    );
  typia.assert(escalation);
  TestValidator.equals(
    "escalation event links user assignment",
    escalation.target_user_id,
    userOrgAssignment.user_id,
  );
  TestValidator.equals(
    "escalation event links notification",
    escalation.source_notification_id,
    notification.id,
  );
  TestValidator.equals(
    "escalation event has expected type and level",
    escalation.escalation_type,
    escalationBody.escalation_type,
  );
  TestValidator.equals(
    "escalation event deadline",
    escalation.deadline_at,
    deadlineAt,
  );
  TestValidator.equals(
    "escalation event open",
    escalation.resolution_status,
    "open",
  );

  // 5. Error case: Missing required field (escalation_type)
  const missingTypeBody = {
    ...escalationBody,
  };
  // Remove escalation_type
  delete (missingTypeBody as any).escalation_type;
  await TestValidator.error(
    "escalation event creation fails with missing required field",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.escalationEvents.create(
        connection,
        { body: missingTypeBody as IHealthcarePlatformEscalationEvent.ICreate },
      );
    },
  );

  // 6. Error case: Nonexistent source_notification_id
  const invalidNotificationBody = {
    ...escalationBody,
    source_notification_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IHealthcarePlatformEscalationEvent.ICreate;
  await TestValidator.error(
    "escalation event creation fails with nonexistent source_notification_id",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.escalationEvents.create(
        connection,
        { body: invalidNotificationBody },
      );
    },
  );

  // 7. Error case: Nonexistent target_user_id
  const invalidTargetBody = {
    ...escalationBody,
    target_user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IHealthcarePlatformEscalationEvent.ICreate;
  await TestValidator.error(
    "escalation event creation fails with nonexistent target_user_id",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.escalationEvents.create(
        connection,
        { body: invalidTargetBody },
      );
    },
  );
}

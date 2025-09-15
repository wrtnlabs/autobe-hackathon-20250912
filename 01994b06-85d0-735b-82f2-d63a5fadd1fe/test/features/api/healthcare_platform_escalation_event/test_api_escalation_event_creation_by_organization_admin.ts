import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEscalationEvent";
import type { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";

/**
 * Validate escalation event creation for organization admin.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate as organization admin.
 * 2. Create a valid notification within the organization.
 * 3. Assign a user to the same organization and get assignment/user id.
 * 4. Create an escalation event referencing this notification and user assignment.
 * 5. Validate returned record linkage and identity.
 * 6. Attempt escalation event creation with invalid notification id (negative
 *    check).
 * 7. Attempt escalation event creation referencing user/org cross-organization
 *    (negative check).
 */
export async function test_api_escalation_event_creation_by_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "superSecret123!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);
  // Organization id for subsequent objects
  const organizationId = typia.random<string & tags.Format<"uuid">>();

  // 2. Create notification in the org
  const notification =
    await api.functional.healthcarePlatform.organizationAdmin.notifications.create(
      connection,
      {
        body: {
          organizationId: organizationId,
          notificationType: "sla_violation",
          notificationChannel: "in_app",
          subject: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          critical: true,
        } satisfies IHealthcarePlatformNotification.ICreate,
      },
    );
  typia.assert(notification);

  // 3. Assign a user to the same organization
  const userId = typia.random<string & tags.Format<"uuid">>();
  const userAssignment =
    await api.functional.healthcarePlatform.organizationAdmin.userOrgAssignments.create(
      connection,
      {
        body: {
          user_id: userId,
          healthcare_platform_organization_id: organizationId,
          role_code: "incident_manager",
          assignment_status: "active",
        } satisfies IHealthcarePlatformUserOrgAssignment.ICreate,
      },
    );
  typia.assert(userAssignment);

  // 4. Create escalation event referencing notification and user
  const deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // +2 days
  const escalationEvent =
    await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.create(
      connection,
      {
        body: {
          source_notification_id: notification.id,
          target_user_id: userAssignment.user_id,
          escalation_type: "sla_violation",
          escalation_level: "critical",
          deadline_at: deadline,
          resolution_status: "open",
        } satisfies IHealthcarePlatformEscalationEvent.ICreate,
      },
    );
  typia.assert(escalationEvent);
  TestValidator.equals(
    "Escalation event links correct notification",
    escalationEvent.source_notification_id,
    notification.id,
  );
  TestValidator.equals(
    "Escalation event assigned user",
    escalationEvent.target_user_id,
    userAssignment.user_id,
  );
  TestValidator.equals(
    "Escalation event organization alignment",
    escalationEvent.target_role_id,
    undefined,
  );

  // Negative: wrong notification id
  const invalidNotificationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should reject with non-existent notification id",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.create(
        connection,
        {
          body: {
            source_notification_id: invalidNotificationId,
            target_user_id: userAssignment.user_id,
            escalation_type: "sla_violation",
            escalation_level: "critical",
            deadline_at: deadline,
            resolution_status: "open",
          } satisfies IHealthcarePlatformEscalationEvent.ICreate,
        },
      );
    },
  );

  // Negative: cross-org references
  // Create a second organization admin in another org
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const adminJoin2 = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: admin2Email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "superSecret456!",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin2);
  const anotherOrgId = typia.random<string & tags.Format<"uuid">>();
  // Notification in other org
  const notificationOtherOrg =
    await api.functional.healthcarePlatform.organizationAdmin.notifications.create(
      connection,
      {
        body: {
          organizationId: anotherOrgId,
          notificationType: "compliance_alert",
          notificationChannel: "email",
          subject: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          critical: false,
        } satisfies IHealthcarePlatformNotification.ICreate,
      },
    );
  typia.assert(notificationOtherOrg);
  // Should fail: referencing notification from other org
  await TestValidator.error(
    "should reject cross-org escalation event",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.escalationEvents.create(
        connection,
        {
          body: {
            source_notification_id: notificationOtherOrg.id,
            target_user_id: userAssignment.user_id,
            escalation_type: "sla_violation",
            escalation_level: "critical",
            deadline_at: deadline,
            resolution_status: "open",
          } satisfies IHealthcarePlatformEscalationEvent.ICreate,
        },
      );
    },
  );
}

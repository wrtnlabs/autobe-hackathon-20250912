import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationTemplate";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that a system admin may soft-delete notification templates, with
 * permission checks, idempotency, and correct error handling.
 *
 * Steps:
 *
 * 1. Register a system admin via POST /auth/systemAdmin/join (obtain token).
 * 2. Create a notification template via POST
 *    /atsRecruitment/systemAdmin/notificationTemplates (obtain templateId).
 * 3. Delete template as admin via DELETE (soft-delete - sets deleted_at).
 * 4. Attempt to delete again: expect no error (idempotent).
 * 5. Attempt to delete non-existent templateId: expect error.
 * 6. Attempt to delete template as unauthenticated user: expect permission error.
 * 7. (Due to limited API contracts, verify by creating a new template with same
 *    code after deletion and checking no error, or by attempting fetch of
 *    deleted entity if supported in future.)
 */
export async function test_api_notification_template_delete_admin_permissions_and_idempotency(
  connection: api.IConnection,
) {
  // Step 1: Register as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const superAdmin = true;
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        super_admin: superAdmin,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);
  // Step 2: Create a notification template
  const templateCode = `TEST_CODE_${RandomGenerator.alphabets(5).toUpperCase()}`;
  const channel = RandomGenerator.pick([
    "email",
    "sms",
    "app_push",
    "webhook",
  ] as const);
  const templateBody = {
    template_code: templateCode,
    channel,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    subject:
      channel === "email"
        ? RandomGenerator.paragraph({ sentences: 1 })
        : undefined,
    body: RandomGenerator.content({ paragraphs: 1 }),
    is_active: true,
  } satisfies IAtsRecruitmentNotificationTemplate.ICreate;
  const template: IAtsRecruitmentNotificationTemplate =
    await api.functional.atsRecruitment.systemAdmin.notificationTemplates.create(
      connection,
      {
        body: templateBody,
      },
    );
  typia.assert(template);
  // Step 3: Delete the template (soft-delete)
  await api.functional.atsRecruitment.systemAdmin.notificationTemplates.erase(
    connection,
    {
      templateId: template.id,
    },
  );
  // Step 4: Attempt to delete again for idempotency (should not throw)
  await api.functional.atsRecruitment.systemAdmin.notificationTemplates.erase(
    connection,
    {
      templateId: template.id,
    },
  );
  // Step 5: Attempt to delete non-existent templateId (should throw error)
  await TestValidator.error(
    "delete non-existent template triggers error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.notificationTemplates.erase(
        connection,
        {
          templateId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Step 6: Register a different admin for 'unauthenticated' scenario
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated deletion is rejected",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.notificationTemplates.erase(
        unauthConn,
        {
          templateId: template.id,
        },
      );
    },
  );
}

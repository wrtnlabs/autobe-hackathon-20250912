import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationTemplate";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test retrieving notification template detail as system admin, including
 * active and inactive templates, different channels, and negative scenarios.
 *
 * This test validates the ability of a system administrator to retrieve
 * detailed information for specific notification templates through the detail
 * endpoint, ensuring that all fields are correctly returned regardless of
 * channel (email, sms, app_push) and active status. It verifies proper API
 * contract for subject/body fields, checks negative scenarios (non-existent,
 * unauthorized retrieval), and asserts access control; omits soft-deleted case
 * as delete API is unavailable.
 *
 * Steps:
 *
 * 1. Register a system administrator and authenticate.
 * 2. Create notification templates in all supported channels (email, sms,
 *    app_push) with both active/inactive status.
 * 3. Retrieve each template by id and validate all detail fields (template_code,
 *    channel, subject, body, title, is_active, created_at, updated_at,
 *    deleted_at).
 * 4. Negative: try retrieving a non-existent templateId (should fail).
 * 5. Negative: try accessing template detail with unauthorized/fresh connection
 *    (should fail).
 * 6. **NOTE:** Soft-delete/archived scenario is omitted as delete API is
 *    unavailable.
 */
export async function test_api_notification_template_detail_retrieval_systemadmin(
  connection: api.IConnection,
) {
  // 1. Register system administrator and get authorization
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminJoin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        super_admin: true,
      },
    });
  typia.assert(adminJoin);

  // 2. Create several notification templates with various channels/status/fields
  const testTemplates: IAtsRecruitmentNotificationTemplate[] = [];
  const testChannels = ["email", "sms", "app_push"] as const;
  for (const [idx, channel] of testChannels.entries()) {
    const input = {
      template_code: `CODE_${channel.toUpperCase()}_${RandomGenerator.alphaNumeric(8)}`,
      channel,
      title: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 8,
      }),
      subject:
        channel === "email"
          ? RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 16 })
          : undefined,
      body: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 10,
        sentenceMax: 20,
      }),
      is_active: idx % 2 === 0,
    } satisfies IAtsRecruitmentNotificationTemplate.ICreate;
    const created =
      await api.functional.atsRecruitment.systemAdmin.notificationTemplates.create(
        connection,
        { body: input },
      );
    typia.assert(created);
    testTemplates.push(created);
  }

  // 3. Retrieve each template and validate all detail fields
  for (const tpl of testTemplates) {
    const detail =
      await api.functional.atsRecruitment.systemAdmin.notificationTemplates.at(
        connection,
        { templateId: tpl.id },
      );
    typia.assert(detail);
    TestValidator.equals("template detail: id", detail.id, tpl.id);
    TestValidator.equals(
      "template detail: code",
      detail.template_code,
      tpl.template_code,
    );
    TestValidator.equals(
      "template detail: channel",
      detail.channel,
      tpl.channel,
    );
    TestValidator.equals("template detail: title", detail.title, tpl.title);
    TestValidator.equals("template detail: body", detail.body, tpl.body);
    TestValidator.equals(
      "template detail: is_active",
      detail.is_active,
      tpl.is_active,
    );
    TestValidator.equals(
      "template detail: created_at",
      detail.created_at,
      tpl.created_at,
    );
    TestValidator.equals(
      "template detail: updated_at",
      detail.updated_at,
      tpl.updated_at,
    );
    TestValidator.equals(
      "template detail: deleted_at",
      detail.deleted_at,
      tpl.deleted_at,
    );
    if (tpl.channel === "email")
      TestValidator.equals(
        "template detail: subject (email)",
        detail.subject,
        tpl.subject,
      );
    else
      TestValidator.equals(
        "template detail: subject (optional)",
        detail.subject,
        tpl.subject,
      );
  }

  // 4. Negative: Retrieve non-existent template (random UUID)
  await TestValidator.error("non-existent templateId should fail", async () => {
    await api.functional.atsRecruitment.systemAdmin.notificationTemplates.at(
      connection,
      {
        templateId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 5. Negative: Unauthorized token (simulate by using fresh non-admin connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized token should fail", async () => {
    await api.functional.atsRecruitment.systemAdmin.notificationTemplates.at(
      unauthConn,
      {
        templateId: testTemplates[0].id,
      },
    );
  });
}

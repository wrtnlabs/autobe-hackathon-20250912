import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationTemplate";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate notification template update by system admin with full scenario
 * coverage.
 *
 * Steps:
 *
 * 1. Register and authenticate a system admin
 * 2. Create an initial notification template
 * 3. Successfully update that template (change title, subject, body, is_active)
 * 4. Attempt an update that would violate unique (template_code, channel)
 * 5. Attempt an update omitting required field (body) and expect error
 */
export async function test_api_notification_template_update_admin_success_field_and_uniqueness(
  connection: api.IConnection,
) {
  // 1. Register/authenticate system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPassword123!@#",
        name: RandomGenerator.name(),
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create first notification template
  const create1 = {
    template_code: RandomGenerator.alphaNumeric(10),
    channel: RandomGenerator.pick([
      "email",
      "sms",
      "app_push",
      "webhook",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    subject: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    is_active: true,
  } satisfies IAtsRecruitmentNotificationTemplate.ICreate;
  const tpl1: IAtsRecruitmentNotificationTemplate =
    await api.functional.atsRecruitment.systemAdmin.notificationTemplates.create(
      connection,
      { body: create1 },
    );
  typia.assert(tpl1);

  // 3. Update the template (changing title, subject, body, is_active)
  const updateData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    subject: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: false,
  } satisfies IAtsRecruitmentNotificationTemplate.IUpdate;
  const updated: IAtsRecruitmentNotificationTemplate =
    await api.functional.atsRecruitment.systemAdmin.notificationTemplates.update(
      connection,
      {
        templateId: tpl1.id,
        body: updateData,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated title is persisted",
    updated.title,
    updateData.title,
  );
  TestValidator.equals(
    "updated subject is persisted",
    updated.subject,
    updateData.subject,
  );
  TestValidator.equals(
    "updated body is persisted",
    updated.body,
    updateData.body,
  );
  TestValidator.equals(
    "updated is_active is persisted",
    updated.is_active,
    updateData.is_active,
  );

  // 4. Create a second template with different code/channel
  const create2 = {
    template_code: RandomGenerator.alphaNumeric(10),
    channel: RandomGenerator.pick([
      "email",
      "sms",
      "app_push",
      "webhook",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    subject: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    is_active: true,
  } satisfies IAtsRecruitmentNotificationTemplate.ICreate;
  const tpl2: IAtsRecruitmentNotificationTemplate =
    await api.functional.atsRecruitment.systemAdmin.notificationTemplates.create(
      connection,
      { body: create2 },
    );
  typia.assert(tpl2);

  // 5. Attempt to update tpl1 to use tpl2's (template_code, channel) combination (should violate uniqueness)
  await TestValidator.error(
    "duplicate template_code/channel should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.notificationTemplates.update(
        connection,
        {
          templateId: tpl1.id,
          body: {
            template_code: tpl2.template_code,
            channel: tpl2.channel,
          } satisfies IAtsRecruitmentNotificationTemplate.IUpdate,
        },
      );
    },
  );

  // 6. Attempt to update tpl1 omitting required 'body' field (should fail)
  await TestValidator.error(
    "omitting required field 'body' should fail",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.notificationTemplates.update(
        connection,
        {
          templateId: tpl1.id,
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            is_active: true,
          } satisfies IAtsRecruitmentNotificationTemplate.IUpdate,
        },
      );
    },
  );
}

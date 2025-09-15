import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationTemplate";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate notification template creation by system admin.
 *
 * 1. System admin registration and authentication.
 *
 *    - Register with unique admin email and required fields.
 *    - Validate is_active and super_admin in response.
 * 2. Successful notification template creation as admin.
 *
 *    - Create template with unique template_code + valid channel (email, sms,
 *         app_push, webhook).
 *    - If channel=email, subject is provided (required).
 *    - Validate returned entity fields for correctness.
 * 3. Attempt to create duplicate template_code/channel.
 *
 *    - Creating with same template_code/channel triggers unique constraint
 *         error.
 * 4. Attempt creation with missing required fields (single field omitted for
 *    each test).
 *
 *    - Each required field (template_code, channel, title, body, is_active) is
 *         omitted one at a time and error is validated.
 *    - If channel is email, also test missing subject.
 */
export async function test_api_notification_template_creation_admin_success_and_duplicate_failure(
  connection: api.IConnection,
) {
  // 1. Register and authenticate system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: "TestAdmin123!",
    name: RandomGenerator.name(),
    super_admin: true,
  } satisfies IAtsRecruitmentSystemAdmin.ICreate;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);
  TestValidator.equals("admin is active", admin.is_active, true);
  TestValidator.equals("admin is super_admin", admin.super_admin, true);

  // 2. Successful notification template creation
  const channels = ["email", "sms", "app_push", "webhook"] as const;
  const templateChannel = RandomGenerator.pick(channels);
  const templateCode = RandomGenerator.alphaNumeric(12).toUpperCase();
  const templateTitle = RandomGenerator.paragraph({ sentences: 2 });
  const templateBodyContent = RandomGenerator.content({ paragraphs: 2 });
  const templateSubject =
    templateChannel === "email"
      ? RandomGenerator.paragraph({ sentences: 1 })
      : undefined;
  const createBody = {
    template_code: templateCode,
    channel: templateChannel,
    title: templateTitle,
    subject: templateSubject,
    body: templateBodyContent,
    is_active: true,
  } satisfies IAtsRecruitmentNotificationTemplate.ICreate;

  const created =
    await api.functional.atsRecruitment.systemAdmin.notificationTemplates.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);
  TestValidator.equals(
    "created template_code matches",
    created.template_code,
    createBody.template_code,
  );
  TestValidator.equals(
    "created channel matches",
    created.channel,
    createBody.channel,
  );
  TestValidator.equals(
    "created title matches",
    created.title,
    createBody.title,
  );
  TestValidator.equals("created body matches", created.body, createBody.body);
  TestValidator.equals(
    "created is_active true",
    created.is_active,
    createBody.is_active,
  );
  if (createBody.subject !== undefined)
    TestValidator.equals(
      "created subject matches",
      created.subject,
      createBody.subject,
    );

  // 3. Duplicate code/channel should fail
  await TestValidator.error(
    "duplicate template_code/channel triggers error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.notificationTemplates.create(
        connection,
        {
          body: createBody,
        },
      );
    },
  );

  // 4. Missing required fields (template_code, channel, title, body, is_active)
  const base = {
    template_code: templateCode + "MISS", // make a new code for required field tests
    channel: templateChannel,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    subject:
      templateChannel === "email"
        ? RandomGenerator.paragraph({ sentences: 1 })
        : undefined,
    body: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
  } as const;

  const requiredFields = [
    "template_code",
    "channel",
    "title",
    "body",
    "is_active",
  ] as const;
  for (const field of requiredFields) {
    // create a new object omitting just the missing field
    const { template_code, channel, title, body, is_active, subject } = base;
    // skip subject, which is not always required
    const badBody: Partial<IAtsRecruitmentNotificationTemplate.ICreate> = {};
    if (field !== "template_code") badBody.template_code = template_code;
    if (field !== "channel") badBody.channel = channel;
    if (field !== "title") badBody.title = title;
    if (field !== "body") badBody.body = body;
    if (field !== "is_active") badBody.is_active = is_active;
    if (typeof subject !== "undefined") badBody.subject = subject;
    await TestValidator.error(
      `missing required field '${field}' triggers error`,
      async () => {
        await api.functional.atsRecruitment.systemAdmin.notificationTemplates.create(
          connection,
          {
            body: badBody as IAtsRecruitmentNotificationTemplate.ICreate,
          },
        );
      },
    );
  }

  // 4b. If channel is email, subject is required, so test missing subject
  if (templateChannel === "email") {
    const { template_code, channel, title, body, is_active } = base;
    const badBodyEmail = {
      template_code,
      channel,
      title,
      // subject omitted
      body,
      is_active,
    } satisfies IAtsRecruitmentNotificationTemplate.ICreate;
    await TestValidator.error(
      "missing required field 'subject' for email triggers error",
      async () => {
        await api.functional.atsRecruitment.systemAdmin.notificationTemplates.create(
          connection,
          {
            body: badBodyEmail,
          },
        );
      },
    );
  }
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationTemplate";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E validation for notification template creation:
 *
 * 1. HR recruiter registration & authentication
 * 2. Happy-path creation of a unique template
 * 3. Duplicate (template_code+channel) constraint failure
 * 4. Authorization enforcement on template creation
 *
 * Steps:
 *
 * 1. Register & login as HR recruiter
 * 2. Create a notification template with unique code/channel
 * 3. Attempt to create another with the same combination, expect error
 * 4. Attempt to create a template when unauthenticated, expect error
 *
 * Only valid runtime business logic errors are tested; type errors, wrong-type
 * requests, and missing required field tests are omitted, per best practices.
 */
export async function test_api_notification_template_creation_hr_recruiter_authorization_and_field_validation(
  connection: api.IConnection,
) {
  // 1. Register & authenticate as HR recruiter
  const hrRecruiterEmail = typia.random<string & tags.Format<"email">>();
  const hrRecruiterJoin = await api.functional.auth.hrRecruiter.join(
    connection,
    {
      body: {
        email: hrRecruiterEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    },
  );
  typia.assert(hrRecruiterJoin);
  TestValidator.equals(
    "hr recruiter email matches join",
    hrRecruiterJoin.email,
    hrRecruiterEmail,
  );
  TestValidator.predicate(
    "hr recruiter is active after join",
    hrRecruiterJoin.is_active === true,
  );

  // 2. Create a notification template with unique code & valid channel
  const uniqueTemplateCode = `INTERVIEW_${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const validChannels = ["email", "sms", "app_push", "webhook"] as const;
  const validChannel = RandomGenerator.pick(validChannels);
  const notificationBody = {
    template_code: uniqueTemplateCode,
    channel: validChannel,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    subject:
      validChannel === "email"
        ? RandomGenerator.paragraph({ sentences: 2 })
        : undefined,
    body: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
  } satisfies IAtsRecruitmentNotificationTemplate.ICreate;
  const createdTemplate =
    await api.functional.atsRecruitment.hrRecruiter.notificationTemplates.create(
      connection,
      {
        body: notificationBody,
      },
    );
  typia.assert(createdTemplate);
  TestValidator.equals(
    "template_code matches created",
    createdTemplate.template_code,
    notificationBody.template_code,
  );
  TestValidator.equals(
    "channel matches created",
    createdTemplate.channel,
    notificationBody.channel,
  );
  TestValidator.equals(
    "is_active matches created",
    createdTemplate.is_active,
    true,
  );
  TestValidator.equals(
    "title matches created",
    createdTemplate.title,
    notificationBody.title,
  );
  if (notificationBody.subject) {
    TestValidator.equals(
      "subject matches created",
      createdTemplate.subject,
      notificationBody.subject,
    );
  }
  TestValidator.equals(
    "body matches created",
    createdTemplate.body,
    notificationBody.body,
  );

  // 3. Duplicate (template_code+channel) business error
  await TestValidator.error(
    "duplicate template_code/channel should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.notificationTemplates.create(
        connection,
        {
          body: { ...notificationBody },
        },
      );
    },
  );

  // 4. Authorization error: cannot create without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated creation must be rejected",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.notificationTemplates.create(
        unauthConn,
        {
          body: {
            ...notificationBody,
            template_code: `UNAUTH_${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
          },
        },
      );
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentNotificationTemplate";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates an HR recruiter can retrieve details for their own notification
 * template, and cannot access those of others.
 *
 * - Registers an HR recruiter and obtains authentication.
 * - Creates a notification template under the recruiter's authority for a
 *   random channel (email, sms, app_push, webhook).
 * - Fetches the created template using the detail endpoint, confirming all
 *   fields: template_code, body, subject (if present), title, channel,
 *   is_active, created_at, updated_at. Ensures type safety using
 *   typia.assert and content equality via TestValidator.equals.
 * - Verifies that sensitive/internal fields (none expected in recruiter DTO,
 *   but code asserts absence by schema compliance).
 * - Attempts to fetch a random (likely non-existent) UUID, expecting error.
 * - Registers a second recruiter and attempts to fetch the first recruiter's
 *   template as this new user, ensuring error.
 */
export async function test_api_notification_template_detail_retrieval_hrrecruiter(
  connection: api.IConnection,
) {
  // 1. Register recruiter and login
  const recruiter1Email = typia.random<string & tags.Format<"email">>();
  const recruiter1 = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiter1Email,
      password: "Recruiter123!",
      name: RandomGenerator.name(),
      department: "Talent Acquisition",
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiter1);

  // 2. Create a template as recruiter 1
  const channels = ["email", "sms", "app_push", "webhook"] as const;
  const channel = RandomGenerator.pick(channels);
  const templateCreate = {
    template_code: RandomGenerator.alphaNumeric(10),
    channel: channel,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    subject:
      channel === "email"
        ? RandomGenerator.paragraph({ sentences: 2 })
        : undefined,
    body: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
  } satisfies IAtsRecruitmentNotificationTemplate.ICreate;
  const createdTemplate =
    await api.functional.atsRecruitment.hrRecruiter.notificationTemplates.create(
      connection,
      {
        body: templateCreate,
      },
    );
  typia.assert(createdTemplate);
  TestValidator.equals(
    "created template fields equality",
    createdTemplate.template_code,
    templateCreate.template_code,
  );
  TestValidator.equals(
    "created template channel",
    createdTemplate.channel,
    templateCreate.channel,
  );
  TestValidator.equals(
    "created template title",
    createdTemplate.title,
    templateCreate.title,
  );
  TestValidator.equals(
    "created template body",
    createdTemplate.body,
    templateCreate.body,
  );
  TestValidator.equals(
    "created template is_active",
    createdTemplate.is_active,
    templateCreate.is_active,
  );
  TestValidator.equals(
    "created template subject",
    createdTemplate.subject,
    templateCreate.subject,
  );

  // 3. Fetch own template detail
  const fetched =
    await api.functional.atsRecruitment.hrRecruiter.notificationTemplates.at(
      connection,
      {
        templateId: createdTemplate.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "fetched template matches created",
    fetched,
    createdTemplate,
  );

  // 4. Negative test: fetch random UUID (non-existent template)
  await TestValidator.error(
    "error on fetching non-existent template id",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.notificationTemplates.at(
        connection,
        {
          templateId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Register another recruiter and try to access first's template
  const recruiter2 = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Recruiter456!",
      name: RandomGenerator.name(),
      department: "People Ops",
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiter2);
  await TestValidator.error(
    "cannot fetch other recruiter's template",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.notificationTemplates.at(
        connection,
        {
          templateId: createdTemplate.id,
        },
      );
    },
  );
}

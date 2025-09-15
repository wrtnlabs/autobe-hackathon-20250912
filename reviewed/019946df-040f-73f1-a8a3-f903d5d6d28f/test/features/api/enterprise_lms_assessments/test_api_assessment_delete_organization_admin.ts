import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

export async function test_api_assessment_delete_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register a new organizationAdmin user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `user_${RandomGenerator.alphaNumeric(5)}@example.com`;
  const password = "SafePass123!";

  const createBody = {
    tenant_id: tenantId,
    email: email,
    password: password,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const authorizedUser = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: createBody },
  );
  typia.assert(authorizedUser);

  // 2. Login as the created organizationAdmin
  const loginBody = {
    email: email,
    password: password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loggedInUser = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedInUser);

  // 3. Create a new assessment to be deleted
  const createAssessmentBody = {
    tenant_id: tenantId,
    code: `code_${RandomGenerator.alphaNumeric(5)}`,
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    assessment_type: RandomGenerator.pick([
      "quiz",
      "survey",
      "peer_review",
      "practical_assignment",
    ] as const),
    max_score: 100,
    passing_score: 60,
    scheduled_start_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    scheduled_end_at: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    status: "planned",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const createdAssessment =
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      connection,
      { body: createAssessmentBody },
    );
  typia.assert(createdAssessment);

  // 4. Delete the created assessment
  await api.functional.enterpriseLms.organizationAdmin.assessments.erase(
    connection,
    { assessmentId: createdAssessment.id },
  );

  // 5. Confirm deletion by trying to delete again and expect error
  await TestValidator.error(
    "Deleting a non-existent assessment should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.assessments.erase(
        connection,
        { assessmentId: createdAssessment.id },
      );
    },
  );
}

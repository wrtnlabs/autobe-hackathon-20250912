import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessment";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * This end-to-end test covers the complete assessment update workflow for a
 * system administrator in Enterprise LMS.
 *
 * It performs these steps:
 *
 * 1. Registers a new system administrator user with realistic details.
 * 2. Logs in to obtain proper authentication tokens.
 * 3. Creates a new tenant organization for multi-tenant isolation.
 * 4. Creates an initial assessment record under the tenant with required fields.
 * 5. Updates the assessment with new data including code, title, description,
 *    scheduling, type, and status.
 * 6. Confirms success by successful completion of update call with no errors.
 *
 * Throughout the test, type safety is enforced with typia.assert(), all
 * required properties are included, and business constraints like status
 * transitions and date formats are respected.
 *
 * This test ensures that the system admin can fully manage assessments within a
 * tenant context.
 */
export async function test_api_assessment_update_complete_flow(
  connection: api.IConnection,
) {
  // 1. Register system admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(64); // random 64-char string
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPasswordHash,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const adminAuthorized = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: adminCreateBody,
    },
  );
  typia.assert(adminAuthorized);

  // 2. Login as system admin user
  const adminLoginBody = {
    email: adminEmail,
    password_hash: adminPasswordHash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const adminLoggedIn = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert(adminLoggedIn);

  // 3. Create tenant organization
  const tenantCreateBody = {
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: `${RandomGenerator.name(2)} Corporation`,
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant = await api.functional.enterpriseLms.systemAdmin.tenants.create(
    connection,
    {
      body: tenantCreateBody,
    },
  );
  typia.assert(tenant);

  // 4. Create initial assessment record
  const createAssessmentBody = {
    tenant_id: tenant.id,
    code: RandomGenerator.alphaNumeric(8),
    title: `Assessment ${RandomGenerator.alphaNumeric(4)}`,
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 70,
    status: "planned",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const assessment =
    await api.functional.enterpriseLms.systemAdmin.assessments.create(
      connection,
      {
        body: createAssessmentBody,
      },
    );
  typia.assert(assessment);

  // 5. Update the assessment record
  const updateAssessmentBody = {
    code: createAssessmentBody.code + "_v2",
    title: createAssessmentBody.title + " Updated",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    assessment_type: "survey",
    max_score: 150,
    passing_score: 100,
    scheduled_start_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    scheduled_end_at: new Date(Date.now() + 7200 * 1000).toISOString(),
    status: "active",
  } satisfies IEnterpriseLmsAssessment.IUpdate;

  await api.functional.enterpriseLms.systemAdmin.assessments.update(
    connection,
    {
      assessmentId: assessment.id,
      body: updateAssessmentBody,
    },
  );

  // No returned data from update; success confirmed by no errors
}

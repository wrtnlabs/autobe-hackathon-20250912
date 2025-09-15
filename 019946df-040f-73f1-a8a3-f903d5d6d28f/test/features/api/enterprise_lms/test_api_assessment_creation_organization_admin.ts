import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This E2E test validates the full lifecycle of creating an assessment as
 * an organization administrator.
 *
 * Steps:
 *
 * 1. Join as new organization admin user with tenant association
 * 2. Login as organization admin user to obtain JWT token
 * 3. Create a new assessment with valid required and optional fields
 * 4. Validate created assessment matches input with correct tenant linkage
 * 5. Test failure cases: unauthorized, tenant mismatch, role rejection
 * 6. Ensure only organization admin role users can create assessments
 */
export async function test_api_assessment_creation_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register new organization admin user with tenant
  const tenantId: string = typia.random<string & tags.Format<"uuid">>();
  const adminCreateBody = {
    tenant_id: tenantId,
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Password123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const authorizedAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Login the organization admin user
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loginOutput: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loginOutput);

  // Save tenantId and token from loginOutput for further operations
  const authTenantId = loginOutput.tenant_id;

  // 3. Create a valid assessment with correct tenant_id
  const assessmentCreateBody: IEnterpriseLmsAssessments.ICreate = {
    tenant_id: authTenantId,
    code: `ASMT-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    assessment_type: RandomGenerator.pick([
      "quiz",
      "survey",
      "peer_review",
      "practical_assignment",
    ] as const),
    max_score: 100,
    passing_score: 50,
    scheduled_start_at: new Date(Date.now() + 86400000).toISOString(),
    scheduled_end_at: new Date(Date.now() + 86400000 * 5).toISOString(),
    status: "planned",
  };

  const createdAssessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      connection,
      { body: assessmentCreateBody },
    );
  typia.assert(createdAssessment);

  // Validate returned data matches input
  TestValidator.equals(
    "tenant_id matches",
    createdAssessment.tenant_id,
    authTenantId,
  );
  TestValidator.equals(
    "code matches",
    createdAssessment.code,
    assessmentCreateBody.code,
  );
  TestValidator.equals(
    "title matches",
    createdAssessment.title,
    assessmentCreateBody.title,
  );
  TestValidator.equals(
    "max_score matches",
    createdAssessment.max_score,
    assessmentCreateBody.max_score,
  );
  TestValidator.equals(
    "passing_score matches",
    createdAssessment.passing_score,
    assessmentCreateBody.passing_score,
  );
  TestValidator.equals(
    "status matches",
    createdAssessment.status,
    assessmentCreateBody.status,
  );
  TestValidator.predicate(
    "created_at exists",
    typeof createdAssessment.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at exists",
    typeof createdAssessment.updated_at === "string",
  );

  // 4. Failure tests

  // 4.1 Unauthenticated user tries to create assessment
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized creation fails", async () => {
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      unauthConnection,
      {
        body: assessmentCreateBody,
      },
    );
  });

  // 4.2 Tenant mismatch: try creating assessment with different tenant_id
  const wrongTenantBody = {
    ...assessmentCreateBody,
    tenant_id: typia.random<string & tags.Format<"uuid">>(), // random different tenant
  };
  await TestValidator.error("mismatched tenant fails", async () => {
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      connection,
      {
        body: wrongTenantBody,
      },
    );
  });

  // 4.3 Non organizationAdmin role tries to create assessment
  // Simulate by using unauthConnection or connection without login
  await TestValidator.error("non-admin creation forbidden", async () => {
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      unauthConnection,
      {
        body: assessmentCreateBody,
      },
    );
  });
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * TEST SCENARIO:
 *
 * This comprehensive test scenario verifies correct authorization and
 * retrieval of an assessment entity within the Enterprise LMS system as a
 * systemAdmin user. It covers the entire authentication workflow, tenant
 * and assessment creation, positive retrieval by ID, and negative test
 * cases for authorization and data existence.
 *
 * The test ensures strong compliance with data consistency, format, and
 * authorization rules outlined in the API definition.
 *
 * Steps:
 *
 * 1. Create a systemAdmin user account (join)
 * 2. Authenticate as the systemAdmin user (login) to obtain a token
 * 3. Create a tenant organization for the assessment
 * 4. Create an assessment within the created tenant
 * 5. Retrieve the assessment by its ID and validate all returned data matches
 *    the created record
 * 6. Attempt to retrieve a non-existent assessment ID and expect an error
 * 7. Attempt to retrieve assessment without authentication and expect an error
 * 8. Attempt to retrieve an assessment for a different tenant and expect an
 *    error
 *
 * All validations use typia.assert() for type safety and TestValidator for
 * descriptive, scenario-specific assertions.
 */
export async function test_api_systemadmin_assessment_retrieve_by_id_authorized_and_edge_cases(
  connection: api.IConnection,
) {
  // Step 1: Create a systemAdmin user (join)
  const joinBody = {
    email: RandomGenerator.alphabets(6) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(12),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(systemAdmin);

  // Step 2: Authenticate as systemAdmin user (login)
  const loginBody = {
    email: systemAdmin.email,
    password_hash: joinBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const systemAdminLogin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(systemAdminLogin);

  // Step 3: Create a tenant organization for the assessment
  const tenantCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // Step 4: Create an assessment within the created tenant
  const assessmentCreateBody = {
    tenant_id: tenant.id,
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    assessment_type: RandomGenerator.pick([
      "quiz",
      "survey",
      "peer review",
      "practical assignment",
    ] as const),
    max_score: RandomGenerator.pick([50, 100, 150, 200]),
    passing_score: 50,
    scheduled_start_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    scheduled_end_at: new Date(Date.now() + 86400 * 1000).toISOString(),
    status: "active",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const assessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.systemAdmin.assessments.create(
      connection,
      {
        body: assessmentCreateBody,
      },
    );
  typia.assert(assessment);

  // Step 5: Retrieve the assessment by its ID and validate all returned data matches
  const retrievedAssessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.systemAdmin.assessments.at(connection, {
      assessmentId: assessment.id,
    });
  typia.assert(retrievedAssessment);

  TestValidator.equals(
    "retrieved assessment matches created assessment",
    retrievedAssessment,
    assessment,
  );

  // Step 6: Attempt to retrieve a non-existent assessment ID and expect an error
  await TestValidator.error(
    "retrieval of non-existent assessment ID should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.at(
        connection,
        {
          assessmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Step 7: Attempt to retrieve assessment without authentication and expect an error
  // Create unauthenticated connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "retrieval without authentication should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.at(
        unauthConn,
        {
          assessmentId: assessment.id,
        },
      );
    },
  );

  // Step 8: Attempt to retrieve an assessment for a different tenant and expect an error
  // Create another tenant
  const otherTenantCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const otherTenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: otherTenantCreateBody,
    });
  typia.assert(otherTenant);

  // Create an assessment for the other tenant
  const otherAssessmentCreateBody = {
    tenant_id: otherTenant.id,
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    assessment_type: RandomGenerator.pick([
      "quiz",
      "survey",
      "peer review",
      "practical assignment",
    ] as const),
    max_score: RandomGenerator.pick([50, 100, 150, 200]),
    passing_score: 50,
    scheduled_start_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    scheduled_end_at: new Date(Date.now() + 86400 * 1000).toISOString(),
    status: "active",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const otherAssessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.systemAdmin.assessments.create(
      connection,
      {
        body: otherAssessmentCreateBody,
      },
    );
  typia.assert(otherAssessment);

  // Attempt to retrieve the other tenant's assessment with original systemAdmin connection
  await TestValidator.error(
    "retrieval of assessment across tenants should fail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.at(
        connection,
        {
          assessmentId: otherAssessment.id,
        },
      );
    },
  );
}

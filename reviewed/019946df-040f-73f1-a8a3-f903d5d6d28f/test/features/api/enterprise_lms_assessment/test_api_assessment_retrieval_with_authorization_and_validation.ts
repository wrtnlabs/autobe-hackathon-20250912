import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * E2E test validating assessment retrieval with fully authorized workflow.
 *
 * 1. OrganizationAdmin user registration with tenant association.
 * 2. OrganizationAdmin user login to receive JWT tokens.
 * 3. Create a new assessment associated with the tenant.
 * 4. Retrieve the assessment details by its generated ID.
 * 5. Validate unauthorized access raises error.
 * 6. Validate retrieval with invalid ID raises error.
 */
export async function test_api_assessment_retrieval_with_authorization_and_validation(
  connection: api.IConnection,
) {
  // 1. organizationAdmin user registration
  const organizationAdminCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongPassword123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const organizationAdminAuthorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: organizationAdminCreateBody,
    });
  typia.assert(organizationAdminAuthorized);

  // 2. organizationAdmin user login
  const organizationAdminLoginBody = {
    email: organizationAdminCreateBody.email,
    password: organizationAdminCreateBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const organizationAdminLoginAuthorized: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: organizationAdminLoginBody,
    });
  typia.assert(organizationAdminLoginAuthorized);

  TestValidator.equals(
    "tenant id matches between join and login",
    organizationAdminAuthorized.tenant_id,
    organizationAdminLoginAuthorized.tenant_id,
  );

  // 3. create a new assessment
  const assessmentCreateBody = {
    tenant_id: organizationAdminAuthorized.tenant_id,
    code: `ASMT-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: "This is a test assessment created during E2E testing.",
    assessment_type: RandomGenerator.pick([
      "quiz",
      "survey",
      "peer_review",
    ] as const),
    max_score: 100,
    passing_score: 70,
    scheduled_start_at: null,
    scheduled_end_at: null,
    status: "planned",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const assessmentCreated: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      connection,
      {
        body: assessmentCreateBody,
      },
    );
  typia.assert(assessmentCreated);

  TestValidator.equals(
    "tenant association matches in created assessment",
    assessmentCreated.tenant_id,
    organizationAdminAuthorized.tenant_id,
  );

  TestValidator.equals(
    "assessment status is planned",
    assessmentCreated.status,
    "planned",
  );

  // 4. retrieve the assessment details
  const assessmentRetrieved: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.organizationAdmin.assessments.at(
      connection,
      {
        assessmentId: assessmentCreated.id,
      },
    );
  typia.assert(assessmentRetrieved);

  TestValidator.equals(
    "retrieved assessment id matches created id",
    assessmentRetrieved.id,
    assessmentCreated.id,
  );

  TestValidator.equals(
    "retrieved assessment title matches created",
    assessmentRetrieved.title,
    assessmentCreated.title,
  );

  TestValidator.equals(
    "retrieved assessment status matches created status",
    assessmentRetrieved.status,
    assessmentCreated.status,
  );

  TestValidator.equals(
    "retrieved assessment tenant id matches created tenant id",
    assessmentRetrieved.tenant_id,
    assessmentCreated.tenant_id,
  );

  // 5. unauthorized access test
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized retrieval should fail", async () => {
    await api.functional.enterpriseLms.organizationAdmin.assessments.at(
      unauthConn,
      {
        assessmentId: assessmentCreated.id,
      },
    );
  });

  // 6. invalid assessmentId retrieval test
  await TestValidator.error(
    "retrieval with invalid assessment ID should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.assessments.at(
        connection,
        {
          assessmentId: "00000000-0000-0000-0000-000000000000", // well-formed UUID but presumably nonexistent
        },
      );
    },
  );
}

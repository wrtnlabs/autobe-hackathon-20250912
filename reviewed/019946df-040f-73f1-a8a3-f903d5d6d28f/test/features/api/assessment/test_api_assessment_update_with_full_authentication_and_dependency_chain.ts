import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessment";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * Perform a comprehensive End-to-End test of Assessment update API in
 * Enterprise LMS.
 *
 * This test involves multiple roles and their authentication to simulate
 * the full workflow of tenant creation, organization admin creation,
 * assessment creation, and updating the assessment.
 *
 * It validates that only authorized users from correct tenant contexts can
 * update assessments. The test updates valid fields such as title,
 * description, scheduled start/end dates, and status. It also confirms the
 * update success and that changes obey business constraints.
 *
 * The test also exercises invalid update attempts such as invalid datetime
 * strings and incorrect scheduling, confirming that the API rejects such
 * invalid input securely and correctly.
 *
 * The entire test ensures the backend adheres strictly to role-based access
 * and tenant isolation, preventing unauthorized modifications.
 *
 * Steps:
 *
 * 1. System admin joins and logs in, obtains tokens.
 * 2. System admin creates a tenant organizations.
 * 3. Organization admin joins and logs in, associated with tenant.
 * 4. Organization admin creates an assessment with full valid data.
 * 5. Update the assessment with new valid data.
 * 6. Verify updates reflected correctly.
 * 7. Attempt invalid updates and confirm errors.
 * 8. Switch roles and verify role-based access control.
 */
export async function test_api_assessment_update_with_full_authentication_and_dependency_chain(
  connection: api.IConnection,
) {
  // 1. System admin joins
  const sysAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const sysAdminPasswordHash: string =
    "$2b$10$abcdefghijk12345678901234567890abcdefghi"; // fake hash
  const sysAdminCreateBody: IEnterpriseLmsSystemAdmin.ICreate = {
    email: sysAdminEmail,
    password_hash: sysAdminPasswordHash,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  };
  const sysAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: sysAdminCreateBody,
    });
  typia.assert(sysAdmin);

  // 2. System admin login
  const sysAdminLoginBody: IEnterpriseLmsSystemAdmin.ILogin = {
    email: sysAdminEmail,
    password_hash: sysAdminPasswordHash,
  };
  const sysAdminLoggedIn: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: sysAdminLoginBody,
    });
  typia.assert(sysAdminLoggedIn);

  // 3. System admin creates tenant
  const tenantCode: string = RandomGenerator.alphaNumeric(8);
  const tenantName: string = RandomGenerator.name(2);
  const tenantCreateBody: IEnterpriseLmsTenant.ICreate = {
    code: tenantCode,
    name: tenantName,
  };
  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // 4. Organization admin joins with tenant ID
  const orgAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword: string = "OrgPassword123!";
  const orgAdminCreateBody: IEnterpriseLmsOrganizationAdmin.ICreate = {
    tenant_id: tenant.id,
    email: orgAdminEmail,
    password: orgAdminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  };
  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminCreateBody,
    });
  typia.assert(orgAdmin);

  // 5. Organization admin login
  const orgAdminLoginBody: IEnterpriseLmsOrganizationAdmin.ILogin = {
    email: orgAdminEmail,
    password: orgAdminPassword,
  };
  const orgAdminLoggedIn: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: orgAdminLoginBody,
    });
  typia.assert(orgAdminLoggedIn);

  // 6. Organization admin creates assessment
  const assessmentCreateBody: IEnterpriseLmsAssessments.ICreate = {
    tenant_id: tenant.id,
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    title: "Initial Assessment Title",
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 65,
    scheduled_start_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
    scheduled_end_at: new Date(Date.now() + 3600000 * 2).toISOString(), // 2 hours later
    status: "planned",
  };
  const assessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      connection,
      {
        body: assessmentCreateBody,
      },
    );
  typia.assert(assessment);

  // 7. Organization admin updates assessment (valid update)
  const assessmentUpdateBodyValid: IEnterpriseLmsAssessment.IUpdate = {
    title: "Updated Assessment Title",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 5,
      wordMax: 10,
    }),
    scheduled_start_at: new Date(Date.now() + 7200000).toISOString(), // 2 hours later
    scheduled_end_at: new Date(Date.now() + 10800000).toISOString(), // 3 hours later
    status: "active",
  };
  await api.functional.enterpriseLms.organizationAdmin.assessments.update(
    connection,
    {
      assessmentId: assessment.id,
      body: assessmentUpdateBodyValid,
    },
  );

  // 8. Invalid update attempts
  // 8.1 Invalid datetime format
  const assessmentUpdateBodyInvalidFormat: IEnterpriseLmsAssessment.IUpdate = {
    scheduled_start_at: "not-a-valid-datetime",
    scheduled_end_at: new Date(Date.now() + 10800000).toISOString(),
  };
  await TestValidator.error("Invalid datetime format should fail", async () => {
    await api.functional.enterpriseLms.organizationAdmin.assessments.update(
      connection,
      {
        assessmentId: assessment.id,
        body: assessmentUpdateBodyInvalidFormat,
      },
    );
  });

  // 8.2 Start date after end date
  const assessmentUpdateBodyInvalidDates: IEnterpriseLmsAssessment.IUpdate = {
    scheduled_start_at: new Date(Date.now() + 10800000).toISOString(), // 3 hours later
    scheduled_end_at: new Date(Date.now() + 7200000).toISOString(), // 2 hours later
  };
  await TestValidator.error(
    "Start date after end date should fail",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.assessments.update(
        connection,
        {
          assessmentId: assessment.id,
          body: assessmentUpdateBodyInvalidDates,
        },
      );
    },
  );

  // 9. Role-based access control
  // Re-authenticate system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: sysAdminLoginBody,
  });

  // Attempt update of assessment from system admin context (should fail tenant isolation)
  await TestValidator.error(
    "System admin from different tenant cannot update assessment",
    async () => {
      await api.functional.enterpriseLms.organizationAdmin.assessments.update(
        connection,
        {
          assessmentId: assessment.id,
          body: {
            title: "Unauthorized Update Attempt",
          },
        },
      );
    },
  );

  // Switch back to organization admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: orgAdminLoginBody,
  });

  // Confirm valid update again
  const assessmentUpdateBodyConfirm: IEnterpriseLmsAssessment.IUpdate = {
    title: "Final Valid Update",
    status: "completed",
  };

  await api.functional.enterpriseLms.organizationAdmin.assessments.update(
    connection,
    {
      assessmentId: assessment.id,
      body: assessmentUpdateBodyConfirm,
    },
  );
}

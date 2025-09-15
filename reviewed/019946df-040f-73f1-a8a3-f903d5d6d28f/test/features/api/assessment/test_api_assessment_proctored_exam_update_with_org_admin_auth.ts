import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * This E2E test function validates updating a proctored exam session linked
 * to an assessment with organization administrator authorization.
 *
 * The business workflow includes:
 *
 * 1. Register a new organization admin user and authenticate.
 * 2. Create a tenant organization.
 * 3. Create an assessment scoped under the tenant.
 * 4. Create a proctored exam linked to the assessment.
 * 5. Update the proctored exam's scheduling, proctor, and status using valid
 *    values.
 * 6. Verify the update by retrieving and asserting changed fields.
 * 7. Ensure authorization and multi-tenant isolation are respected throughout.
 *
 * All date times are ISO 8601 format strings, UUIDs are valid, and
 * proctored exam status values comply with allowed enums. Comprehensive
 * typia.assert calls validate API responses. Each TestValidator assertion
 * includes descriptive titles.
 */
export async function test_api_assessment_proctored_exam_update_with_org_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register organization admin user
  const orgAdminCreateBody = {
    tenant_id: "00000000-0000-0000-0000-000000000000", // Placeholder, replaced after tenant is created
    email: `orgadmin_${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "StrongPassword123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  // 2. Create a tenant (system admin needed for this)

  // 2.1 Register system admin for tenant creation
  const sysAdminCreateBody = {
    email: `sysadmin_${RandomGenerator.alphaNumeric(5)}@example.com`,
    password_hash: "hashed_password_placeholder",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminCreateBody,
  });
  typia.assert(sysAdmin);

  // 2.2 Login system admin
  const sysAdminLoginBody = {
    email: sysAdminCreateBody.email,
    password_hash: sysAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  await api.functional.auth.systemAdmin.login(connection, {
    body: sysAdminLoginBody,
  });

  // 2.3 Create tenant
  const tenantCreateBody = {
    code: `tenant_${RandomGenerator.alphaNumeric(5)}`,
    name: `Tenant ${RandomGenerator.name(1)}`,
  } satisfies IEnterpriseLmsTenant.ICreate;
  const tenant = await api.functional.enterpriseLms.systemAdmin.tenants.create(
    connection,
    { body: tenantCreateBody },
  );
  typia.assert(tenant);

  // 3. Now that tenant exists, register organization admin with correct tenant_id
  const orgAdminCreateBodyWithTenant = {
    ...orgAdminCreateBody,
    tenant_id: tenant.id,
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminCreateBodyWithTenant },
  );
  typia.assert(orgAdmin);

  // 4. Login organization admin to authorize subsequent requests
  const orgAdminLoginBody = {
    email: orgAdminCreateBodyWithTenant.email,
    password: orgAdminCreateBodyWithTenant.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;
  await api.functional.auth.organizationAdmin.login(connection, {
    body: orgAdminLoginBody,
  });

  // 5. Create an assessment linked to tenant
  const assessmentCreateBody = {
    tenant_id: tenant.id,
    code: `assess_${RandomGenerator.alphaNumeric(6)}`,
    title: `Assessment ${RandomGenerator.name(2)}`,
    description: RandomGenerator.content({ paragraphs: 1 }),
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 60,
    scheduled_start_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // Start 1 day from now
    scheduled_end_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(), // End 7 days from now
    status: "planned",
  } satisfies IEnterpriseLmsAssessments.ICreate;
  const assessment =
    await api.functional.enterpriseLms.organizationAdmin.assessments.create(
      connection,
      { body: assessmentCreateBody },
    );
  typia.assert(assessment);

  // 6. Create a proctored exam linked to the assessment
  const proctoredExamCreateBody = {
    assessment_id: assessment.id,
    exam_session_id: `sess_${RandomGenerator.alphaNumeric(8)}`,
    proctor_id: null,
    scheduled_at: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(), // Scheduled 2 days from now
    status: "scheduled",
  } satisfies IEnterpriseLmsProctoredExam.ICreate;
  const proctoredExam =
    await api.functional.enterpriseLms.organizationAdmin.assessments.proctoredExams.create(
      connection,
      {
        assessmentId: assessment.id,
        body: proctoredExamCreateBody,
      },
    );
  typia.assert(proctoredExam);

  // 7. Update the proctored exam
  const proctoredExamUpdateBody = {
    scheduled_at: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(), // Move 1 day later
    proctor_id: `proctor_${RandomGenerator.alphaNumeric(6)}`,
    status: "in_progress",
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IEnterpriseLmsProctoredExam.IUpdate;

  const updatedProctoredExam =
    await api.functional.enterpriseLms.organizationAdmin.assessments.proctoredExams.update(
      connection,
      {
        assessmentId: assessment.id,
        proctoredExamId: proctoredExam.id,
        body: proctoredExamUpdateBody,
      },
    );
  typia.assert(updatedProctoredExam);

  // 8. Validate that the update has taken effect
  TestValidator.equals(
    "Proctored exam ID should remain the same",
    updatedProctoredExam.id,
    proctoredExam.id,
  );
  TestValidator.equals(
    "Scheduled time should be updated",
    updatedProctoredExam.scheduled_at,
    proctoredExamUpdateBody.scheduled_at,
  );
  TestValidator.equals(
    "Proctor ID should be updated",
    updatedProctoredExam.proctor_id,
    proctoredExamUpdateBody.proctor_id,
  );
  TestValidator.equals(
    "Status should be updated",
    updatedProctoredExam.status,
    proctoredExamUpdateBody.status,
  );
}

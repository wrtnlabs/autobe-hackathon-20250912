import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformInsuranceClaim } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsuranceClaim";
import type { IHealthcarePlatformInsurancePolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformInsurancePolicy";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformInsuranceClaim } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformInsuranceClaim";

/**
 * This test verifies that organization administrators cannot access insurance
 * claims that belong to other organizations. To validate tenant isolation and
 * cross-organization access control, the test proceeds as follows: 1) Two
 * organization admin accounts are created (each for a separate organization)
 * via the onboarding flow. 2) For each organization, an insurance policy is
 * created. 3) Each organization then creates at least one insurance claim
 * associated with its own policy. 4) The test logs in as one org admin (adminA)
 * and searches for claims using policy/invoice IDs belonging to the other org
 * (adminB's org). The search must return no results and not return or leak
 * claims from any other org. 5) As a sanity check, a normal search for claims
 * using valid in-scope IDs for adminA should succeed and return results.
 * Validation steps: - Ensure cross-org claim search returns empty result set
 * and does not include any claims from other org. - Ensure in-org search
 * returns expected claims. - All steps use strictly valid data and proper
 * authentication flows. - Every response is validated for structure and
 * pagination. Edge cases: - Search by policy ID and by invoice ID, for both
 * in-org and out-of-org IDs. - Attempt partial and exact match queries to
 * verify filter behavior and ACL enforcement. - No type errors or invalid DTO
 * usage are tested; only business logic/authorization. All orgs, policies, and
 * claims are created within the test for full data isolation.
 */
export async function test_api_search_insurance_claims_access_control_and_cross_org_restriction(
  connection: api.IConnection,
) {
  // 1. Create two org admins (orgA and orgB)
  const orgA_email = typia.random<string & tags.Format<"email">>();
  const orgB_email = typia.random<string & tags.Format<"email">>();
  const orgA_admin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgA_email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "testpassA",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgA_admin);
  const orgA_id = orgA_admin.id;

  const orgB_admin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgB_email,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "testpassB",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgB_admin);
  const orgB_id = orgB_admin.id;

  // 2. Create insurance policy for each org
  // Generate unique patients for each
  const patientA_id = typia.random<string & tags.Format<"uuid">>();
  const patientB_id = typia.random<string & tags.Format<"uuid">>();

  // Switch to orgA admin (already authenticated)
  const policyA =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: {
          patient_id: patientA_id,
          organization_id: orgA_id,
          policy_number: "PA-" + RandomGenerator.alphaNumeric(8),
          payer_name: RandomGenerator.name(1),
          coverage_start_date: new Date().toISOString().substring(0, 10),
          coverage_end_date: null,
          plan_type: "commercial",
          policy_status: "active",
        } satisfies IHealthcarePlatformInsurancePolicy.ICreate,
      },
    );
  typia.assert(policyA);

  // Switch to orgB admin
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgB_email,
      full_name: orgB_admin.full_name,
      password: "testpassB",
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  const policyB =
    await api.functional.healthcarePlatform.organizationAdmin.insurancePolicies.create(
      connection,
      {
        body: {
          patient_id: patientB_id,
          organization_id: orgB_id,
          policy_number: "PB-" + RandomGenerator.alphaNumeric(8),
          payer_name: RandomGenerator.name(1),
          coverage_start_date: new Date().toISOString().substring(0, 10),
          coverage_end_date: null,
          plan_type: "commercial",
          policy_status: "active",
        } satisfies IHealthcarePlatformInsurancePolicy.ICreate,
      },
    );
  typia.assert(policyB);

  // 3. Create insurance claims for each policy
  // First claim for orgB
  const invoiceB_id = typia.random<string & tags.Format<"uuid">>();
  const claimB =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
      connection,
      {
        body: {
          insurance_policy_id: policyB.id,
          invoice_id: invoiceB_id,
          claim_number: "CLB-" + RandomGenerator.alphaNumeric(8),
          service_start_date: new Date().toISOString(),
          service_end_date: null,
          total_claimed_amount: 1024,
          submission_status: "submitted",
        } satisfies IHealthcarePlatformInsuranceClaim.ICreate,
      },
    );
  typia.assert(claimB);

  // Switch back to orgA admin
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: orgA_email,
      full_name: orgA_admin.full_name,
      password: "testpassA",
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });

  // Create orgA claim
  const invoiceA_id = typia.random<string & tags.Format<"uuid">>();
  const claimA =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.create(
      connection,
      {
        body: {
          insurance_policy_id: policyA.id,
          invoice_id: invoiceA_id,
          claim_number: "CLA-" + RandomGenerator.alphaNumeric(8),
          service_start_date: new Date().toISOString(),
          service_end_date: null,
          total_claimed_amount: 2048,
          submission_status: "submitted",
        } satisfies IHealthcarePlatformInsuranceClaim.ICreate,
      },
    );
  typia.assert(claimA);

  // 4. As orgA admin, attempt to search for claims by orgB's policy_id / invoice_id
  // Should NOT find anything
  const page_out_of_org_by_policy =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.index(
      connection,
      {
        body: {
          insurance_policy_id: policyB.id,
        } satisfies IHealthcarePlatformInsuranceClaim.IRequest,
      },
    );
  typia.assert(page_out_of_org_by_policy);
  TestValidator.equals(
    "search by out-of-org policy yields no results",
    page_out_of_org_by_policy.data.length,
    0,
  );

  const page_out_of_org_by_invoice =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.index(
      connection,
      {
        body: {
          invoice_id: invoiceB_id,
        } satisfies IHealthcarePlatformInsuranceClaim.IRequest,
      },
    );
  typia.assert(page_out_of_org_by_invoice);
  TestValidator.equals(
    "search by out-of-org invoice yields no results",
    page_out_of_org_by_invoice.data.length,
    0,
  );

  // 5. As orgA admin, search for own claims by policy and invoice - these should return results
  const page_in_org_by_policy =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.index(
      connection,
      {
        body: {
          insurance_policy_id: policyA.id,
        } satisfies IHealthcarePlatformInsuranceClaim.IRequest,
      },
    );
  typia.assert(page_in_org_by_policy);
  TestValidator.predicate(
    "own-organization policy search returns the claim",
    page_in_org_by_policy.data.some((c) => c.id === claimA.id),
  );

  const page_in_org_by_invoice =
    await api.functional.healthcarePlatform.organizationAdmin.insuranceClaims.index(
      connection,
      {
        body: {
          invoice_id: invoiceA_id,
        } satisfies IHealthcarePlatformInsuranceClaim.IRequest,
      },
    );
  typia.assert(page_in_org_by_invoice);
  TestValidator.predicate(
    "own-organization invoice search returns the claim",
    page_in_org_by_invoice.data.some((c) => c.id === claimA.id),
  );
}

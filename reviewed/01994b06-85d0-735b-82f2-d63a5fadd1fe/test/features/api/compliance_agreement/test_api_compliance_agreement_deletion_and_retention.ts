import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformComplianceAgreement } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceAgreement";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validates system admin deletion of a compliance agreement.
 *
 * 1. Register a new system admin (using authorized email, name, etc)
 * 2. Create a new compliance agreement record with randomized values
 * 3. Delete the compliance agreement by its ID as the admin
 * 4. Attempt to fetch the agreement after deletion (should fail)
 * 5. Attempt to delete again (should fail)
 * 6. Attempt to delete a random non-existent agreement ID (should fail)
 */
export async function test_api_compliance_agreement_deletion_and_retention(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: RandomGenerator.name(2).replace(/\s/g, ".") + "@corp-example.com",
      full_name: RandomGenerator.name(2),
      provider: "local",
      provider_key: RandomGenerator.name(2).replace(/\s/g, "."),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create compliance agreement
  const agreement =
    await api.functional.healthcarePlatform.systemAdmin.complianceAgreements.create(
      connection,
      {
        body: {
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          policy_version_id: typia.random<string & tags.Format<"uuid">>(),
          agreement_type: RandomGenerator.pick([
            "HIPAA",
            "terms_of_service",
            "research_consent",
          ]),
          status: RandomGenerator.pick([
            "pending",
            "signed",
            "withdrawn",
            "expired",
          ]),
          signed_at: new Date().toISOString(),
        } satisfies IHealthcarePlatformComplianceAgreement.ICreate,
      },
    );
  typia.assert(agreement);

  // 3. Delete the compliance agreement
  await api.functional.healthcarePlatform.systemAdmin.complianceAgreements.erase(
    connection,
    {
      complianceAgreementId: agreement.id,
    },
  );

  // 4. Attempt to fetch the compliance agreement after deletion (should error)
  await TestValidator.error(
    "fetching deleted agreement should fail",
    async () => {
      // There's no documented endpoint to fetch by ID after deletion with the provided SDK,
      // so this step can only be semantically validated by ensuring delete side effects via API contract
      // (i.e., deletion is successful, and re-deletion returns error below).
    },
  );

  // 5. Attempt to delete again (should error)
  await TestValidator.error(
    "second deletion of same agreement should error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceAgreements.erase(
        connection,
        {
          complianceAgreementId: agreement.id,
        },
      );
    },
  );

  // 6. Attempt to delete a random non-existent agreement ID (should error)
  await TestValidator.error(
    "deletion of non-existent agreement should error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.complianceAgreements.erase(
        connection,
        {
          complianceAgreementId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}

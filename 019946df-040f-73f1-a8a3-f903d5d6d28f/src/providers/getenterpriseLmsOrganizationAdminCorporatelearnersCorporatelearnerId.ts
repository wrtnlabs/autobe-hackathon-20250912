import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get detailed information of a corporate learner by ID
 *
 * Retrieves detailed information for a single corporate learner identified by
 * the unique ID. Ensures the requesting organization admin is authorized by
 * tenant ownership. Throws if the corporate learner does not exist or access is
 * unauthorized.
 *
 * @param props - Parameters including authenticated organizationAdmin and
 *   corporatelearner ID
 * @returns The detailed corporate learner user data
 * @throws {Error} If corporate learner not found or unauthorized
 */
export async function getenterpriseLmsOrganizationAdminCorporatelearnersCorporatelearnerId(props: {
  organizationAdmin: OrganizationadminPayload & {
    tenant_id: string & tags.Format<"uuid">;
  };
  corporatelearnerId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsCorporateLearner> {
  const { organizationAdmin, corporatelearnerId } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_corporatelearner.findUniqueOrThrow({
      where: {
        id: corporatelearnerId,
        tenant_id: organizationAdmin.tenant_id,
      },
    });

  return {
    id: record.id,
    tenant_id: record.tenant_id,
    email: record.email,
    password_hash: record.password_hash,
    first_name: record.first_name,
    last_name: record.last_name,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
